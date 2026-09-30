import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import type { Stages } from '../vox/useVoxRunner';

/**
 * The compiler's intermediate forms, in pipeline order.
 *
 * Every stage here is the exact text the command line prints for the same
 * program, because both come from the same formatters in the engine. What you
 * read on this page is what `vox --emit-tree` would hand you.
 */

interface Props {
  ir: string[] | null;
  stages: Stages | null;
  onHide: () => void;
}

type StageId = 'tokens' | 'tree' | 'symbols' | 'ir';

const TABS: { id: StageId; label: string; unit: string }[] = [
  { id: 'tokens', label: 'Tokens', unit: 'tokens' },
  { id: 'tree', label: 'Parse tree', unit: 'nodes' },
  { id: 'symbols', label: 'Symbols', unit: 'lines' },
  { id: 'ir', label: 'IR', unit: 'instructions' },
];

/** Colours the first word of an IR line so the control flow stands out. */
function classify(line: string): string {
  const op = line.split(' ', 1)[0];
  switch (op) {
    case 'func_start':
    case 'func_end':
      return 'text-neon-red-soft';
    case 'label':
      return 'text-neon-blue-soft';
    case 'goto':
    case 'if_false':
    case 'call':
    case 'return':
      return 'text-amber';
    case 'print':
    case 'input':
      return 'text-paper';
    default:
      return 'text-fog';
  }
}

/**
 * Highlights the quoted runs in a line. Every stage marks the text a token
 * actually matched with quotes, so one rule lights up all of them.
 */
function withQuotes(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /'(?:[^'\\]|\\.)*'/g;
  let last = 0;
  let key = 0;
  for (const m of line.matchAll(re)) {
    const start = m.index!;
    if (start > last) out.push(line.slice(last, start));
    out.push(
      <span key={key++} className="text-amber">
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export default function PipelinePanel({ ir, stages, onHide }: Props) {
  const [tab, setTab] = useState<StageId>('ir');

  const lines =
    tab === 'ir' ? ir : stages === null ? null : stages[tab];
  const count = lines === null ? null : lines.length;
  const unit = TABS.find((t) => t.id === tab)!.unit;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel-2">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={t.id === tab}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                t.id === tab
                  ? 'bg-line text-paper'
                  : 'text-fog hover:text-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {count !== null && (
            <span className="hidden text-xs text-fog sm:inline">
              {count} {unit}
            </span>
          )}
          <button
            type="button"
            onClick={onHide}
            className="flex items-center gap-1.5 text-xs text-fog transition-colors hover:text-paper"
          >
            <EyeOff size={13} />
            hide
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {lines === null ? (
          <p className="text-fog/70">
            Run a program to see it become tokens, a parse tree, a symbol table
            and finally instructions.
          </p>
        ) : lines.length === 0 ? (
          <p className="text-fog/70">Nothing at this stage.</p>
        ) : tab === 'ir' ? (
          <table className="border-separate border-spacing-0">
            <tbody>
              {lines.map((line, i) => {
                const [op, ...rest] = line.split(' ');
                return (
                  <tr key={i}>
                    <td className="select-none pr-4 text-right align-top text-fog/50">
                      {i}
                    </td>
                    <td className="whitespace-pre align-top">
                      <span className={classify(line)}>{op}</span>
                      {rest.length > 0 && (
                        <span className="text-paper"> {rest.join(' ')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre text-fog">
            <code>
              {lines.map((line, i) => (
                <span key={i}>
                  {withQuotes(line)}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
