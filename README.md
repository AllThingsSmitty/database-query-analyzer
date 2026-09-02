# Database Query Analyzer

A static analysis tool that helps backend teams detect SQL anti-patterns and optimize database queries before they hit production.

## Features

- **N+1 Query Detection**: Identify recursive database calls in hot paths
- **Missing Index Detection**: Flag queries that could benefit from database indexes
- **Inefficient Join Analysis**: Spot poorly-structured or suboptimal query patterns
- **Static Analysis**: Works with code as written (no runtime instrumentation needed)
- **Clean CLI Output**: Production-grade interface with clear, actionable insights

## Installation

```bash
npm install -g database-query-analyzer
```

Or use directly with npm:

```bash
npm install database-query-analyzer
```

## Quick Start

### Analyze a query from the command line

```bash
dqa analyze "SELECT * FROM users WHERE id = ?"
```

### Analyze a query from a file

```bash
dqa analyze -f query.sql
```

### Analyze a query from stdin

```bash
cat query.sql | dqa analyze
```

### Get JSON output

```bash
dqa analyze "SELECT * FROM users WHERE id = ?" --json
```

## Development

### Setup

```bash
npm install
npm run build
npm run dev
```

### Running Tests

```bash
npm test
npm run test:watch
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## How It Works

The analyzer performs static analysis on SQL queries to detect common performance anti-patterns:

### N+1 Query Detection
Detects parameterized WHERE clauses and correlated subqueries that indicate potential N+1 patterns in application code.

### Missing Index Detection
Flags queries that perform full table scans, have functions in WHERE clauses, or use leading wildcards in LIKE patterns.

### Inefficient Join Analysis
Identifies CROSS JOINs, multiple LEFT JOINs, and complex join conditions that may prevent proper query optimization.

## Roadmap

### MVP (Current)
- ✅ SQL parsing and AST analysis
- ✅ N+1 detection heuristics
- ✅ Missing index flagging
- ✅ Inefficient join detection
- ✅ CLI tool
- ✅ Basic documentation

### Post-MVP
- [ ] VS Code extension
- [ ] Web UI option
- [ ] Database-specific optimizations (PostgreSQL, MySQL, etc.)
- [ ] Custom rule definitions
- [ ] Team sharing / report generation
- [ ] CI/CD pipeline integration

## License

MIT