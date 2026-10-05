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
import {
  BROWSER_TAB,
  buildTabs,
  timeAgo,
  useJavaReport,
  verdicts,
  type Verdict,
} from "../tests/engineReport";
import { encodeSource } from "../share";

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

function VerdictLine({
  label,
  status,
  detail,
}: {
  label: string;
  status: TestStatus;
  detail?: string;
}) {
  const dot =
    status === "pass"
      ? "bg-emerald-500"
      : status === "fail"
        ? "bg-red-500"
        : "bg-line-2";
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className={`size-2 shrink-0 translate-y-px rounded-full ${dot}`} />
      <span className="text-fog">{label}</span>
      <span
        className={
          status === "fail"
            ? "text-red-400"
            : status === "pass"
              ? "text-paper"
              : "text-fog"
        }
      >
        {WORDS[status]}
        {detail ? `, ${detail}` : ""}
      </span>
    </div>
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
  const java = useJavaReport();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(BROWSER_TAB);
  const startedOnce = useRef(false);

  // Run once on arrival, so a visitor sees the suite go without hunting for a
  // button. The ref survives StrictMode's double effect in development.
  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    runAll();
  }, [runAll]);

  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  const liveSummary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    for (const test of SUITE) {
      const status = outcomes[test.id]?.status;
      if (status === "pass") passed++;
      else if (status === "fail") failed++;
    }
    return { passed, failed, done: passed + failed };
  }, [outcomes]);

  const platformVerdicts = useMemo(() => {
    const map: Record<string, Record<string, Verdict>> = {};
    if (java.status === "ready") {
      for (const platform of java.report.platforms) {
        map[platform.id] = verdicts(platform);
      }
    }
    return map;
  }, [java]);

  const tabs = useMemo(
    () => buildTabs(java, liveSummary),
    [java, liveSummary],
  );

  const statusOf = useCallback(
    (testId: string): TestStatus => {
      if (tab === BROWSER_TAB) return outcomes[testId]?.status ?? "pending";
      const verdict = platformVerdicts[tab]?.[testId];
      if (verdict === undefined || verdict.status === "unknown") {
        return "pending";
      }
      return verdict.status;
    },
    [tab, outcomes, platformVerdicts],
  );

  const selected = useMemo(
    () => SUITE.find((test) => test.id === selectedId) ?? null,
    [selectedId],
  );
  const selectedOutcome: Outcome | undefined = selectedId
    ? outcomes[selectedId]
    : undefined;

  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0];
  const activePlatform =
    java.status === "ready"
      ? (java.report.platforms.find((p) => p.id === tab) ?? null)
      : null;

  return (
    <div className="neon-backdrop min-h-full">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="mt-6 text-3xl font-bold text-paper">Vox Test Suite</h2>

        <p className="mt-3 max-w-3xl text-fog">
          Vox has two enginesand a feature is not finished until both pass
          every test here. The suite comes in four parts: programs that must run
          and print exactly the right thing, programs that must be rejected with
          exactly the right error, every snippet printed in the documentation,
          and the examples that ship with the language. Click any square to read
          the program and see what it produced.
        </p>

        <div className="mt-6 rounded-lg border border-line-2 bg-panel/60 p-4">
          <p className="text-sm text-paper">
            The TypeScript engine runs live in your browser, right now. The Java
            engine cannot, so its squares come from the last run on CI.
          </p>
          <p className="mt-2 max-w-3xl text-sm text-fog">
            {java.status === "loading" &&
              "Fetching the latest Java results from CI."}
            {java.status === "unavailable" &&
              `Java results are not available: ${java.reason}. Every push to main publishes them, so this fills in on the next run.`}
            {java.status === "ready" && (
              <>
                Java ran the same {SUITE.length} tests on Windows and Linux{" "}
                {timeAgo(java.report.generatedAt)}
                {java.report.commitShort && (
                  <>
                    , on commit{" "}
                    {java.report.commitUrl ? (
                      <a
                        href={java.report.commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-neon-blue-soft hover:underline"
                      >
                        {java.report.commitShort}
                      </a>
                    ) : (
                      <span className="font-mono">
                        {java.report.commitShort}
                      </span>
                    )}
                  </>
                )}
                .{" "}
                {java.report.runUrl && (
                  <a
                    href={java.report.runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neon-blue-soft hover:underline"
                  >
                    See the run
                  </a>
                )}
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                disabled={!t.ready}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-neon-blue text-paper"
                    : "border-line-2 text-fog hover:text-paper"
                } ${t.ready ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                {t.label}
                {t.live && <span className="text-xs text-fog">live</span>}
                {t.ready ? (
                  <span
                    className={`text-xs ${
                      t.failed > 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {t.failed > 0 ? `${t.failed} failing` : `${t.passed} ok`}
                  </span>
                ) : (
                  <span className="text-xs text-fog">soon</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
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
            {tab === BROWSER_TAB ? (
              running ? (
                <>
                  running{" "}
                  <span className="text-paper">
                    {liveSummary.done + 1} of {SUITE.length}
                  </span>{" "}
                  in this browser
                </>
              ) : (
                <>
                  <span className="text-paper">{SUITE.length}</span> tests
                  {liveSummary.done > 0 && (
                    <>
                      {", "}
                      <span className="text-emerald-400">
                        {liveSummary.passed} passed
                      </span>
                      {", "}
                      <span
                        className={
                          liveSummary.failed > 0 ? "text-red-400" : "text-fog"
                        }
                      >
                        {liveSummary.failed} failed
                      </span>
                      {elapsedMs !== null && <> in {formatMs(elapsedMs)}</>}
                    </>
                  )}
                </>
              )
            ) : activePlatform ? (
              <>
                <span className="text-paper">{activePlatform.runner}</span>,{" "}
                <span className="text-emerald-400">
                  {activePlatform.passed} passed
                </span>
                {", "}
                <span
                  className={
                    activePlatform.failed > 0 ? "text-red-400" : "text-fog"
                  }
                >
                  {activePlatform.failed} failed
                </span>
                {activePlatform.elapsedSeconds !== null && (
                  <> in {activePlatform.elapsedSeconds} s</>
                )}
              </>
            ) : (
              <>not published yet</>
            )}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-7">
            {GROUPS.map((group) => {
              const tests = testsInGroup(group.id);
              const failed = tests.filter(
                (test) => statusOf(test.id) === "fail",
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
                        status={statusOf(test.id)}
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
                    expected to produceand what it actually produced.
                  </p>
                  <p className="mt-2 text-xs text-fog">
                    Showing {activeTab.label} results.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-mono text-sm text-paper">
                      {selected.path}
                    </p>
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

                  <div className="space-y-1.5 rounded-lg border border-line-2 bg-panel/60 p-3">
                    <VerdictLine
                      label="TypeScript, in this browser:"
                      status={selectedOutcome?.status ?? "pending"}
                      detail={
                        selectedOutcome?.result
                          ? formatMs(selectedOutcome.result.elapsedMs)
                          : undefined
                      }
                    />
                    {java.status === "ready" ? (
                      java.report.platforms.map((platform) => {
                        const verdict = platformVerdicts[platform.id]?.[
                          selected.id
                        ] ?? { status: "unknown" as const };
                        return (
                          <VerdictLine
                            key={platform.id}
                            label={`${platform.label}:`}
                            status={
                              verdict.status === "unknown"
                                ? "pending"
                                : verdict.status
                            }
                            detail={
                              verdict.status === "fail"
                                ? verdict.detail
                                : undefined
                            }
                          />
                        );
                      })
                    ) : (
                      <p className="text-xs text-fog">
                        Java results from CI are not loaded.
                      </p>
                    )}
                  </div>

                  <Code
                    source={selected.source}
                    title="Program"
                    accent={selectedOutcome?.status === "fail" ? "red" : "blue"}
                  />

                  {selectedOutcome?.crash !== undefined && (
                    <p className="rounded-lg border border-red-500/50 bg-panel p-3 text-sm text-red-400">
                      The engine itself threw: {selectedOutcome.crash}
                    </p>
                  )}

                  {selectedOutcome !== undefined &&
                    selectedOutcome.checks.length > 0 && (
                      <p className="text-xs text-fog">
                        Compared in this browser. CI reports a verdict per test,
                        not the output behind it.
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
                      This test has not run in your browser yet.
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
