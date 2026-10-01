export interface Edit {
  file: string;
  label?: string;
  code: string;
}

export interface Check {
  command: string;
  output: string;
  look: string;
}

export interface Step {
  title: string;
  stage: string;
  body: string[];
  edits: Edit[];
  check?: Check;
}

export const INTRO = [
  "Every feature in Vox was added the same way. A handful of small edits, in the same few files in the same order. Nothing below needs deep knowledge of compiler theory and no step is longer than a few lines.",
  "We will follow one real feature the whole way through. `absolute value of` is a builtin that exists in Vox, so once you have read this you can open the repository and find every edit on this page exactly where it is described.",
];

export const SETUP = {
  body: "Get a copy, build it and check that it was working before you touched it. If the suite is red before you start, fix that first.",
  commands: [
    "git clone https://github.com/Muzammil-Noor/vox.git",
    "cd vox",
    "./scripts/build.sh      # generates the parser and compiles the engine",
    "./scripts/test.sh       # 139 programs; all of them should pass",
  ],
};

export const MAP = {
  body: "A Vox program passes through five stages on its way to running. Adding a feature means teaching each stage about the thing you are adding. The useful part is that you can stop and look after every single one.",
  stops: [
    {
      stage: "Lexer",
      does: "chops your text into words",
      edit: "Vox.g4",
      see: "--emit-tokens",
    },
    {
      stage: "Parser",
      does: "works out the shape those words make",
      edit: "Vox.g4",
      see: "--emit-tree",
    },
    {
      stage: "Checker",
      does: "decides whether it makes sense",
      edit: "SemanticAnalyzer",
      see: "--emit-symbols",
    },
    {
      stage: "Builder",
      does: "turns the shape into simple instructions",
      edit: "IRBuilder",
      see: "--emit-ir",
    },
    {
      stage: "Runner",
      does: "carries those instructions out",
      edit: "IRExecutor",
      see: "--trace",
    },
  ],
};

