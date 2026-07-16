// src/workers/cpu.worker.ts

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'START_CPU_TEST') {
    const MATRIX_SIZE = 400; // Size of the grid we are multiplying
    const ITERATIONS = 25;   // How many times we run the heavy math
    
    let totalOperations = 0;
    const startTime = performance.now();
  
    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Create massive arrays of random numbers
      const A = new Float32Array(MATRIX_SIZE * MATRIX_SIZE).map(() => Math.random());
      const B = new Float32Array(MATRIX_SIZE * MATRIX_SIZE).map(() => Math.random());
      const C = new Float32Array(MATRIX_SIZE * MATRIX_SIZE);
  
      // Heavy O(n^3) Matrix Multiplication to burn CPU cycles
      for (let i = 0; i < MATRIX_SIZE; i++) {
        for (let j = 0; j < MATRIX_SIZE; j++) {
          let sum = 0;
          for (let k = 0; k < MATRIX_SIZE; k++) {
            sum += A[i * MATRIX_SIZE + k] * B[k * MATRIX_SIZE + j];
            totalOperations += 2;
          }
          C[i * MATRIX_SIZE + j] = sum;
        }
      }
  
      // Report real-time progress back to the UI
      const progress = Math.round(((iter + 1) / ITERATIONS) * 100);
      self.postMessage({ type: 'PROGRESS', payload: progress });
    }
  
    const endTime = performance.now();
    const timeInSeconds = (endTime - startTime) / 1000;
    const gigaFlops = (totalOperations / timeInSeconds) / 1e9;
  
    // Send the final score back
    self.postMessage({ 
      type: 'COMPLETE', 
      payload: { score: Math.round(gigaFlops * 1000) } 
    });
  }
};