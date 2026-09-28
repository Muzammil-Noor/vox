import { readFileSync, writeFileSync } from "node:fs";

const PLATFORMS = {
  windows: { label: "Java on Windows", runner: "windows-latest" },
  linux: { label: "Java on Linux", runner: "ubuntu-latest" },
};

const args = process.argv.slice(2);
let out = null;
const inputs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") {
    out = args[++i];
  } else if (args[i].includes("=")) {
    const at = args[i].indexOf("=");
    inputs.push({ id: args[i].slice(0, at), file: args[i].slice(at + 1) });
  } else {
    console.error(`report: unexpected argument ${args[i]}`);
    process.exit(64);
  }
}

if (out === null || inputs.length === 0) {
  console.error(
    "usage: node tests/report.mjs --out FILE PLATFORM=FILE [PLATFORM=FILE ...]",
  );
  process.exit(64);
}

function parse(file) {
  const rows = readFileSync(file, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.split("\t"));

  const ran = [];
  const failures = {};
  const meta = {};

  for (const [id, status, detail] of rows) {
    if (id.startsWith("#")) {
      meta[id.slice(1)] = status;
      continue;
    }
    ran.push(id);
    if (status !== "ok") failures[id] = detail || "failed";
  }

  return { ran, failures, meta };
}

const platforms = inputs.map(({ id, file }) => {
  const { ran, failures, meta } = parse(file);
  const known = PLATFORMS[id] ?? { label: id, runner: id };
  const failed = Object.keys(failures).length;
  return {
    id,
    label: known.label,
    runner: known.runner,
    passed: ran.length - failed,
    failed,
    elapsedSeconds: meta.elapsed === undefined ? null : Number(meta.elapsed),
    ran,
    failures,
  };
});

// Every platform runs the same checkout, so a mismatch means one of them died
// part way through and the report would quietly overstate coverage.
const sizes = new Set(platforms.map((p) => p.ran.length));
if (sizes.size > 1) {
  console.error(
    "report: platforms ran different numbers of tests: " +
      platforms.map((p) => `${p.id}=${p.ran.length}`).join(" "),
  );
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY ?? "";
const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const sha = process.env.GITHUB_SHA ?? "";

let version = null;
try {
  version = readFileSync("VERSION", "utf8").trim();
} catch {
  // Running outside the repository root is not fatal; the page just omits it.
}

const report = {
  schema: 1,
  engine: "java",
  generatedAt: new Date().toISOString(),
  version,
  commit: sha,
  commitShort: sha.slice(0, 7),
  commitUrl: repo && sha ? `${server}/${repo}/commit/${sha}` : null,
  runUrl: process.env.GITHUB_RUN_ID
    ? `${server}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  platforms,
};

writeFileSync(out, JSON.stringify(report));

for (const p of platforms) {
  console.log(
    `${p.id}: ${p.passed} passed, ${p.failed} failed` +
      (p.elapsedSeconds === null ? "" : ` in ${p.elapsedSeconds}s`),
  );
}
console.log(`wrote ${out}`);
