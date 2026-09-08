import { QueryContext } from '../types.js';
import { AstParser } from './AstParser.js';
import { RegexParser } from './RegexParser.js';

export class Parser {
  private astParser = new AstParser();
  private regexParser = new RegexParser();

  parse(query: string): QueryContext {
    // Try AST-based parser first for better accuracy
    try {
      return this.astParser.parse(query);
    } catch (astError) {
      // Fall back to regex parser for edge cases
      try {
        return this.regexParser.parse(query);
      } catch (regexError) {
        // If both fail, throw the AST error (primary parser)
        throw astError;
      }
    }
  }
}
