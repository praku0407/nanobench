// src/benchmark/gpu.ts

export async function runGPUStressTest(onProgress: (p: number) => void): Promise<number> {
  // 1. Check if the browser allows direct GPU access
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported on this browser. Try Chrome or Edge.');
  }

  // 2. Request high-performance access to the graphics card
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Failed to acquire GPU adapter.');
  
  const device = await adapter.requestDevice();

  // 3. Fetch the shader we just wrote in the public folder
  const response = await fetch('/shaders/stress.wgsl');
  const shaderCode = await response.text();
  const shaderModule = device.createShaderModule({ code: shaderCode });

  // 4. Allocate VRAM (Test size: 5 Million floats = ~20MB of GPU Memory)
  const DATA_SIZE = 5_000_000; 
  const bufferSize = DATA_SIZE * Float32Array.BYTES_PER_ELEMENT;

  const storageBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: storageBuffer } }],
  });

  // 5. Execution & Measurement
  const ITERATIONS = 15;
  let totalComputeTime = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    // Dispatch threads across the GPU cores
    passEncoder.dispatchWorkgroups(Math.ceil(DATA_SIZE / 64));
    passEncoder.end();

    const startTime = performance.now();
    device.queue.submit([commandEncoder.finish()]);
    
    // Wait for the graphics card to physically finish the math
    await device.queue.onSubmittedWorkDone();
    const endTime = performance.now();
    
    totalComputeTime += (endTime - startTime);
    
    // Update the UI
    onProgress(Math.round(((i + 1) / ITERATIONS) * 100));
  }

  // 6. Cleanup VRAM
  storageBuffer.destroy();
  device.destroy();

  // 7. Calculate Final Score 
  const score = Math.floor((10000 / totalComputeTime) * 1000);
  return score;
}