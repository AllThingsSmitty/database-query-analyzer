import { AnalysisResult, Issue, IssueType } from '../types.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

const VERSION = '0.1.0';
const DIVIDER = '━'.repeat(71);
const BOX_WIDTH = 71;

interface Statistics {
  total: number;
  byType: Record<IssueType, number>;
  bySeverity: Record<string, number>;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function formatResults(result: AnalysisResult): void {
  if (!result.isValid) {
    printHeader();
    console.log(`\n${colors.red}✗ Parse Error${colors.reset}`);
    console.log(`  ${result.parseError}`);
    return;
  }

  printHeader();

  if (result.issues.length === 0) {
    console.log(`\n${colors.green}✓ No issues found${colors.reset}\n`);
    return;
  }

  console.log(`\n${colors.bright}📊 Analysis Results${colors.reset}`);
  console.log(DIVIDER);

  const groupedByType = groupIssuesByType(result.issues);
  const allTypes: IssueType[] = ['n-plus-one', 'missing-index', 'inefficient-join'];

  let issueNumber = 1;
  for (const type of allTypes) {
    const issues = groupedByType[type] || [];
    const icon = getIconForType(type);
    const typeLabel = formatTypeLabel(type);

    console.log(`\n${icon} ${typeLabel} (${issues.length} issue${issues.length !== 1 ? 's' : ''})`);

    if (issues.length > 0) {
      for (const issue of issues) {
        const severityColor = getSeverityColor(issue.severity);
        const severityBullet = getSeverityBullet(issue.severity);

        console.log(
          `  [${issueNumber}] ${severityColor}${severityBullet} ${issue.severity.toUpperCase().padEnd(6)}${colors.reset} ${issue.message}`,
        );

        if (issue.suggestion) {
          const suggestionLines = wrapText(issue.suggestion, 65);
          console.log(`      ${colors.cyan}💡${colors.reset} ${suggestionLines.join(`\n         `)}`);
        }
        issueNumber++;
      }
    } else {
      console.log(`  ${colors.dim}No issues detected${colors.reset}`);
    }
  }

  const stats = calculateStatistics(result.issues);
  printStatistics(stats);
}

function printHeader(): void {
  const headerText = `  🔍 Database Query Analyzer v${VERSION}  `;
  const paddingTotal = BOX_WIDTH - headerText.length;
  const paddingLeft = Math.floor(paddingTotal / 2);
  const paddingRight = paddingTotal - paddingLeft;

  console.log(`${colors.bright}┌${'─'.repeat(BOX_WIDTH)}┐${colors.reset}`);
  console.log(`${colors.bright}│${' '.repeat(paddingLeft)}${headerText}${' '.repeat(paddingRight)}│${colors.reset}`);
  console.log(`${colors.bright}└${'─'.repeat(BOX_WIDTH)}┘${colors.reset}`);
}

function printStatistics(stats: Statistics): void {
  console.log(`\n${DIVIDER}`);
  console.log(`\n${colors.bright}📈 Summary${colors.reset}`);

  const severityEmoji: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
  };

  console.log(`  ${colors.bright}•${colors.reset} Total Issues: ${stats.total}`);
  console.log(
    `  ${colors.bright}•${colors.reset} High Priority: ${stats.bySeverity['high'] || 0}   ${severityEmoji['high']}`,
  );
  console.log(
    `  ${colors.bright}•${colors.reset} Medium Priority: ${stats.bySeverity['medium'] || 0} ${severityEmoji['medium']}`,
  );
  console.log(
    `  ${colors.bright}•${colors.reset} Low Priority: ${stats.bySeverity['low'] || 0}    ${severityEmoji['low']}`,
  );
  console.log(`  ${colors.bright}•${colors.reset} Query Complexity: ${stats.complexity}`);

  console.log(`\n${DIVIDER}\n`);
}

function calculateStatistics(issues: Issue[]): Statistics {
  const stats: Statistics = {
    total: issues.length,
    byType: {
      'n-plus-one': 0,
      'missing-index': 0,
      'inefficient-join': 0,
    },
    bySeverity: {
      high: 0,
      medium: 0,
      low: 0,
    },
    complexity: 'LOW',
  };

  for (const issue of issues) {
    stats.byType[issue.type]++;
    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
  }

  // Determine complexity based on issue count and severity
  if (stats.bySeverity['high'] > 0) {
    stats.complexity = 'HIGH';
  } else if (stats.bySeverity['medium'] > 1 || stats.total > 3) {
    stats.complexity = 'MEDIUM';
  } else {
    stats.complexity = 'LOW';
  }

  return stats;
}

function groupIssuesByType(issues: Issue[]): Record<string, Issue[]> {
  return issues.reduce(
    (acc, issue) => {
      if (!acc[issue.type]) {
        acc[issue.type] = [];
      }
      acc[issue.type].push(issue);
      return acc;
    },
    {} as Record<string, Issue[]>,
  );
}

function getIconForType(type: IssueType): string {
  const icons: Record<IssueType, string> = {
    'n-plus-one': '⚡',
    'missing-index': '🔍',
    'inefficient-join': '🔗',
  };
  return icons[type];
}

function formatTypeLabel(type: IssueType): string {
  const labels: Record<IssueType, string> = {
    'n-plus-one': 'N+1 Queries',
    'missing-index': 'Missing Indexes',
    'inefficient-join': 'Inefficient Joins',
  };
  return labels[type];
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
  const severityColors: Record<string, string> = {
    high: colors.red,
    medium: colors.yellow,
    low: colors.blue,
  };
  return severityColors[severity];
}

function getSeverityBullet(severity: 'high' | 'medium' | 'low'): string {
  const bullets: Record<string, string> = {
    high: '●',
    medium: '◐',
    low: '○',
  };
  return bullets[severity];
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
}
