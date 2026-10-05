// The example programs are the same files the regression suite runs, imported
// straight from the repo's programs/examples/ directory so the site never drifts from
// what actually works.
import hailstone from "../../programs/examples/hailstone.vox?raw";
import factorial from "../../programs/examples/factorial.vox?raw";
import fibonacci from "../../programs/examples/fibonacci.vox?raw";
import natural from "../../programs/examples/natural.vox?raw";
import counting from "../../programs/examples/counting.vox?raw";
import playlist from "../../programs/examples/playlist.vox?raw";
import voice from "../../programs/examples/voice.vox?raw";
import wordplay from "../../programs/examples/wordplay.vox?raw";
import tally from "../../programs/examples/tally.vox?raw";

export interface Example {
  id: string;
  name: string;
  blurb: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "hailstone",
    name: "Hailstone",
    blurb: "The Collatz sequence, written the way you would say it.",
    source: hailstone,
  },
  {
    id: "natural",
    name: "Natural syntax",
    blurb: "Every spelling Vox accepts, in one program.",
    source: natural,
  },
  {
    id: "voice",
    name: "Voice",
    blurb: "say, ask, predicates and repeat - the radio host in action.",
    source: voice,
  },
  {
    id: "counting",
    name: "Counting",
    blurb: "Range loops, countdowns and in-place updates.",
    source: counting,
  },
  {
    id: "playlist",
    name: "Playlist",
    blurb: "Lists: push, pop, ordinals and for each.",
    source: playlist,
  },
  {
    id: "tally",
    name: "Tally",
    blurb: "Maps: counting, looking up and finding the winner.",
    source: tally,
  },
  {
    id: "wordplay",
    name: "Wordplay",
    blurb: "Strings as sequences, palindromes and a seeded shuffle.",
    source: wordplay,
  },
  {
    id: "factorial",
    name: "Factorial",
    blurb: "A while loop and a function call.",
    source: factorial,
  },
  {
    id: "fibonacci",
    name: "Fibonacci",
    blurb: "Recursion, a for loop and multi-argument print.",
    source: fibonacci,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0];

export function findExample(id: string | null): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
