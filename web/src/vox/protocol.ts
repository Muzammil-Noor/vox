/** Messages between the playground and the worker that runs Vox programs. */

export type ToWorker =
  | { type: 'run'; source: string }
  | { type: 'input'; line: string };

export type FromWorker =
  | {
      type: 'compiled';
      ir: string[];
      warnings: string[];
      // The earlier stages, so the panel can show the whole pipeline.
      tokens: string[];
      tree: string[];
      symbols: string[];
    }
  | { type: 'compile-error'; errors: string[]; warnings: string[] }
  | { type: 'output'; chunks: string[] } // raw print output; '\n' delimits lines
  | { type: 'need-input' }
  | { type: 'done'; elapsedMs: number }
  | { type: 'runtime-error'; message: string };
