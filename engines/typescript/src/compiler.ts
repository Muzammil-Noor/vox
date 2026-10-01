import {
  CharStream,
  CommonTokenStream,
  ErrorListener,
  Recognizer,
  RecognitionException,
  Token,
} from "antlr4";
import VoxLexer from "./gen/VoxLexer.js";
import VoxParser from "./gen/VoxParser.js";
import { SemanticAnalyzer } from "./SemanticAnalyzer.js";
import { IRBuilder } from "./IRBuilder.js";
import { Diagnostic, formatDiagnostic } from "./diagnostics.js";
import { formatTokens, formatTree } from "./inspect.js";

export interface CompileResult {
  /** Empty when compilation succeeded. Messages look like "line 3:4 error: ...". */
  errors: string[];
  /** Non-fatal diagnostics, same shape as errors. */
  warnings: string[];
  /** Every error and warning with its source range, for editors. */
  diagnostics: Diagnostic[];
  /** The IR program or null when there were errors. */
  ir: string[] | null;
  /** False when the source did not parse, so no later stage ran at all. */
  parsed: boolean;
  /** Set only when `stages` was asked for: the pipeline's intermediate forms. */
  tokens: string[] | null;
  tree: string[] | null;
  symbols: string[] | null;
}

export interface CompileOptions {
  /**
   * Also capture the tokens, parse tree and symbol table, for showing the
   * pipeline rather than just its result. Off by default: the playground
   * compiles on every keystroke and does not always need them.
   */
  stages?: boolean;
}

/** Collects syntax errors, with the offending token's range, instead of printing them. */
class Collector extends ErrorListener<unknown> {
  readonly diagnostics: Diagnostic[] = [];

  override syntaxError(
    _recognizer: Recognizer<unknown>,
    offendingSymbol: unknown,
    line: number,
    column: number,
    msg: string,
    _e: RecognitionException | undefined,
  ): void {
    // Parser errors carry the token; lexer errors carry nothing usable.
    const token = offendingSymbol as Token | null | undefined;
    const text = token && token.type !== Token.EOF ? (token.text ?? "") : "";
    const length = Math.max(1, text.length);
    this.diagnostics.push({
      severity: "error",
      message: msg,
      line,
      column,
      endLine: line,
      endColumn: column + length,
    });
  }
}

/**
 * The front half of the pipeline: parse, check, lower. Pure - no I/O - so it
 * runs identically in Node, a browser or a worker.
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const stages = options.stages === true;
  const collector = new Collector();

  const lexer = new VoxLexer(new CharStream(source));
  lexer.removeErrorListeners();
  lexer.addErrorListener(collector);

  const stream = new CommonTokenStream(lexer);
  // Read every token up front so they can be shown even when the parse that
  // follows fails: a lexer that succeeded is worth seeing.
  stream.fill();
  const tokens = stages ? formatTokens(stream.tokens) : null;

  const parser = new VoxParser(stream);
  parser.removeErrorListeners();
  parser.addErrorListener(collector);

  const tree = parser.program();

  // Never build IR from a broken tree; it silently produces wrong programs.
  if (collector.diagnostics.length > 0) {
    return {
      errors: collector.diagnostics.map(formatDiagnostic),
      warnings: [],
      diagnostics: collector.diagnostics,
      ir: null,
      parsed: false,
      tokens,
      tree: null,
      symbols: null,
    };
  }

  const treeLines = stages ? formatTree(tree, parser) : null;

  const analyzer = new SemanticAnalyzer();
  analyzer.visit(tree);
  const symbols = stages ? analyzer.symbols : null;

  if (analyzer.errors.length > 0) {
    return {
      errors: analyzer.errors,
      warnings: analyzer.warnings,
      diagnostics: [...analyzer.diagnostics],
      ir: null,
      parsed: true,
      tokens,
      tree: treeLines,
      symbols,
    };
  }

  const builder = new IRBuilder();
  builder.visit(tree);
  return {
    errors: [],
    warnings: analyzer.warnings,
    diagnostics: [...analyzer.diagnostics],
    ir: builder.instructions,
    parsed: true,
    tokens,
    tree: treeLines,
    symbols,
  };
}
