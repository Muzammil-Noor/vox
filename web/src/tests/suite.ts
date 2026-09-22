const runSources = import.meta.glob("../../../tests/run/*.vox", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const runOutputs = import.meta.glob("../../../tests/run/*.out", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const runStdins = import.meta.glob("../../../tests/run/*.in", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const failSources = import.meta.glob("../../../tests/fail/*.vox", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const failExpects = import.meta.glob("../../../tests/fail/*.expect", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const docsSources = import.meta.glob("../../../docs/snippets/*.vox", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const docsOutputs = import.meta.glob("../../../docs/snippets/*.out", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const docsErrors = import.meta.glob("../../../docs/snippets/*.err", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const docsIrs = import.meta.glob("../../../docs/snippets/*.ir", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const docsStdins = import.meta.glob("../../../docs/snippets/*.in", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const exampleSources = import.meta.glob("../../../examples/*.vox", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const exampleStdins = import.meta.glob("../../../examples/*.in", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type GroupId = "run" | "fail" | "docs" | "examples";

export interface Group {
  id: GroupId;
  title: string;
  blurb: string;
}

export const GROUPS: Group[] = [
  {
    id: "run",
    title: "Run tests",
    blurb:
      "Programs that must run and print exactly the expected output, character for character.",
  },
  {
    id: "fail",
    title: "Fail tests",
    blurb:
      "Programs that must be rejected, with the right exit code and the right message. A fail test that runs happily is a red flag.",
  },
  {
    id: "docs",
    title: "Doc snippets",
    blurb:
      "Every example printed on the documentation page, checked against the output that page claims. Documentation cannot drift from the compiler.",
  },
  {
    id: "examples",
    title: "Examples",
    blurb:
      "The example programs shipped with Vox, which must run start to finish without an error.",
  },
];

/** What a test asserts. A group fills in only the fields that apply to it. */
export interface Expectations {
  stdout?: string;
  diagnostics?: string;
  ir?: string;
  exitCode?: number;
  contains?: string[];
}

export interface TestCase {
  /** Unique across groups, e.g. "run/hello". */
  id: string;
  name: string;
  group: GroupId;
  path: string;
  source: string;
  stdin?: string;
  expect: Expectations;
}

function norm(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  return path.slice(slash + 1, dot);
}

function byName(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(map)) out[basename(path)] = text;
  return out;
}

function namesOf(map: Record<string, string>): string[] {
  return Object.keys(map).map(basename).sort();
}

function optional(
  map: Record<string, string>,
  name: string,
): string | undefined {
  const text = map[name];
  return text === undefined ? undefined : norm(text);
}

function build(): TestCase[] {
  const tests: TestCase[] = [];

  const runOut = byName(runOutputs);
  const runIn = byName(runStdins);
  for (const name of namesOf(runSources)) {
    tests.push({
      id: `run/${name}`,
      name,
      group: "run",
      path: `tests/run/${name}.vox`,
      source: norm(runSources[`../../../tests/run/${name}.vox`]),
      stdin: optional(runIn, name),
      expect: { stdout: optional(runOut, name) ?? "" },
    });
  }

  const failExpect = byName(failExpects);
  for (const name of namesOf(failSources)) {
    const lines = norm(failExpect[name] ?? "").split("\n");
    tests.push({
      id: `fail/${name}`,
      name,
      group: "fail",
      path: `tests/fail/${name}.vox`,
      source: norm(failSources[`../../../tests/fail/${name}.vox`]),
      expect: {
        exitCode: Number(lines[0]),
        contains: lines.slice(1).filter((line) => line !== ""),
      },
    });
  }

  const docsOut = byName(docsOutputs);
  const docsErr = byName(docsErrors);
  const docsIr = byName(docsIrs);
  const docsIn = byName(docsStdins);
  for (const name of namesOf(docsSources)) {
    tests.push({
      id: `docs/${name}`,
      name,
      group: "docs",
      path: `docs/snippets/${name}.vox`,
      source: norm(docsSources[`../../../docs/snippets/${name}.vox`]),
      stdin: optional(docsIn, name),
      expect: {
        stdout: optional(docsOut, name),
        diagnostics: optional(docsErr, name),
        ir: optional(docsIr, name),
      },
    });
  }

  const exampleIn = byName(exampleStdins);
  for (const name of namesOf(exampleSources)) {
    tests.push({
      id: `examples/${name}`,
      name,
      group: "examples",
      path: `examples/${name}.vox`,
      source: norm(exampleSources[`../../../examples/${name}.vox`]),
      stdin: optional(exampleIn, name),
      expect: { exitCode: 0 },
    });
  }

  return tests;
}

export const SUITE: TestCase[] = build();

export function testsInGroup(group: GroupId): TestCase[] {
  return SUITE.filter((test) => test.group === group);
}