export const STEPS: Step[] = [
  {
    title: "Teach it the words",
    stage: "Lexer",
    body: [
      "The lexer turns your text into tokens. A token is one meaningful piece: a number, a name, a bracket. Before anything else can happen, Vox has to recognise your new words as one of those pieces.",
      "Vox keywords are often several words long, so there is a helper called `S` that means \"some spaces\". Using it lets `absolute value of` be a single token rather than three separate words, which is what makes the spoken style possible.",
    ],
    edits: [
      {
        file: "Vox.g4",
        label: "Add a token, down with the other tokens",
        code: "ABS_OF    : 'absolute' S 'value' S 'of' ;",
      },
    ],
    check: {
      command: "vox abs.vox --emit-tokens",
      output: `   2  2:4       SAY                'say'
   3  2:8       ABS_OF             'absolute value of'
   4  2:26      SUB                '-'
   5  2:27      INT                '7'`,
      look: "Your three words appear on one line, as one token named ABS_OF. If you see them on three separate lines, the lexer has not learned them yet.",
    },
  },

  {
    title: "Teach it the shape",
    stage: "Parser",
    body: [
      "The parser decides how tokens fit together. You tell it your new token is allowed in a particular place and what may sit beside it.",
      "`absolute value of` takes one value after it, so it joins the list of builtins and gets one line in the expression rule. The `# builtinExpr` on the end is a label and it is how later stages refer to this shape.",
      "Where you put that line matters more than it looks. The expression rule is ordered and **the order is the precedence**. A line further down binds more tightly than one above it.",
    ],
    edits: [
      {
        file: "Vox.g4",
        label: "Add your token to the list of builtin names",
        code: "builtinName : SQRT_OF | ABS_OF | LENGTH_OF | FLOOR_OF | CEIL_OF | ...",
      },
      {
        file: "Vox.g4",
        label: "This line already existed: one builtin, one value after it",
        code: "| builtinName expression                      # builtinExpr",
      },
    ],
    check: {
      command: "vox abs.vox --emit-tree",
      output: `      statement
        printStatement
          'say'
          expression
            builtinName
              'absolute value of'
            expression
              '-'
              expression
                '7'`,
      look: "Your feature appears as a branch of the tree with its value nested underneath it. An error like \"no viable alternative\" means the parser got to your words and did not know what to do with them.",
    },
  },

  {
    title: "Teach it the rules",
    stage: "Checker",
    body: [
      "Now Vox knows the shape but not whether it is sensible. `absolute value of \"hello\"` parses perfectly well and is still nonsense. The checker is what catches that before the program ever runs.",
      "For a builtin this is one line: \"what it takes and what it gives back\". `num` means it wants a number and `numeric` means it hands back whatever kind of number it was given, so a whole number in gives a whole number out.",
      "This single line is what produces a proper error message for every wrong use, which is why it is worth more than its size suggests.",
    ],
    edits: [
      {
        file: "engines/java/SemanticAnalyzer.java",
        label: "Declare what it takes and what it returns",
        code: 'BUILTINS.put("abs",       new BuiltinSpec("numeric", "num"));',
      },
      {
        file: "engines/java/SemanticAnalyzer.java",
        label: "Connect the token to the name the rest of the compiler uses",
        code: 'if (ctx.ABS_OF() != null) return "abs";',
      },
    ],
    check: {
      command: 'echo \'main { say absolute value of "hi"; }\' > bad.vox && vox bad.vox',
      output: `bad.vox:line 1:11 error: argument 1 of 'abs' expects a number but got string
1 error`,
      look: "Deliberately misuse your feature and make sure you get a clear error rather than a crash. If it compiles happily, the checker does not know about it yet.",
    },
  },

  {
    title: "Say what it becomes",
    stage: "Builder",
    body: [
      "Vox does not run your tree. It first flattens it into a short list of very simple instructions, which is what makes the runner easy to write. This is the stage that does the flattening.",
      "Builtins are so regular that one piece of code already handles all of them: visit the value, make a temporary slot to hold the answer and emit one instruction. If you are adding a builtin, you usually write nothing here at all.",
    ],
    edits: [
      {
        file: "engines/java/IRBuilder.java",
        label: "Already written and already handles your new builtin",
        code: `public String visitBuiltinExpr(VoxParser.BuiltinExprContext ctx) {
    String value = visit(ctx.expression());
    String dest = newTemp();
    emit("builtin " + dest + " " + SemanticAnalyzer.builtinNameOf(ctx.builtinName()) + " " + value);
    return dest;
}`,
      },
    ],
    check: {
      command: "vox abs.vox --emit-ir",
      output: `   0  func_start main
   1  builtin t0 abs -7
   2  print t0 "\\n"
   3  func_end main`,
      look: "One instruction for your feature, putting its answer in a temporary slot. If nothing appears, the builder is not reaching your new shape.",
    },
  },

  {
    title: "Make it happen",
    stage: "Runner",
    body: [
      "The last stage walks that list of instructions and does what each one says. Your feature needs a case here saying what it actually computes.",
      "`arity` checks it was handed the right number of values and `num` insists that value really is a number. They produce proper runtime errors rather than letting a bad value loose inside the runner.",
    ],
    edits: [
      {
        file: "engines/java/IRExecutor.java",
        label: "Add a case for your builtin",
        code: `case "abs": {
    arity(name, args, 1);
    Object x = num(name, args.get(0));
    return x instanceof Integer ? (Object) Math.abs((Integer) x)
                                : (Object) Math.abs((Double) x);
}`,
      },
    ],
    check: {
      command: "vox abs.vox",
      output: "7",
      look: "It runs. If you get \"unknown builtin\", the runner has no case for it yet.",
    },
  },

  {
    title: "Pin it down",
    stage: "Tests",
    body: [
      "Your feature works today. A test is what stops someone breaking it next month without noticing and it costs two files.",
      "Write a small program that uses the feature and a file beside it holding exactly what that program prints. The suite finds both by looking in the folder, so there is nothing to register anywhere.",
      "If your feature is supposed to reject something, add a program to `programs/fail/` too. Those are worth as much as the working ones: they are what keeps your error message from quietly changing.",
    ],
    edits: [
      {
        file: "programs/run/abs.vox",
        label: "A program that uses it",
        code: `main {
    say absolute value of -7;
    say absolute value of 3.5;
}`,
      },
      {
        file: "programs/run/abs.out",
        label: "Exactly what it prints",
        code: `7
3.5`,
      },
    ],
    check: {
      command: "./scripts/test.sh",
      output: "140 passed, 0 failed",
      look: "The count goes up by one and nothing else breaks. If another test fails, you changed behaviour somewhere you did not mean to.",
    },
  },

  {
    title: "Now do it twice",
    stage: "Both engines",
    body: [
      "Vox has two engines built from the same grammar. The Java one is the command line; the TypeScript one runs in the browser and powers this website. A feature is not finished until both have it or the playground will reject a program the command line accepts.",
      "The good news is that the second time is mechanical. The TypeScript files mirror the Java ones method for method, so your edits land in the same places with slightly different syntax.",
      "`parity.sh` is what proves you got it right. It compiles every program in the repository with both engines and demands identical tokens, identical trees, identical instructions and identical error messages.",
    ],
    edits: [
      {
        file: "engines/typescript/src/SemanticAnalyzer.ts",
        label: "The same rule, the same place",
        code: "['abs',       { params: ['num'],        result: 'numeric' }],",
      },
      {
        file: "engines/typescript/src/values.ts",
        label: "The same computation",
        code: `case 'abs': {
    arity(1);
    const x = num(args[0]);
    return typeof x === 'bigint' ? (x < 0n ? -x : x) : Math.abs(x);
}`,
      },
    ],
    check: {
      command: "./scripts/parity.sh",
      output: "140 agree, 0 differ",
      look: "Both engines produce exactly the same output for every program. Any difference is reported with the file and the stage that disagreed.",
    },
  },
];

