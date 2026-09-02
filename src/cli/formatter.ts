import { AnalysisResult } from '../types.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

export function formatResults(result: AnalysisResult): void {
  if (!result.isValid) {
    console.log(`${colors.red}✗ Parse Error${colors.reset}`);
    console.log(`  ${result.parseError}`);
    return;
  }

  if (result.issues.length === 0) {
    console.log(`${colors.green}✓ No issues found${colors.reset}`);
    return;
  }

  console.log(`${colors.bright}Analysis Results${colors.reset}`);
  console.log(`${colors.gray}────────────────────────────────${colors.reset}`);

  const groupedByType = groupIssuesByType(result.issues);

  for (const [type, issues] of Object.entries(groupedByType)) {
    const icon = getIconForType(type as any);
    const typeLabel = formatTypeLabel(type as any);
    console.log(`\n${icon} ${typeLabel} (${issues.length})`);
    console.log(`${colors.gray}──────────────────${colors.reset}`);

    for (const issue of issues) {
      const severityColor = getSeverityColor(issue.severity);
      console.log(`  ${severityColor}${issue.severity.toUpperCase()}${colors.reset}: ${issue.message}`);

      if (issue.suggestion) {
        console.log(`  ${colors.cyan}→${colors.reset} ${issue.suggestion}`);
      }
      console.log();
    }
  }

  const summary = `Found ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}`;
  console.log(`${colors.gray}${summary}${colors.reset}`);
}

function groupIssuesByType(
  issues: any[],
): Record<string, any[]> {
  return issues.reduce(
    (acc, issue) => {
      if (!acc[issue.type]) {
        acc[issue.type] = [];
      }
      acc[issue.type].push(issue);
      return acc;
    },
    {} as Record<string, any[]>,
  );
}

function getIconForType(type: 'n-plus-one' | 'missing-index' | 'inefficient-join'): string {
  const icons: Record<string, string> = {
    'n-plus-one': '⚡',
    'missing-index': '🔍',
    'inefficient-join': '🔗',
  };
  return icons[type] || '•';
}

function formatTypeLabel(type: 'n-plus-one' | 'missing-index' | 'inefficient-join'): string {
  const labels: Record<string, string> = {
    'n-plus-one': 'N+1 Queries',
    'missing-index': 'Missing Indexes',
    'inefficient-join': 'Inefficient Joins',
  };
  return labels[type] || type;
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
  const colors_map: Record<string, string> = {
    high: colors.red,
    medium: colors.yellow,
    low: colors.blue,
  };
  return colors_map[severity] || colors.reset;
}
