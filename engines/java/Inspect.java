import java.util.List;
import org.antlr.v4.runtime.Parser;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.tree.ParseTree;
import org.antlr.v4.runtime.tree.TerminalNode;

/**
 * Renders what the compiler is holding at each stage of the pipeline, so the
 * arrows in the README can actually be watched rather than taken on trust.
 *
 *   source text  ->  tokens      --emit-tokens
 *                ->  parse tree  --emit-tree
 *                ->  symbols     --emit-symbols
 *                ->  IR          --emit-ir
 *                ->  output      --trace shows each instruction as it runs
 *
 * The TypeScript port has the same formatters in engines/typescript/src/inspect.tsand
 * scripts/parity.sh compares the two, so these two files must produce identical
 * text for identical input.
 */
public final class Inspect {

    private Inspect() {}

    /** One line per token: index, position, token typeand the text it matched. */
    public static List<String> tokens(List<Token> tokens) {
        java.util.ArrayList<String> lines = new java.util.ArrayList<>();
        for (int i = 0; i < tokens.size(); i++) {
            Token t = tokens.get(i);
            String where = t.getLine() + ":" + t.getCharPositionInLine();
            lines.add(String.format("%4d  %-9s %-18s %s", i, where, name(t), quote(t.getText())));
        }
        return lines;
    }

    private static String name(Token t) {
        if (t.getType() == Token.EOF) return "EOF";
        String symbolic = VoxLexer.VOCABULARY.getSymbolicName(t.getType());
        if (symbolic != null) return symbolic;
        // Punctuation declared inline in the grammar has no symbolic name, so
        // fall back to the literal it matches rather than printing a number.
        String literal = VoxLexer.VOCABULARY.getLiteralName(t.getType());
        return literal == null ? String.valueOf(t.getType()) : literal;
    }

    /**
     * The parse tree, one node per line, indented by depth. Rules are named;
     * leaves show the text they matched. Nesting is the point: it is where the
     * shape of `1 + 2 * 3` becomes visible.
     */
    public static List<String> tree(ParseTree tree, Parser parser) {
        java.util.ArrayList<String> lines = new java.util.ArrayList<>();
        walk(tree, parser, 0, lines);
        return lines;
    }

    private static void walk(ParseTree node, Parser parser, int depth, List<String> out) {
        String indent = "  ".repeat(depth);
        if (node instanceof TerminalNode) {
            out.add(indent + quote(node.getText()));
            return;
        }
        if (node instanceof ParserRuleContext) {
            ParserRuleContext ctx = (ParserRuleContext) node;
            out.add(indent + parser.getRuleNames()[ctx.getRuleIndex()]);
            for (int i = 0; i < ctx.getChildCount(); i++) {
                walk(ctx.getChild(i), parser, depth + 1, out);
            }
            return;
        }
        out.add(indent + quote(node.getText()));
    }

    /** Escapes a token's text so one line of output stays one line. */
    public static String quote(String text) {
        StringBuilder sb = new StringBuilder("'");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '\\': sb.append("\\\\"); break;
                case '\'': sb.append("\\'"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:   sb.append(c);
            }
        }
        return sb.append('\'').toString();
    }
}
