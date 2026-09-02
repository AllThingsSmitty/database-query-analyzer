import { BaseDetector } from './BaseDetector.js';
import { Issue, QueryContext } from '../../types.js';

export class MissingIndexDetector extends BaseDetector {
  detect(query: string, context: QueryContext): Issue[] {
    const issues: Issue[] = [];

    if (this.hasFullTableScan(query, context)) {
      issues.push(
        this.createIssue(
          'missing-index',
          'high',
          'Query may perform full table scan - no WHERE clause on large table',
          query,
          'Add WHERE clause or create index on frequently filtered columns',
        ),
      );
    }

    if (this.hasUnindexedJoinCondition(query, context)) {
      issues.push(
        this.createIssue(
          'missing-index',
          'high',
          'JOIN condition may lack index - check if join columns are indexed',
          query,
          'Create index on join columns for better performance',
        ),
      );
    }

    if (this.hasFunctionInWhereClause(query)) {
      issues.push(
        this.createIssue(
          'missing-index',
          'medium',
          'Functions in WHERE clause may prevent index usage',
          query,
          'Avoid functions on indexed columns; use indexed columns directly when possible',
        ),
      );
    }

    if (this.hasWildcardLikeClause(query)) {
      issues.push(
        this.createIssue(
          'missing-index',
          'medium',
          'Leading wildcard in LIKE clause may prevent index usage',
          query,
          'Restructure search pattern or use full-text search for better performance',
        ),
      );
    }

    return issues;
  }

  private hasFullTableScan(query: string, context: QueryContext): boolean {
    return !query.toUpperCase().includes('WHERE') && context.tables.length > 0;
  }

  private hasUnindexedJoinCondition(_query: string, context: QueryContext): boolean {
    return context.joins.length > 0 && context.tables.length > 1;
  }

  private hasFunctionInWhereClause(query: string): boolean {
    const whereMatch = query.match(/WHERE\s+(.+?)(?=GROUP|ORDER|LIMIT|;|$)/i);
    if (!whereMatch) return false;

    const whereClause = whereMatch[1];
    return /\b(UPPER|LOWER|SUBSTRING|LENGTH|ABS|YEAR|MONTH|DAY|DATE_FORMAT)\s*\(/i.test(whereClause);
  }

  private hasWildcardLikeClause(query: string): boolean {
    const likeMatch = query.match(/LIKE\s+['"]\%[^%]/gi);
    return likeMatch !== null;
  }
}
