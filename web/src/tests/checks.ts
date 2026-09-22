import type { TestCase } from "./suite";
import type { ExecResult } from "../vox/testProtocol";

export interface Check {
  name: string;
  expected: string;
  actual: string;
  ok: boolean;
}

function norm(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

function stripLabel(text: string, label: string): string {
  return text
    .split("\n")
    .map((line) => {
      const withoutPath = line.startsWith(`${label}:`)
        ? line.slice(label.length + 1).replace(/^ +/, "")
        : line;
      return withoutPath.replace(/^(> )*/, "");
    })
    .join("\n");
}

function formatIr(ir: string[] | null): string {
  if (ir === null) return "";
  return ir.map((line, i) => `${String(i).padStart(4)}  ${line}`).join("\n");
}

function describeExit(code: number): string {
  switch (code) {
    case 0:
      return "ran to completion (exit 0)";
    case 1:
      return "rejected before running (exit 1)";
    case 2:
      return "stopped by a runtime error (exit 2)";
    default:
      return `exit ${code}`;
  }
}

export function checksFor(test: TestCase, result: ExecResult): Check[] {
  const checks: Check[] = [];
  const want = test.expect;

  if (want.exitCode !== undefined) {
    checks.push({
      name: "Result",
      expected: describeExit(want.exitCode),
      actual: describeExit(result.exitCode),
      ok: result.exitCode === want.exitCode,
    });
  }

  if (want.stdout !== undefined) {
    const actual = norm(result.stdout);
    checks.push({
      name: "Printed output",
      expected: want.stdout,
      actual,
      ok: actual === want.stdout,
    });
  }

  if (want.diagnostics !== undefined) {
    const actual = stripLabel(norm(result.diagnostics), test.path);
    checks.push({
      name: "Compiler messages",
      expected: want.diagnostics,
      actual,
      ok: actual === want.diagnostics,
    });
  }

  if (want.ir !== undefined) {
    const actual = formatIr(result.ir);
    checks.push({
      name: "Generated IR",
      expected: want.ir,
      actual,
      ok: actual === want.ir,
    });
  }

  if (want.contains !== undefined && want.contains.length > 0) {
    // A fail test names the text its message must carry, wherever it appears.
    const combined = [norm(result.stdout), norm(result.diagnostics)]
      .filter((part) => part !== "")
      .join("\n");
    checks.push({
      name: "Message must mention",
      expected: want.contains.join("\n"),
      actual: combined,
      ok: want.contains.every((needle) => combined.includes(needle)),
    });
  }

  return checks;
}
