# Every Vox program in the repository

There are 139 of them here and every one is checked on both engines, on Linux and on Windows, on every push. Between them they pin down everything the language does. A behaviour is not guaranteed if it is not represented by a program in this folder.

They are sorted by what each one proves, not by topic.

| Folder      | Count | What it has to do                                     |
| ----------- | ----- | ----------------------------------------------------- |
| `examples/` | 8     | run start to finish; these open in the playground     |
| `snippets/` | 47    | print exactly this; the docs page shows them          |
| `run/`      | 34    | print exactly this                                    |
| `fail/`     | 50    | be rejected, with exactly this message                |

## How each kind is checked

A program is `NAME.vox`. The files beside it say what must happen.

**`run/`** pairs `NAME.vox` with `NAME.out`, the exact text it must print. `NAME.in` supplies stdin when the program asks for input.

**`fail/`** pairs `NAME.vox` with `NAME.expect`. The first line is the exit code the compiler must return, `1` for a program rejected before it runs and `2` for one stopped at run time. Every line after that is text that must appear in the message. These are worth reading even though none of them work: fifty programs, each pinning one diagnostic, is a specification of the type checker written in Vox itself.

**`snippets/`** are the programs printed on the website's documentation page. They can pin more than output, because the page shows more than output:

| File           | Checked against                                    |
| -------------- | -------------------------------------------------- |
| `NAME.out`     | its exact printed output                           |
| `NAME.err`     | its exact compiler messages, path stripped         |
| `NAME.ir`      | its exact generated instructions                   |
| `NAME.tokens`  | the exact output of `--emit-tokens`                |
| `NAME.tree`    | the exact output of `--emit-tree`                  |
| `NAME.symbols` | the exact output of `--emit-symbols`               |
| `NAME.in`      | optional stdin                                     |

A snippet is checked against whichever of those exist. That is why the documentation cannot drift from the compiler: the page and the test read the same file.

**`examples/`** only have to run without an error. They are the showcase, so they are longer and more interesting than a test and the playground loads them from here.

## Running them

```bash
./scripts/test.sh          # the Java engine against all of the above
./scripts/parity.sh        # both engines against each other
```

See [scripts/readme.md](../scripts/readme.md) for the rest.

## Adding one

Drop the `.vox` file in the folder that matches what you want to prove, add the files that say what must happen and run `./scripts/test.sh`. Nothing needs registering anywhere: every script and the website find these by crawling through the folder.
