import { useEffect, useState } from "react";
import { JAVA_RESULTS_URL } from "../site";

export interface PlatformReport {
  id: string;
  label: string;
  runner: string;
  passed: number;
  failed: number;
  elapsedSeconds: number | null;
  ran: string[];
  failures: Record<string, string>;
}

export interface EngineReport {
  schema: number;
  engine: string;
  generatedAt: string;
  version: string | null;
  commit: string;
  commitShort: string;
  commitUrl: string | null;
  runUrl: string | null;
  platforms: PlatformReport[];
}

export type ReportState =
  | { status: "loading" }
  | { status: "ready"; report: EngineReport }
  | { status: "unavailable"; reason: string };

export type Verdict =
  | { status: "pass" }
  | { status: "fail"; detail: string }
  | { status: "unknown" };

/** A lookup from test id to verdict, so the grid does not scan arrays. */
export function verdicts(platform: PlatformReport): Record<string, Verdict> {
  const map: Record<string, Verdict> = {};
  for (const id of platform.ran) map[id] = { status: "pass" };
  for (const [id, detail] of Object.entries(platform.failures)) {
    map[id] = { status: "fail", detail };
  }
  return map;
}

function looksValid(value: unknown): value is EngineReport {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<EngineReport>;
  return r.schema === 1 && Array.isArray(r.platforms);
}

export function useJavaReport(): ReportState {
  const [state, setState] = useState<ReportState>({ status: "loading" });

  useEffect(() => {
    const abort = new AbortController();

    fetch(JAVA_RESULTS_URL, { signal: abort.signal })
      .then(async (response) => {
        if (response.status === 404) {
          throw new Error("no results have been published yet");
        }
        if (!response.ok) {
          throw new Error(`the server answered ${response.status}`);
        }
        const body: unknown = await response.json();
        if (!looksValid(body)) {
          throw new Error("the published results are in an unexpected shape");
        }
        setState({ status: "ready", report: body });
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        setState({
          status: "unavailable",
          reason: error instanceof Error ? error.message : String(error),
        });
      });

    return () => abort.abort();
  }, []);

  return state;
}

export const BROWSER_TAB = "browser";

// Shown as disabled tabs until CI has published a report, so a visitor can see
// the Java engine exists even before the first run lands.
const EXPECTED_PLATFORMS = [
  { id: "windows", label: "Java on Windows" },
  { id: "linux", label: "Java on Linux" },
];

export interface EngineTab {
  id: string;
  label: string;
  live: boolean;
  passed: number;
  failed: number;
  ready: boolean;
}

export function buildTabs(
  java: ReportState,
  live: { passed: number; failed: number },
): EngineTab[] {
  const browser: EngineTab = {
    id: BROWSER_TAB,
    label: "TypeScript",
    live: true,
    passed: live.passed,
    failed: live.failed,
    ready: true,
  };

  if (java.status === "ready") {
    return [
      browser,
      ...java.report.platforms.map((p) => ({
        id: p.id,
        label: p.label,
        live: false,
        passed: p.passed,
        failed: p.failed,
        ready: true,
      })),
    ];
  }

  return [
    browser,
    ...EXPECTED_PLATFORMS.map((p) => ({
      ...p,
      live: false,
      passed: 0,
      failed: 0,
      ready: false,
    })),
  ];
}

export function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "at an unknown time";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 90) return "just now";

  const units: [number, string][] = [
    [60, "minute"],
    [60, "hour"],
    [24, "day"],
    [30, "month"],
  ];
  let value = seconds;
  let name = "second";
  for (const [size, next] of units) {
    if (value < size) break;
    value = Math.round(value / size);
    name = next;
  }
  return `${value} ${name}${value === 1 ? "" : "s"} ago`;
}
