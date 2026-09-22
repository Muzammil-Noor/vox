import { compile, IRExecutor, VoxRuntimeError } from "@vox/core";
import type { ExecResult } from "./testProtocol";

export interface RunRequest {
  source: string;
  label: string;
  stdin?: string;
  stepLimit: number;
}

export function runProgram(request: RunRequest): ExecResult {
  const startedAt = performance.now();
  const lines = request.stdin === undefined ? [] : request.stdin.split(/\r?\n/);
  let next = 0;
  const diagnostics: string[] = [];

  const compiled = compile(request.source);
  for (const warning of compiled.warnings) {
    diagnostics.push(`${request.label}:${warning}`);
  }

  if (compiled.errors.length > 0 || compiled.ir === null) {
    for (const error of compiled.errors) {
      diagnostics.push(`${request.label}:${error}`);
    }
    const n = compiled.errors.length;
    diagnostics.push(`${n} ${n === 1 ? "error" : "errors"}`);
    return {
      exitCode: 1,
      stdout: "",
      diagnostics: diagnostics.join("\n"),
      ir: null,
      elapsedMs: performance.now() - startedAt,
    };
  }

  const ir = compiled.ir;
  let stdout = "";
  const executor = new IRExecutor(ir, { stepLimit: request.stepLimit });
  executor.onOutput = (chunk) => {
    stdout += chunk;
  };

  try {
    for (;;) {
      const status = executor.run();
      if (status === "done") break;
      if (status === "need-input") {
        executor.provideInput(next < lines.length ? lines[next++] : "");
      }
    }
  } catch (e) {
    if (e instanceof VoxRuntimeError) {
      diagnostics.push(`${request.label}: runtime error: ${e.message}`);
      return {
        exitCode: 2,
        stdout,
        diagnostics: diagnostics.join("\n"),
        ir,
        elapsedMs: performance.now() - startedAt,
      };
    }
    throw e;
  }

  return {
    exitCode: 0,
    stdout,
    diagnostics: diagnostics.join("\n"),
    ir,
    elapsedMs: performance.now() - startedAt,
  };
}
