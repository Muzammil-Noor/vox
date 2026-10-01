# Vox

A small programming language that reads like English (and its compiler too i suppose)

[Read the story behind it](https://chaotiz.vercel.app/journal/vox)

```java
main {
   let there be a whole number score which is equal to 17;
   integer total <- score added to 3;

   if (total is greater than 15) {
      say "that is a good score";
   }

   for i from 1 to 5 {
      say i squared;
   }
}
```

Every one of those spellings has a symbolic twin. `score added to 3` and `score + 3` compile to the same instruction, so you can start with words and drift toward symbols as they stop being noise.

## Two things this repository is for

**Learning to program.** Vox is meant to be a first language. The syntax is close to the sentence you would have said out loud, the error messages are written for someone who does not yet know what a type is and there is nothing to install to try it: the whole compiler runs in the browser.

**Learning how compilers work.** This is a complete compiler written without LLVM, without a parser generator you have to fight and without anything clever enough to hide what it is doing. It is about four thousand lines and every stage can be printed and looked at.

## Try it without installing anything

The playground runs the real compiler in your browser The documentation page beside it is the language reference and every example on it is a program from this repository that is tested on every push.

## Install it

Download the Windows installer from
[Releases](https://github.com/Muzammil-Noor/vox/releases) and run it. It carries its own Java runtime, so nothing else is needed and it puts `vox` on your `PATH` for easy CLI access.

```bash
vox hello.vox
```

There is a zip as well, if you would rather not run an installer.

## Start here, if you came for the compiler

The pipeline has five stages and **you can print what the compiler is holding after each one.** That is the fastest way in and it is the reason this repository is worth reading:

```bash
vox program.vox --emit-tokens    # Tokenizers output which is the text, chopped into tokens
vox program.vox --emit-tree      # Just the tokens presented in a nested format
vox program.vox --emit-symbols   # every name in the scope that owns it
vox program.vox --emit-ir        # the instructions it became (Three Address Code)
vox program.vox --trace          # those instructions, in the order they ran
```

Try `--emit-tree` on `1 + 2 * 3` first. The multiplication comes out deeper than the addition and that is the whole of operator precedence. Its the shape the parser already built instead of being a rule applied afterwards.

Then read these five files, in this order. Together they are the entire compiler.

| Read this                            | To understand                      |
| ------------------------------------ | ---------------------------------- |
| `Vox.g4`                             | What the language is, as a grammar |
| `engines/java/VoxMain.java`          | The pipeline, start to finish      |
| `engines/java/SemanticAnalyzer.java` | Name resolution and type checking  |
| `engines/java/IRBuilder.java`        | Turning a tree into instructions   |
| `engines/java/IRExecutor.java`       | Running the IR                     |

`SemanticAnalyzer.java` looks alarming at fifteen hundred lines. It is not. It
is one small method per kind of syntax, about ninety of them and you only ever
read the one you care about.

The grammar contains **no embedded code**. It describes syntax and nothing else, which is why the same file can generate a parser for two different languages.

## How the pipeline fits together

```
Source (.vox)
   |
   v
Lexer                      generated from Vox.g4       --emit-tokens
   |
   v
Parser                     generated from Vox.g4       --emit-tree
   |
   |
   +--> SemanticAnalyzer   names and types             --emit-symbols
   |
   |
   v
IRBuilder                  tree -> instructions        --emit-ir
   |
   v
IRExecutor                 runs them on a small VM     --trace
```

There are **two engines** built from that one grammar. The Java one in `engines/java/` is the reference implementation and the command line. The TypeScript one in `engines/typescript/` is the same pipeline ported to run in a browser and it is what powers the website.

They are held to identical output, **instruction for instruction** and **error message for error message**, by `scripts/parity.sh`. There is one deliberate difference: TypeScript integers are exact, while Java ints wrap at 32 bits, so a program that overflows gives the mathematically correct answer in the browser and a wrapped one on the command line.

## What is where

| Path                  | What it is                                                  |
| --------------------- | ----------------------------------------------------------- |
| `Vox.g4`              | The grammar. The specification both engines are built from  |
| `engines/java/`       | The reference implementation and the command line           |
| `engines/typescript/` | The same pipeline, for the browser                          |
| `programs/`           | All 139 Vox programs, sorted by what each one proves        |
| `web/`                | The website: landing page, docs, playground, test runner    |
| `scripts/`            | Build, test, package                                        |

Two of those have a guide of their own, worth reading before you touch them:
[programs/readme.md](programs/readme.md) and
[scripts/readme.md](scripts/readme.md).

### Why is there a package.json in a language project?

Nothing in the Java engine touches npm. That file exists because the repository contains two JavaScript projects, `engines/typescript/` and `web/` and the website imports the TS engine as `@vox/core`. The root `package.json` declares the two as npm workspaces, which is what makes that import resolve and lets one `npm install` serve both. It has no dependencies of its own.

**For all learning purposes, this package.json file at root can be ignored**

## Build it yourself

You need a JDK, version 11 or newer and Node 18 or newer for the browser engine.

```bash
./scripts/build.sh          # generates the parser, writes build/vox.jar
./scripts/test.sh           # runs all 139 programs

npm install
npm run build -w @vox/core  # the TypeScript engine
npm run dev                 # the website, on a local server
```

On Windows, `scripts\build.bat` does the same thing. `scripts/package.sh` builds the standalone application and the installer and needs a JDK 14 or newer for `jpackage`.

## Tests

139 programs, each checked against exactly what it must print or exactly how it must fail, on both engines, on Linux and Windows, on every push.

```bash
./scripts/test.sh          # one engine against every program
./scripts/parity.sh        # both engines against each other
```

The website's `/tests` page runs the whole suite live in your browser and shows the Java results from CI beside it.

## Documentation

The website's `/docs` page is the language reference, and every snippet on it
is a tested program from `programs/snippets/`. That is why it cannot drift: the
page and the regression suite read the same files.

## Licence

GPL-3.0. See [LICENSE](LICENSE).
