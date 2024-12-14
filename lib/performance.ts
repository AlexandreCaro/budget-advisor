export const measurePerformance = (label: string, callback: () => void) => {
  const start = performance.now();
  callback();
  const end = performance.now();
  console.log(`${label} took ${(end - start).toFixed(2)}ms`);
}; 