const sources = import.meta.glob("../../../docs/snippets/*.vox", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const outputs = import.meta.glob("../../../docs/snippets/*.out", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const errors = import.meta.glob("../../../docs/snippets/*.err", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const irs = import.meta.glob("../../../docs/snippets/*.ir", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const stdins = import.meta.glob("../../../docs/snippets/*.in", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface Snippet {
  id: string;
  /** The program, exactly as the suite runs it. */
  source: string;
  /** What it printed, if anything. */
  output?: string;
  /** Compiler or runtime messages, with the file path stripped. */
  diagnostics?: string;
  /** The emitted IR, for the section that shows it. */
  ir?: string;
  /** Lines typed at the prompt, for programs that read input. */
  stdin?: string;
}

function pick(
  map: Record<string, string>,
  id: string,
  ext: string,
): string | undefined {
  const value = map[`../../../docs/snippets/${id}.${ext}`];
  return value === undefined
    ? undefined
    : value.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

export function getSnippet(id: string): Snippet {
  const source = pick(sources, id, "vox");
  if (source === undefined) {
    // A typo in the content file should be loud, not a silently empty box.
    return { id, source: `// missing snippet: docs/snippets/${id}.vox` };
  }
  return {
    id,
    source,
    output: pick(outputs, id, "out"),
    diagnostics: pick(errors, id, "err"),
    ir: pick(irs, id, "ir"),
    stdin: pick(stdins, id, "in"),
  };
}
