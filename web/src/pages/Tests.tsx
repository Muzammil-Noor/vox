import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleStop, ExternalLink, Play, RotateCw } from "lucide-react";
import Nav from "../components/Nav";
import Code from "../components/Code";
import { GROUPS, SUITE, testsInGroup, type TestCase } from "../tests/suite";
import {
  useSuiteRunner,
  type Outcome,
  type TestStatus,
} from "../tests/useSuiteRunner";
import { encodeSource } from "../share";

/**
 * The suite, running live in the visitor's browser.
 *
 * Only the TypeScript engine exists in a browser, so that is what these
 * squares report. The Java engine is checked by CI on Windows and Linux, and
 * the page says so rather than implying a green square covers both.
 */

const TONE: Record<TestStatus, string> = {
  pending: "bg-line-2 hover:bg-line-2/60",
  running: "bg-amber animate-pulse",
  pass: "bg-emerald-500/80 hover:bg-emerald-400",
  fail: "bg-red-500 hover:bg-red-400 shadow-[0_0_10px_rgb(255_43_43/0.75)]",
};

const WORDS: Record<TestStatus, string> = {
  pending: "not run yet",
  running: "running",
  pass: "passed",
  fail: "failed",
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

const Square = memo(function Square({
  test,
  status,
  selected,
  onSelect,
}: {
  test: TestCase;
  status: TestStatus;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(test.id)}
      title={`${test.name} - ${WORDS[status]}`}
      aria-label={`${test.name}, ${WORDS[status]}`}
      aria-pressed={selected}
      className={`size-6 cursor-pointer rounded-md transition-all duration-200 ${TONE[status]} ${
        selected ? "ring-2 ring-paper" : ""
      }`}
    />
  );
});

