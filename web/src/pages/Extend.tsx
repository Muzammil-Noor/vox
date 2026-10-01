import { Terminal, FileCode2, CheckCircle2, ArrowRight } from "lucide-react";
import Nav from "../components/Nav";
import GithubIcon from "../components/GithubIcon";
import { LINKS } from "../site";
import {
  INTRO,
  SETUP,
  MAP,
  STEPS,
  VARIATIONS,
  TROUBLE,
  HOUSE_RULES,
  type Edit,
  type Check,
} from "../extend/content";

/** Renders `code spans` inside prose, the same way the docs page does. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={i}
              className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em] text-neon-blue-soft"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-paper">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

/** A file you open and edit. */
function EditBlock({ edit }: { edit: Edit }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-panel">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2">
        <FileCode2 size={13} className="shrink-0 text-neon-blue-soft" />
        <span className="font-mono text-xs text-paper">{edit.file}</span>
        {edit.label && (
          <span className="text-xs text-fog">{edit.label}</span>
        )}
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-fog">
        <code>{edit.code}</code>
      </pre>
    </div>
  );
}

/** The "you should now hear a click" box. */
function CheckBlock({ check }: { check: Check }) {
  return (
    <div className="overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/[0.04]">
      <div className="flex items-center gap-2 border-b border-emerald-500/20 px-4 py-2">
        <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
        <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
          Check it worked
        </span>
      </div>
      <div className="space-y-3 px-4 py-3">
        <pre className="overflow-x-auto font-mono text-[12.5px] leading-relaxed">
          <code>
            <span className="text-fog/60">$ </span>
            <span className="text-paper">{check.command}</span>
          </code>
        </pre>
        <pre className="overflow-x-auto border-l-2 border-line-2 pl-3 font-mono text-[12.5px] leading-relaxed text-fog">
          <code>{check.output}</code>
        </pre>
        <p className="text-sm text-fog">
          <RichText text={check.look} />
        </p>
      </div>
    </div>
  );
}

function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-panel-2">
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-line px-4 py-2.5 text-left font-semibold text-paper"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-panel/60">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border-b border-line px-4 py-2.5 align-top ${
                    j === 0 ? "text-paper" : "text-fog"
                  }`}
                >
                  <RichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Extend() {
  return (
    <div className="neon-backdrop min-h-full">
      <Nav />

      <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <h2 className="mt-8 text-3xl font-bold text-paper sm:text-4xl">
          Add a feature to Vox
        </h2>

        <div className="mt-4 space-y-3">
          {INTRO.map((p, i) => (
            <p key={i} className="text-fog">
              <RichText text={p} />
            </p>
          ))}
        </div>

        {/* jump links */}
        <div className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((step, i) => (
            <a
              key={step.title}
              href={`#step-${i + 1}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1 text-xs text-fog transition-colors hover:border-fog hover:text-paper"
            >
              <span className="font-mono text-neon-red-soft">{i + 1}</span>
              {step.title}
            </a>
          ))}
        </div>

        {/* ---- before you start ---- */}
        <section className="mt-12">
          <h3 className="text-xl font-bold text-paper">Before you start</h3>
          <p className="mt-2 text-fog">
            <RichText text={SETUP.body} />
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line-2 bg-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2">
              <Terminal size={13} className="shrink-0 text-fog" />
              <span className="panel-title">Terminal</span>
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
              <code>
                {SETUP.commands.map((c, i) => (
                  <span key={i}>
                    <span className="text-fog/60">$ </span>
                    <span className="text-paper">{c}</span>
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </section>

        {/* ---- the map ---- */}
        <section className="mt-12">
          <h3 className="text-xl font-bold text-paper">
            The five stops
          </h3>
          <p className="mt-2 text-fog">
            <RichText text={MAP.body} />
          </p>

          <ol className="mt-5 space-y-2">
            {MAP.stops.map((stop, i) => (
              <li
                key={stop.stage}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-panel/60 px-4 py-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-2 font-mono text-xs text-fog">
                  {i + 1}
                </span>
                <span className="font-semibold text-paper">{stop.stage}</span>
                <span className="text-sm text-fog">{stop.does}</span>
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <code className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-neon-blue-soft">
                    {stop.edit}
                  </code>
                  <ArrowRight size={11} className="text-fog/50" />
                  <code className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-amber">
                    {stop.see}
                  </code>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-4 text-sm text-fog">
            The right-hand column is the flag that prints what that stage is
            holding. After every step below you can run one and see your change
            arrive.
          </p>
        </section>

        {/* ---- the steps ---- */}
        <section className="mt-14">
          <h3 className="text-xl font-bold text-paper">The build</h3>

          <div className="mt-6 space-y-10">
            {STEPS.map((step, i) => (
              <article
                key={step.title}
                id={`step-${i + 1}`}
                className="scroll-mt-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full tube-red font-mono text-sm text-neon-red-soft">
                    {i + 1}
                  </span>
                  <h4 className="text-lg font-bold text-paper">{step.title}</h4>
                  <span className="ml-auto shrink-0 text-xs text-fog">
                    {step.stage}
                  </span>
                </div>

                <div className="mt-3 space-y-3 border-l border-line pl-4 sm:ml-4">
                  {step.body.map((p, j) => (
                    <p key={j} className="text-fog">
                      <RichText text={p} />
                    </p>
                  ))}

                  <div className="space-y-3 pt-1">
                    {step.edits.map((edit, j) => (
                      <EditBlock key={j} edit={edit} />
                    ))}
                  </div>

                  {step.check && <CheckBlock check={step.check} />}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---- variations ---- */}
        <section className="mt-14">
          <h3 className="text-xl font-bold text-paper">
            If you are adding something else
          </h3>
          <p className="mt-2 text-fog">
            <RichText text={VARIATIONS.body} />
          </p>
          <SimpleTable head={VARIATIONS.head} rows={VARIATIONS.rows} />
        </section>

        {/* ---- troubleshooting ---- */}
        <section className="mt-14">
          <h3 className="text-xl font-bold text-paper">When it does not work</h3>
          <p className="mt-2 text-fog">
            <RichText text={TROUBLE.body} />
          </p>
          <SimpleTable head={TROUBLE.head} rows={TROUBLE.rows} />
        </section>

        {/* ---- house rules ---- */}
        <section className="mt-14">
          <h3 className="text-xl font-bold text-paper">Four house rules</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {HOUSE_RULES.map((rule) => (
              <div
                key={rule.title}
                className="rounded-lg border border-line bg-panel/60 p-4"
              >
                <h4 className="font-semibold text-paper">{rule.title}</h4>
                <p className="mt-1.5 text-sm text-fog">
                  <RichText text={rule.body} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- close ---- */}
        <section className="mt-14 rounded-lg border border-line-2 bg-panel/60 p-6 text-center">
          <p className="text-paper">
            That is the whole recipe. Every feature in Vox got here this way.
          </p>
          <p className="mt-2 text-sm text-fog">
            The code for all seven steps is sitting in the repository, with the
            tests that keep it honest.
          </p>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="btn-red mt-5 inline-flex"
          >
            <GithubIcon size={15} />
            Open the repository
          </a>
        </section>
      </main>
    </div>
  );
}
