import { Issue, QueryContext } from '../../types.js';

export abstract class BaseDetector {
  abstract detect(query: string, context: QueryContext): Issue[];

  protected createIssue(
    type: 'n-plus-one' | 'missing-index' | 'inefficient-join',
    severity: 'high' | 'medium' | 'low',
    message: string,
    query: string,
    suggestion?: string,
  ): Issue {
    return {
      type,
      severity,
      message,
      query,
      suggestion,
    };
  }
}
