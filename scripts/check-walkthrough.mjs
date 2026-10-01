import { readFileSync, existsSync } from "node:fs";

const PAGE = "web/src/extend/content.ts";
const source = readFileSync(PAGE, "utf8");

const STRING = String.raw`"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\`(?:[^\`\\]|\\.)*\``;
const EDIT = new RegExp(
  String.raw`\{\s*file:\s*"([^"]+)"\s*,\s*(?:label:\s*(?:${STRING})\s*,\s*)?code:\s*(${STRING})`,
  "g",
);

const blocks = [...source.matchAll(EDIT)].map((m) => ({ file: m[1], raw: m[2] }));

function decode(raw) {
  const body = raw.slice(1, -1);
  const BS = String.fromCharCode(92);
  return body
    .split(BS + BS).join(BS)
    .split(BS + "`").join("`")
    .split(BS + "'").join("'")
    .split(BS + '"').join('"')
    .split(BS + "n").join("\n");
}

const flatten = (s) => s.replace(/\s+/g, " ").trim();

let ok = 0;
const problems = [];

for (const { file, raw } of blocks) {
  const code = decode(raw);
  const shown = code.includes("...") ? code.slice(0, code.indexOf("...")) : code;
  const needle = flatten(shown);

  if (!existsSync(file)) {
    if (file.startsWith("programs/")) { ok++; continue; }
    problems.push(`${file}\n      named by the page, but there is no such file`);
    continue;
  }

  if (flatten(readFileSync(file, "utf8")).includes(needle)) ok++;
  else problems.push(`${file}\n      the page shows code that is no longer there:\n      ${needle.slice(0, 110)}`);
}

console.log(`walkthrough: ${blocks.length} code blocks, ${ok} still match the source`);
if (problems.length > 0) {
  console.log("\nout of date:");
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
