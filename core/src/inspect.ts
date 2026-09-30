import { TerminalNode, Token } from "antlr4";
import type { Parser, ParserRuleContext } from "antlr4";
import VoxLexer from "./gen/VoxLexer.js";

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
 * The Java engine has the same formatters in src/Inspect.java, and
 * tests/parity.sh compares the two, so these two files must produce identical
 * text for identical input.
 */

/** One line per token: index, position, token type, and the text it matched. */
export function formatTokens(tokens: Token[]): string[] {
    return tokens.map((t, i) => {
        const where = `${t.line}:${t.column}`;
        return `${String(i).padStart(4)}  ${where.padEnd(9)} ${nameOf(t).padEnd(18)} ${quote(t.text ?? "")}`;
    });
}

function nameOf(t: Token): string {
    if (t.type === Token.EOF) return "EOF";
    const symbolic = VoxLexer.symbolicNames[t.type];
    if (symbolic != null) return symbolic;
    // Punctuation declared inline in the grammar has no symbolic name, so fall
    // back to the literal it matches rather than printing a number.
    const literal = VoxLexer.literalNames[t.type];
    return literal ?? String(t.type);
}

/**
 * The parse tree, one node per line, indented by depth. Rules are named;
 * leaves show the text they matched. Nesting is the point: it is where the
 * shape of `1 + 2 * 3` becomes visible.
 */
export function formatTree(tree: ParserRuleContext, parser: Parser): string[] {
    // The runtime carries both of these; its type declarations do not.
    const ruleNames = (parser as unknown as { ruleNames: string[] }).ruleNames;
    const out: string[] = [];
    walk(tree, ruleNames, 0, out);
    return out;
}

/** A rule node, described by what the runtime actually provides. */
interface RuleNode {
    ruleIndex?: number;
    children?: unknown[] | null;
    getText(): string;
}

function walk(node: unknown, ruleNames: string[], depth: number, out: string[]): void {
    const indent = "  ".repeat(depth);

    if (node instanceof TerminalNode) {
        out.push(indent + quote(node.getText()));
        return;
    }

    const ctx = node as RuleNode;
    if (typeof ctx.ruleIndex === "number") {
        out.push(indent + ruleNames[ctx.ruleIndex]);
        for (const child of ctx.children ?? []) walk(child, ruleNames, depth + 1, out);
        return;
    }

    out.push(indent + quote(ctx.getText()));
}

/** Escapes a token's text so one line of output stays one line. */
export function quote(text: string): string {
    let out = "'";
    for (const c of text) {
        switch (c) {
            case "\\": out += "\\\\"; break;
            case "'":  out += "\\'"; break;
            case "\n": out += "\\n"; break;
            case "\r": out += "\\r"; break;
            case "\t": out += "\\t"; break;
            default:   out += c;
        }
    }
    return out + "'";
}
