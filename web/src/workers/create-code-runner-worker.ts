export function createCodeRunnerWorker(): Worker {
  return new Worker(new URL("./code-runner.worker.ts", import.meta.url), {
    type: "module",
  });
}
