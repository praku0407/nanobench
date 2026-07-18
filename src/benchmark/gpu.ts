export async function runGPUStressTest(onProgress: (p: number) => void): Promise<number> {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported on this browser. Try Chrome or Edge.');
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Failed to acquire GPU adapter.');

  const device = await adapter.requestDevice();

  const response = await fetch('/shaders/stress.wgsl');
  const shaderCode = await response.text();
  const shaderModule = device.createShaderModule({ code: shaderCode });

  const DATA_SIZE = 5_000_000;
  const bufferSize = DATA_SIZE * Float32Array.BYTES_PER_ELEMENT;

  const storageBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: shaderModule, entryPoint: 'main' },
  });

  const bindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: storageBuffer } }],
  });

  const ITERATIONS = 15;
  const WORKGROUP_SIZE = 64;
  const dispatchCount = Math.ceil(DATA_SIZE / WORKGROUP_SIZE);

  function dispatchOnce() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(dispatchCount);
    pass.end();
    device.queue.submit([encoder.finish()]);
    return device.queue.onSubmittedWorkDone();
  }

  let warmupStart = performance.now();
  await dispatchOnce();
  let warmupMs = performance.now() - warmupStart;

  if (warmupMs < 1) warmupMs = 1;
  const estimatedTotalMs = warmupMs * ITERATIONS;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('GPU benchmark timed out')), 30000)
  );

  const benchmarkPromise = (async () => {
    const startTime = performance.now();

    const progressInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(Math.round((elapsed / estimatedTotalMs) * 90), 90);
      onProgress(pct);
    }, 100);

    for (let i = 0; i < ITERATIONS; i++) {
      await dispatchOnce();
    }

    clearInterval(progressInterval);

    const totalMs = performance.now() - startTime;
    storageBuffer.destroy();
    device.destroy();

    return Math.round(1_000_000 / totalMs);
  })();

  const score = await Promise.race([benchmarkPromise, timeoutPromise]);
  onProgress(100);
  return score;
}