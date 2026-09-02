import { QueryContext, JoinInfo, FieldInfo } from '../types';

export class Parser {
  parse(query: string): QueryContext {
    const normalized = this.normalizeQuery(query);

    return {
      tables: this.extractTables(normalized),
      joins: this.extractJoins(normalized),
      subqueries: this.countSubqueries(normalized),
      selectFields: this.extractSelectFields(normalized),
    };
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private extractTables(query: string): string[] {
    const tables: string[] = [];
    const fromMatch = query.match(/FROM\s+([a-zA-Z0-9_,\s]+?)(?=WHERE|JOIN|GROUP|ORDER|LIMIT|;|$)/i);

    if (fromMatch) {
      const tableList = fromMatch[1]
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      tables.push(...tableList);
    }

    return tables;
  }

  private extractJoins(query: string): JoinInfo[] {
    const joins: JoinInfo[] = [];
    const joinPattern = /(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([a-zA-Z0-9_]+)\s+(?:ON|USING)\s*([^\n]+?)(?=WHERE|JOIN|GROUP|ORDER|LIMIT|;|$)/gi;

    let match;
    while ((match = joinPattern.exec(query)) !== null) {
      joins.push({
        table: match[2].trim(),
        type: (match[1]?.toUpperCase() || 'INNER') as any,
        condition: match[3]?.trim(),
      });
    }

    return joins;
  }

  private countSubqueries(query: string): number {
    const subqueryPattern = /\(\s*SELECT\b/gi;
    const matches = query.match(subqueryPattern);
    return matches ? matches.length : 0;
  }

  private extractSelectFields(query: string): FieldInfo[] {
    const fields: FieldInfo[] = [];
    const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);

    if (selectMatch) {
      const fieldList = selectMatch[1]
        .split(',')
        .map(f => f.trim());

      for (const field of fieldList) {
        const isAggregated = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(field);
        const [table, name] = field.includes('.')
          ? field.split('.').map(p => p.trim())
          : [undefined, field];

        fields.push({
          field: name || field,
          table,
          isAggregated,
        });
      }
    }

    return fields;
  }
}
