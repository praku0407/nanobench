self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'START_CPU_TEST') {
    const MATRIX_SIZE = 400;
    const ITERATIONS = 25;

    const len = MATRIX_SIZE * MATRIX_SIZE;
    const A = new Float32Array(len);
    const B = new Float32Array(len);
    const C = new Float32Array(len);

    for (let i = 0; i < len; i++) {
      const r = (i * 1103515245 + 12345) & 0x7fffffff;
      A[i] = (r & 0xffff) / 65536;
      B[i] = ((r >> 16) & 0xffff) / 65536;
    }

    function multiply() {
      for (let i = 0; i < MATRIX_SIZE; i++) {
        for (let j = 0; j < MATRIX_SIZE; j++) {
          let sum = 0;
          for (let k = 0; k < MATRIX_SIZE; k++) {
            sum += A[i * MATRIX_SIZE + k] * B[k * MATRIX_SIZE + j];
          }
          C[i * MATRIX_SIZE + j] = sum;
        }
      }
    }

    multiply();

    let totalOperations = 0;
    const startTime = performance.now();

    const opsPerIter = MATRIX_SIZE * MATRIX_SIZE * MATRIX_SIZE * 2;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      multiply();
      totalOperations += opsPerIter;

      const progress = Math.round(((iter + 1) / ITERATIONS) * 100);
      self.postMessage({ type: 'PROGRESS', payload: progress });
    }

    const endTime = performance.now();
    const timeInSeconds = (endTime - startTime) / 1000;
    const gigaFlops = (totalOperations / timeInSeconds) / 1e9;

    self.postMessage({
      type: 'COMPLETE',
      payload: { score: Math.round(gigaFlops * 1000) },
    });
  }
};