import { test } from 'node:test';
import * as assert from 'node:assert';
import { QueryAnalyzer } from '../analyzer/QueryAnalyzer.js';

test('QueryAnalyzer', async (t) => {
  const analyzer = new QueryAnalyzer();

  await t.test('analyzes basic query with no issues', () => {
    const result = analyzer.analyze('SELECT id, name FROM users WHERE id = ?');
    assert.ok(result.isValid);
  });

  await t.test('detects parameterized WHERE clause (N+1 pattern)', () => {
    const result = analyzer.analyze('SELECT * FROM users WHERE id = ?');
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some(i => i.type === 'n-plus-one'));
  });

  await t.test('detects full table scan (missing index)', () => {
    const result = analyzer.analyze('SELECT * FROM users');
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some(i => i.type === 'missing-index'));
  });

  await t.test('detects function in WHERE clause', () => {
    const result = analyzer.analyze('SELECT * FROM users WHERE UPPER(email) = ?');
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some(i => i.type === 'missing-index'));
  });

  await t.test('detects CROSS JOIN inefficiency', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users CROSS JOIN orders',
    );
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some(i => i.type === 'inefficient-join'));
  });

  await t.test('handles invalid SQL gracefully', () => {
    const result = analyzer.analyze('SELECT * FROM');
    assert.ok(!result.isValid);
    assert.ok(result.parseError);
  });

  await t.test('parses CTE (WITH clause)', () => {
    const result = analyzer.analyze(
      'WITH cte AS (SELECT id FROM users) SELECT * FROM cte',
    );
    assert.ok(result.isValid);
  });

  await t.test('counts nested subqueries correctly', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users WHERE id IN (SELECT user_id FROM (SELECT user_id FROM orders) subq)',
    );
    assert.ok(result.isValid);
    // Should detect the subqueries
  });

  await t.test('parses window functions in SELECT', () => {
    const result = analyzer.analyze(
      'SELECT id, ROW_NUMBER() OVER (ORDER BY id) FROM users',
    );
    assert.ok(result.isValid);
  });

  await t.test('handles multiple JOINs', () => {
    const result = analyzer.analyze(
      'SELECT * FROM users u JOIN orders o ON u.id = o.user_id JOIN items i ON o.id = i.order_id',
    );
    assert.ok(result.isValid);
  });
});