function EngineBadge({ name, live }: { name: string; live?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
        live
          ? "border-neon-blue/60 text-neon-blue-soft"
          : "border-line-2 text-fog"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${live ? "bg-neon-blue" : "bg-line-2"}`}
      />
      {name}
      <span className="text-fog">{live ? "running here" : "coming soon"}</span>
    </span>
  );
}

function OutputPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-line-2 bg-panel">
      <div className="flex h-9 items-center border-b border-line px-4">
        <span className="panel-title">{title}</span>
      </div>
      <pre className="max-h-56 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-fog">
        <code>{text === "" ? "(nothing)" : text}</code>
      </pre>
    </div>
  );
}

export default function Tests() {
  const { outcomes, running, elapsedMs, runAll, runOne, stop } =
    useSuiteRunner();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const startedOnce = useRef(false);

  // Run once on arrival, so a visitor sees the suite go without hunting for a
  // button. The ref survives StrictMode's double effect in development.
  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    runAll();
  }, [runAll]);

  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  const summary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    for (const test of SUITE) {
      const status = outcomes[test.id]?.status;
      if (status === "pass") passed++;
      else if (status === "fail") failed++;
    }
    return { passed, failed, done: passed + failed, total: SUITE.length };
  }, [outcomes]);

  const selected = useMemo(
    () => SUITE.find((test) => test.id === selectedId) ?? null,
    [selectedId],
  );
  const selectedOutcome: Outcome | undefined = selectedId
    ? outcomes[selectedId]
    : undefined;

  return (
    <div className="neon-backdrop min-h-full">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="mt-6 text-3xl font-bold text-paper">Vox Test Suite</h2>

        <p className="mt-3 max-w-3xl text-fog">
          Vox has two engines, and a feature is not finished until both pass
          every test here. The suite comes in four parts: programs that must
          run and print exactly the right thing, programs that must be rejected
          with exactly the right error, every snippet printed in the
          documentation, and the examples that ship with the language. Click any
          square to read the program and see what it produced.
        </p>

        <div className="mt-6 rounded-lg border border-line-2 bg-panel/60 p-4">
          <p className="text-sm text-paper">
            Everything on this page runs live in your browser, on the
            TypeScript engine.
          </p>
          <p className="mt-2 max-w-3xl text-sm text-fog">
            The second engine is written in Java, and the same suite runs
            against it on every push, on both Windows and Linux. Those results
            are not shown here yet. Publishing them alongside these squares is
            next, once the infrastructure is in place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <EngineBadge name="TypeScript" live />
            <EngineBadge name="Java on Windows" />
            <EngineBadge name="Java on Linux" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {running ? (
            <button type="button" className="btn-ghost" onClick={stop}>
              <CircleStop size={15} />
              Stop
            </button>
          ) : (
            <button type="button" className="btn-red" onClick={runAll}>
              <Play size={15} />
              Run all tests
            </button>
          )}

          <p className="text-sm text-fog">
            {running ? (
              <>
                running{" "}
                <span className="text-paper">
                  {summary.done + 1} of {summary.total}
                </span>
              </>
            ) : (
              <>
                <span className="text-paper">{summary.total}</span> tests
                {summary.done > 0 && (
                  <>
                    {", "}
                    <span className="text-emerald-400">
                      {summary.passed} passed
                    </span>
                    {", "}
                    <span
                      className={
                        summary.failed > 0 ? "text-red-400" : "text-fog"
                      }
                    >
                      {summary.failed} failed
                    </span>
                    {elapsedMs !== null && <> in {formatMs(elapsedMs)}</>}
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-7">
            {GROUPS.map((group) => {
              const tests = testsInGroup(group.id);
              const failed = tests.filter(
                (test) => outcomes[test.id]?.status === "fail",
              ).length;
              return (
                <section key={group.id}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-xl font-bold text-paper">
                      {group.title}
                    </h3>
                    <span className="text-xs text-fog">
                      {tests.length} tests
                      {failed > 0 && (
                        <span className="text-red-400">, {failed} failing</span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-fog">
                    {group.blurb}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tests.map((test) => (
                      <Square
                        key={test.id}
                        test={test}
                        status={outcomes[test.id]?.status ?? "pending"}
                        selected={test.id === selectedId}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="lg:w-[46%] lg:shrink-0">
            <div className="lg:sticky lg:top-4">
              {selected === null ? (
                <div className="rounded-lg border border-dashed border-line-2 bg-panel/40 p-8 text-center">
                  <p className="text-sm text-fog">
                    Pick a square to see the program it runs, what it was
                    expected to produce, and what it actually produced.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-paper">
                        {selected.path}
                      </p>
                      <p className="text-xs text-fog">
                        {selectedOutcome
                          ? WORDS[selectedOutcome.status]
                          : WORDS.pending}
                        {selectedOutcome?.result &&
                          ` in ${formatMs(selectedOutcome.result.elapsedMs)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-ghost px-3! py-1.5! text-xs"
                        onClick={() => runOne(selected)}
                        disabled={running}
                      >
                        <RotateCw size={13} />
                        Run again
                      </button>
                      <Link
                        to={`/playground?code=${encodeSource(selected.source)}`}
                        className="btn-blue px-3! py-1.5! text-xs"
                      >
                        <ExternalLink size={13} />
                        Playground
                      </Link>
                    </div>
                  </div>

                  <Code
                    source={selected.source}
                    title="Program"
                    accent={
                      selectedOutcome?.status === "fail" ? "red" : "blue"
                    }
                  />

                  {selectedOutcome?.crash !== undefined && (
                    <p className="rounded-lg border border-red-500/50 bg-panel p-3 text-sm text-red-400">
                      The engine itself threw: {selectedOutcome.crash}
                    </p>
                  )}

                  {selectedOutcome?.checks.map((check) => (
                    <div key={check.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            check.ok ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <span className="panel-title">{check.name}</span>
                        {!check.ok && (
                          <span className="text-xs text-red-400">
                            does not match
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <OutputPanel title="Expected" text={check.expected} />
                        <OutputPanel title="Actual" text={check.actual} />
                      </div>
                    </div>
                  ))}

                  {selectedOutcome === undefined && (
                    <p className="text-sm text-fog">
                      This test has not run yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
