#!/usr/bin/env node

import { Command } from 'commander';
import { QueryAnalyzer } from './analyzer/QueryAnalyzer.js';
import { formatResults } from './cli/formatter.js';
import { readQueryFromFile, readQueryFromStdin } from './cli/input.js';

const program = new Command();

program
  .name('dqa')
  .description('Database Query Analyzer - Detect SQL anti-patterns and optimize queries')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze a SQL query for optimization opportunities')
  .argument('[query]', 'SQL query to analyze')
  .option('-f, --file <path>', 'Read query from file')
  .option('-j, --json', 'Output results as JSON')
  .action(async (query, options) => {
    try {
      let sqlQuery = query;

      if (options.file) {
        sqlQuery = await readQueryFromFile(options.file);
      } else if (!sqlQuery) {
        sqlQuery = await readQueryFromStdin();
      }

      const analyzer = new QueryAnalyzer();
      const result = analyzer.analyze(sqlQuery);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        formatResults(result);
      }

      process.exit(result.isValid && result.issues.length === 0 ? 0 : 1);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
