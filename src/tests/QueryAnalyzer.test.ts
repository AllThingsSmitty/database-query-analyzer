import { test } from 'node:test';
import * as assert from 'node:assert';
import { QueryAnalyzer } from '../analyzer/QueryAnalyzer';

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
});
