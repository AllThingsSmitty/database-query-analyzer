import { BaseDetector } from './BaseDetector.js';
import { Issue, QueryContext } from '../../types.js';

export class N1Detector extends BaseDetector {
  detect(query: string, context: QueryContext): Issue[] {
    const issues: Issue[] = [];

    if (this.hasParameterizedWhereClause(query)) {
      issues.push(
        this.createIssue(
          'n-plus-one',
          'high',
          'Query contains WHERE clause with parameter substitution - potential N+1 pattern in loop',
          query,
          'Consider using IN clause or JOIN instead of parameterized WHERE conditions',
        ),
      );
    }

    if (context.subqueries > 0 && this.hasMultipleCorrelatedSubqueries(query)) {
      issues.push(
        this.createIssue(
          'n-plus-one',
          'high',
          'Multiple correlated subqueries detected - indicates N+1 pattern',
          query,
          'Use JOINs instead of correlated subqueries for better performance',
        ),
      );
    }

    if (context.selectFields.some(f => f.isAggregated) && context.subqueries > 0) {
      issues.push(
        this.createIssue(
          'n-plus-one',
          'medium',
          'Aggregated fields with subqueries may indicate N+1 pattern',
          query,
          'Verify that aggregations are not being computed separately per row',
        ),
      );
    }

    return issues;
  }

  private hasParameterizedWhereClause(query: string): boolean {
    const whereMatch = query.match(/WHERE\s+(.+?)(?=GROUP|ORDER|LIMIT|;|$)/i);
    if (!whereMatch) return false;

    const whereClause = whereMatch[1];
    return /=\s*\?|=\s*\$\d+|=\s*@\w+|=\s*:\w+/.test(whereClause);
  }

  private hasMultipleCorrelatedSubqueries(query: string): boolean {
    const subqueryCount = (query.match(/WHERE\s+.+?\(\s*SELECT/gi) || []).length;
    return subqueryCount > 1;
  }
}