export const VARIATIONS = {
  body: "The walkthrough above adds a builtin, which is the gentlest kind of feature. Anything else you might add follows the same seven steps, with one or two of them doing more work.",
  head: ["What you want to add", "What changes"],
  rows: [
    [
      "Another way to say something that already exists",
      "Steps 1 and 2 only. Add the token, point it at the shape that already works and the rest of the compiler never knows the difference.",
    ],
    [
      "A function or builtin, like `absolute value of`",
      "Exactly the walkthrough above. Step 4 usually needs nothing from you.",
    ],
    [
      "An operator, like `+` or `squared`",
      "Step 2 is the one to think about. Where you place the line in the expression rule decides its precedence, so put it below anything that should bind less tightly.",
    ],
    [
      "A statement, like `repeat` or `stop the program`",
      "Step 2 adds an alternative to the statement rule instead of the expression rule and step 4 is real work: statements that loop or branch emit labels and jumps rather than one instruction.",
    ],
    [
      "A new datatype",
      "The biggest job and almost all of it is step 3. The checker needs the type's name, what a fresh one starts as and which other types it can be mixed with. Steps 1, 2 and 5 are usually small by comparison.",
    ],
  ],
};

export const TROUBLE = {
  body: "Almost every problem lands in one of these and each one tells you which step to go back to.",
  head: ["What you are seeing", "Which step and why"],
  rows: [
    [
      "Your words show up as separate tokens",
      "Step 1. The token is not matching. Check you used `S` between the words rather than a plain space.",
    ],
    [
      "`no viable alternative at input ...`",
      "Step 2. The lexer made your token but the parser has no rule that accepts it there.",
    ],
    [
      "`function '...' is not declared`",
      "Step 3. The checker has no entry for it, so it fell through to being treated as a call to something that does not exist.",
    ],
    [
      "It compiles, prints nothing, no error",
      "Step 4. No instruction was emitted, so there is nothing for the runner to do. `--emit-ir` will show the gap.",
    ],
    [
      "`unknown builtin` at runtime",
      "Step 5. The instruction exists but the runner has no case for it.",
    ],
    [
      "Works on the command line, fails in the playground",
      "Step 7. You taught one engine and not the other. `parity.sh` will name the exact program and stage.",
    ],
  ],
};

export const HOUSE_RULES = [
  {
    title: "The grammar holds no code",
    body: "`Vox.g4` describes syntax and nothing else. No Java, no actions, no logic. That is the reason one grammar file can produce a parser for two different languages and it is worth protecting.",
  },
  {
    title: "Cater to both engines",
    body: "A feature in one engine and not the other is a bug, simple as that. `parity.sh` is the referee and it checks every stage, make sure its happy.",
  },
  {
    title: "Spoken and symbolic both count",
    body: "If your feature has a natural-language form, give it a symbolic one too and the other way round. `score added to 3` and `score + 3` compile to the same instruction and that pairing is the whole point of the language.",
  },
  {
    title: "A feature without a test is a rumour",
    body: "Software decay is real. Add the program and its expected output as a test (you are encouraged to make both run and fail tests). It takes a minute and it is the difference between a feature that survives and one that dies off silently.",
  },
];
