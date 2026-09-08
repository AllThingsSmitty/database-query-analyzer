import { parse as parseSQL, SelectStmt, DialectName } from 'sql-parser-cst';
import { QueryContext, JoinInfo, FieldInfo } from '../types.js';

export class AstParser {
  private dialect: DialectName = 'postgresql';

  parse(query: string): QueryContext {
    try {
      const program = parseSQL(query, { dialect: this.dialect });

      if (!program.statements || program.statements.length === 0) {
        throw new Error('No valid SQL statements found');
      }

      const stmt = program.statements[0];
      if (stmt.type !== 'select_stmt') {
        throw new Error('Only SELECT statements are currently supported');
      }

      return this.extractQueryContext(stmt as SelectStmt);
    } catch (error) {
      throw new Error(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractQueryContext(stmt: SelectStmt): QueryContext {
    return {
      tables: this.extractTables(stmt),
      joins: this.extractJoins(stmt),
      subqueries: this.countSubqueries(stmt),
      selectFields: this.extractSelectFields(stmt),
    };
  }

  private extractTables(stmt: SelectStmt): string[] {
    const tables: string[] = [];

    for (const clause of stmt.clauses) {
      if (clause.type === 'from_clause') {
        const from = clause as any;
        const expr = from.expr;

        if (expr?.type === 'join_expr') {
          // Handle join expressions (CROSS JOIN, etc)
          const names = this.extractTablesFromJoinExpr(expr);
          tables.push(...names);
        } else if (Array.isArray(expr)) {
          // Handle array of tables
          for (const item of expr) {
            const name = this.getTableName(item);
            if (name) tables.push(name);
          }
        } else if (expr) {
          // Handle single table
          const name = this.getTableName(expr);
          if (name) tables.push(name);
        }
      }
    }

    return tables;
  }

  private extractTablesFromJoinExpr(expr: any): string[] {
    const tables: string[] = [];

    if (expr.left) {
      if (expr.left.type === 'join_expr') {
        tables.push(...this.extractTablesFromJoinExpr(expr.left));
      } else {
        const name = this.getTableName(expr.left);
        if (name) tables.push(name);
      }
    }

    if (expr.right) {
      if (expr.right.type === 'join_expr') {
        tables.push(...this.extractTablesFromJoinExpr(expr.right));
      } else {
        const name = this.getTableName(expr.right);
        if (name) tables.push(name);
      }
    }

    return tables;
  }

  private getTableName(item: any): string | null {
    if (!item) return null;

    if (item.type === 'identifier' && item.name) {
      return item.name;
    }
    if (item.name?.name) {
      return item.name.name;
    }
    if (item.name && typeof item.name === 'string') {
      return item.name;
    }

    return null;
  }

  private extractJoins(stmt: SelectStmt): JoinInfo[] {
    const joins: JoinInfo[] = [];

    for (const clause of stmt.clauses) {
      if (clause.type === 'from_clause') {
        const from = clause as any;
        const expr = from.expr;

        if (expr?.type === 'join_expr') {
          // Handle join expressions
          this.extractJoinsFromJoinExpr(expr, joins);
        } else if (Array.isArray(expr)) {
          // Handle array of tables with joins
          for (const item of expr) {
            if (!item || !('joins' in item)) {
              continue;
            }
            this.extractJoinsFromArray(item.joins, joins);
          }
        }
      }
    }

    return joins;
  }

  private extractJoinsFromJoinExpr(expr: any, joins: JoinInfo[]): void {
    if (!expr) return;

    // Check if this is a binary join
    if (expr.left && expr.right && expr.operator) {
      // Extract the join type from operator keywords
      const joinType = this.extractJoinTypeFromOperator(expr.operator);

      // Get the right table
      const table = expr.right.type === 'join_expr'
        ? null
        : this.getTableName(expr.right);

      if (table) {
        const condition = expr.on ? this.nodeToString(expr.on) : undefined;
        joins.push({
          table,
          type: joinType,
          condition,
        });
      }

      // Recursively handle nested joins on the left
      if (expr.left.type === 'join_expr') {
        this.extractJoinsFromJoinExpr(expr.left, joins);
      }
    }
  }

  private extractJoinsFromArray(itemJoins: any, joins: JoinInfo[]): void {
    if (!itemJoins) return;

    const joinArray = Array.isArray(itemJoins) ? itemJoins : [itemJoins];
    for (const join of joinArray) {
      if (!join) continue;

      const table = this.getTableName(join.from || join.table);
      if (!table) continue;

      const joinType = join.type ? this.extractJoinType(join.type) : ('INNER' as const);
      const condition = join.on ? this.nodeToString(join.on) : undefined;

      joins.push({
        table,
        type: joinType,
        condition,
      });
    }
  }

  private extractJoinTypeFromOperator(operator: any[]): 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' {
    if (!Array.isArray(operator)) {
      return 'INNER';
    }

    const typeStr = operator.map((op: any) => op.name || op.text || '').join(' ').toUpperCase();

    if (typeStr.includes('CROSS')) return 'CROSS';
    if (typeStr.includes('FULL')) return 'FULL';
    if (typeStr.includes('RIGHT')) return 'RIGHT';
    if (typeStr.includes('LEFT')) return 'LEFT';
    return 'INNER';
  }

  private extractJoinType(type: any): 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' {
    if (!type) return 'INNER';

    const typeStr = typeof type === 'string' ? type : (type.value || type.type || '').toString().toUpperCase();

    if (typeStr.includes('CROSS')) return 'CROSS';
    if (typeStr.includes('FULL')) return 'FULL';
    if (typeStr.includes('RIGHT')) return 'RIGHT';
    if (typeStr.includes('LEFT')) return 'LEFT';
    return 'INNER';
  }

  private countSubqueries(stmt: any): number {
    let count = 0;

    const traverse = (node: any): void => {
      if (!node) return;

      if (node.type === 'select_stmt') {
        count++;
      }

      if (Array.isArray(node)) {
        node.forEach(traverse);
      } else if (typeof node === 'object') {
        Object.values(node).forEach(traverse);
      }
    };

    traverse(stmt);
    return Math.max(0, count - 1);
  }

  private extractSelectFields(stmt: SelectStmt): FieldInfo[] {
    const fields: FieldInfo[] = [];

    for (const clause of stmt.clauses) {
      if (clause.type === 'select_clause') {
        const select = clause as any;
        const items = select.items;
        if (!items) continue;

        const itemArray = Array.isArray(items) ? items : [items];

        for (const item of itemArray) {
          if (!item) continue;

          if (item.type === 'select_all') {
            fields.push({
              field: '*',
              table: undefined,
              isAggregated: false,
            });
            continue;
          }

          const expr = item.expr;
          if (!expr) continue;

          const alias = item.alias?.name || this.extractFieldName(expr);
          const isAggregated = this.isAggregateFunction(expr);
          const table = (expr.table?.name || expr.table) as string | undefined;

          fields.push({
            field: alias || '*',
            table,
            isAggregated,
          });
        }
      }
    }

    return fields;
  }

  private extractFieldName(expr: any): string {
    if (!expr) return '*';

    if (expr.type === 'identifier' && expr.name) {
      return expr.name;
    }
    if (expr.name && typeof expr.name === 'string') {
      return expr.name;
    }

    return this.nodeToString(expr);
  }

  private isAggregateFunction(expr: any): boolean {
    if (!expr || expr.type !== 'function_call') {
      return false;
    }

    const funcName = (expr.function?.name || expr.name || '').toString().toUpperCase();
    return ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP_CONCAT', 'ARRAY_AGG'].includes(funcName);
  }

  private nodeToString(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (node.name && typeof node.name === 'string') return node.name;
    if (node.value !== undefined) return String(node.value);

    return '';
  }
}
