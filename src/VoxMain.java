import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.tree.ParseTree;

/**
 * Command line entry point: parse, check, lower, run.
 *
 * The body of main() is the whole pipeline in order, and each stage can be
 * printed on the way past with an --emit flag. Reading this file top to bottom
 * is the shortest description of how Vox works.
 *
 * Exit codes: 0 success, 1 compile error, 2 runtime error, 64 bad usage.
 */
public class VoxMain {

    private static final String USAGE =
            "Usage: vox <source.vox> [options]\n"
          + "  --emit-tokens  print the tokens the lexer produced\n"
          + "  --emit-tree    print the parse tree\n"
          + "  --emit-symbols print the names the checker took in\n"
          + "  --emit-ir      print the generated IR\n"
          + "  --trace        print each instruction as it runs, on stderr\n"
          + "  --check        parse and type-check only, do not run\n"
          + "  --steps <n>    change the execution step limit\n"
          + "  --version      print the version\n";

    /** Collects diagnostics instead of writing them straight to the console. */
    private static final class ErrorCollector extends BaseErrorListener {
        final List<String> messages = new ArrayList<>();
        @Override
        public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol,
                                int line, int charPositionInLine, String msg,
                                RecognitionException e) {
            messages.add("line " + line + ":" + charPositionInLine + " error: " + msg);
        }
    }

    /**
     * Prints the --emit sections. A single section is printed bare, so
     * `--emit-ir` keeps feeding scripts the way it always has; ask for more
     * than one and each gets a heading so they can be told apart.
     */
    private static final class Sections {
        private final boolean headed;
        private boolean any = false;
        Sections(int requested) { this.headed = requested > 1; }

        void print(String title, List<String> lines) {
            if (headed) {
                if (any) System.out.println();
                System.out.println("== " + title);
            }
            any = true;
            for (String line : lines) System.out.println(line);
        }
    }

    public static void main(String[] args) {
        String sourcePath = null;
        boolean emitTokens = false;
        boolean emitTree = false;
        boolean emitSymbols = false;
        boolean emitIr = false;
        boolean trace = false;
        boolean checkOnly = false;
        long stepLimit = -1;

        for (int i = 0; i < args.length; i++) {
            String a = args[i];
            if ("--version".equals(a)) {
                System.out.println("vox " + version());
                return;
            }
            if ("--emit-tokens".equals(a))       emitTokens = true;
            else if ("--emit-tree".equals(a))    emitTree = true;
            else if ("--emit-symbols".equals(a)) emitSymbols = true;
            else if ("--emit-ir".equals(a))      emitIr = true;
            else if ("--trace".equals(a))        trace = true;
            else if ("--check".equals(a))        checkOnly = true;
            else if ("--steps".equals(a) && i + 1 < args.length) {
                try {
                    stepLimit = Long.parseLong(args[++i]);
                } catch (NumberFormatException e) {
                    System.err.println("vox: --steps needs a number");
                    System.exit(64);
                }
            } else if (a.startsWith("-")) {
                System.err.println("vox: unknown option " + a + "\n\n" + USAGE);
                System.exit(64);
            } else if (sourcePath == null) {
                sourcePath = a;
            } else {
                System.err.println("vox: more than one source file given\n\n" + USAGE);
                System.exit(64);
            }
        }

        if (sourcePath == null) {
            System.err.println(USAGE);
            System.exit(64);
        }

        String source;
        try {
            source = new String(Files.readAllBytes(Path.of(sourcePath)),
                    java.nio.charset.StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.err.println("vox: cannot read " + sourcePath + ": " + e.getMessage());
            System.exit(64);
            return;
        }

        Sections sections = new Sections(
                (emitTokens ? 1 : 0) + (emitTree ? 1 : 0)
              + (emitSymbols ? 1 : 0) + (emitIr ? 1 : 0));

        // ---- scan ------------------------------------------------------------
        ErrorCollector collector = new ErrorCollector();

        VoxLexer lexer = new VoxLexer(CharStreams.fromString(source, sourcePath));
        lexer.removeErrorListeners();
        lexer.addErrorListener(collector);

        CommonTokenStream tokenStream = new CommonTokenStream(lexer);
        // Read every token up front so they can be shown even when the parse
        // that follows fails: a lexer that succeeded is worth seeing.
        tokenStream.fill();
        if (emitTokens) sections.print("tokens", Inspect.tokens(tokenStream.getTokens()));

        // ---- parse -----------------------------------------------------------
        VoxParser parser = new VoxParser(tokenStream);
        parser.removeErrorListeners();
        parser.addErrorListener(collector);

        ParseTree tree = parser.program();

        // The old driver skipped this check and built IR from a broken tree,
        // which silently produced wrong programs.
        if (!collector.messages.isEmpty()) {
            report(sourcePath, collector.messages);
            System.exit(1);
        }

        if (emitTree) sections.print("parse tree", Inspect.tree(tree, parser));

        // ---- check -----------------------------------------------------------
        SemanticAnalyzer analyzer = new SemanticAnalyzer();
        analyzer.visit(tree);

        if (emitSymbols) sections.print("symbols", analyzer.getSymbols());

        for (String w : analyzer.getWarnings()) {
            System.err.println(sourcePath + ":" + w);
        }
        if (!analyzer.getErrors().isEmpty()) {
            report(sourcePath, analyzer.getErrors());
            System.exit(1);
        }

        // ---- lower -----------------------------------------------------------
        IRBuilder builder = new IRBuilder();
        builder.visit(tree);
        List<String> ir = builder.getInstructions();

        if (emitIr) {
            List<String> numbered = new ArrayList<>();
            for (int i = 0; i < ir.size(); i++) {
                numbered.add(String.format("%4d  %s", i, ir.get(i)));
            }
            sections.print("ir", numbered);
        }
        if (checkOnly) return;

        // ---- run -------------------------------------------------------------
        IRExecutor executor = new IRExecutor(ir);
        if (stepLimit > 0) executor.withStepLimit(stepLimit);
        // The trace goes to stderr so it never mixes into the program's output.
        if (trace) executor.withTrace(text -> System.err.print(text));
        try {
            executor.execute();
        } catch (IRExecutor.VoxRuntimeError e) {
            System.err.println(sourcePath + ": runtime error: " + e.getMessage());
            System.exit(2);
        }
    }

    /** The build scripts stamp VERSION into the jar as /vox-version.txt. */
    private static String version() {
        try (java.io.InputStream in = VoxMain.class.getResourceAsStream("/vox-version.txt")) {
            if (in != null) {
                return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            }
        } catch (IOException e) {
            // fall through: an unstamped classpath build
        }
        return "(development build)";
    }

    private static void report(String path, List<String> messages) {
        for (String m : messages) System.err.println(path + ":" + m);
        int n = messages.size();
        System.err.println(n + (n == 1 ? " error" : " errors"));
    }
}
