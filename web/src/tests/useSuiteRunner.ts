import { useCallback, useEffect, useRef, useState } from "react";
import { SUITE, type TestCase } from "./suite";
import { checksFor, type Check } from "./checks";
import type {
  ExecResult,
  FromTestWorker,
  ToTestWorker,
} from "../vox/testProtocol";

export type TestStatus = "pending" | "running" | "pass" | "fail";

export interface Outcome {
  status: TestStatus;
  checks: Check[];
  result?: ExecResult;
  crash?: string;
}

const STEP_LIMIT = 200_000;

function ask(worker: Worker, test: TestCase): Promise<FromTestWorker> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<FromTestWorker>) => {
      if (event.data.id !== test.id) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve(event.data);
    };
    const onError = (event: ErrorEvent) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve({ type: "crashed", id: test.id, message: event.message });
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

    const msg: ToTestWorker = {
      type: "run",
      id: test.id,
      source: test.source,
      label: test.path,
      stdin: test.stdin,
      stepLimit: STEP_LIMIT,
    };
    worker.postMessage(msg);
  });
}

function toOutcome(test: TestCase, reply: FromTestWorker): Outcome {
  if (reply.type === "crashed") {
    return { status: "fail", checks: [], crash: reply.message };
  }
  const checks = checksFor(test, reply.result);
  return {
    status: checks.every((check) => check.ok) ? "pass" : "fail",
    checks,
    result: reply.result,
  };
}

export function useSuiteRunner() {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const runToken = useRef(0);

  const kill = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => kill(), [kill]);

  const execute = useCallback(
    async (tests: TestCase[], whole: boolean) => {
      kill();
      const token = ++runToken.current;

      const worker = new Worker(new URL("../vox/testWorker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;

      if (whole) {
        setOutcomes({});
        setElapsedMs(null);
      }
      setRunning(true);
      const startedAt = performance.now();

      for (const test of tests) {
        if (runToken.current !== token) return;
        setOutcomes((prev) => ({
          ...prev,
          [test.id]: { status: "running", checks: [] },
        }));

        const reply = await ask(worker, test);
        if (runToken.current !== token) return;

        setOutcomes((prev) => ({ ...prev, [test.id]: toOutcome(test, reply) }));
      }

      if (runToken.current !== token) return;
      if (whole) setElapsedMs(performance.now() - startedAt);
      setRunning(false);
      kill();
    },
    [kill],
  );

  const runAll = useCallback(() => {
    void execute(SUITE, true);
  }, [execute]);

  const runOne = useCallback(
    (test: TestCase) => {
      void execute([test], false);
    },
    [execute],
  );

  const stop = useCallback(() => {
    runToken.current++;
    kill();
    setRunning(false);
  }, [kill]);

  return { outcomes, running, elapsedMs, runAll, runOne, stop };
}
