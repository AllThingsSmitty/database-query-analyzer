export type IssueType = 'n-plus-one' | 'missing-index' | 'inefficient-join';

export interface Issue {
  type: IssueType;
  severity: 'high' | 'medium' | 'low';
  message: string;
  query: string;
  lineNumber?: number;
  columnNumber?: number;
  suggestion?: string;
}

export interface AnalysisResult {
  query: string;
  issues: Issue[];
  isValid: boolean;
  parseError?: string;
}

export interface QueryContext {
  tables: string[];
  joins: JoinInfo[];
  subqueries: number;
  selectFields: FieldInfo[];
}

export interface JoinInfo {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  condition?: string;
}

export interface FieldInfo {
  field: string;
  table?: string;
  isAggregated: boolean;
}
