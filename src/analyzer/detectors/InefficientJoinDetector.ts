import { BaseDetector } from './BaseDetector.js';
import { Issue, QueryContext } from '../../types.js';

export class InefficientJoinDetector extends BaseDetector {
  detect(query: string, context: QueryContext): Issue[] {
    const issues: Issue[] = [];

    if (this.hasCrossJoin(context)) {
      issues.push(
        this.createIssue(
          'inefficient-join',
          'high',
          'CROSS JOIN detected - likely to produce very large result sets',
          query,
          'Verify CROSS JOIN is intentional; consider if explicit conditions can convert to INNER JOIN',
        ),
      );
    }

    if (this.hasMultipleLeftJoins(context)) {
      issues.push(
        this.createIssue(
          'inefficient-join',
          'medium',
          'Multiple LEFT JOINs may indicate inefficient join order',
          query,
          'Consider join order and use INNER JOIN where NULLs are not needed',
        ),
      );
    }

    if (this.hasJoinOnExpression(context)) {
      issues.push(
        this.createIssue(
          'inefficient-join',
          'medium',
          'JOIN condition is complex - may prevent proper index usage',
          query,
          'Simplify join conditions to direct column comparisons for better optimization',
        ),
      );
    }

    if (context.subqueries > 0 && context.joins.length > 0) {
      issues.push(
        this.createIssue(
          'inefficient-join',
          'low',
          'Subquery with JOINs may indicate opportunity for query simplification',
          query,
          'Flatten query structure using JOINs instead of subqueries when possible',
        ),
      );
    }

    return issues;
  }

  private hasCrossJoin(context: QueryContext): boolean {
    return context.joins.some(join => join.type === 'CROSS');
  }

  private hasMultipleLeftJoins(context: QueryContext): boolean {
    const leftJoinCount = context.joins.filter(j => j.type === 'LEFT').length;
    return leftJoinCount > 1;
  }

  private hasJoinOnExpression(context: QueryContext): boolean {
    return context.joins.some(join => {
      if (!join.condition) return false;
      return /(AND|OR|\+|-|\*|\/|CASE)/.test(join.condition);
    });
  }
}
