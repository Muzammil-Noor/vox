
export interface ExecResult {
  exitCode: number;
  stdout: string;
  diagnostics: string;
  ir: string[] | null;
  elapsedMs: number;
}

export type ToTestWorker = {
  type: "run";
  id: string;
  source: string;
  label: string;
  stdin?: string;
  stepLimit: number;
};

export type FromTestWorker =
  | { type: "result"; id: string; result: ExecResult }
  | { type: "crashed"; id: string; message: string };
