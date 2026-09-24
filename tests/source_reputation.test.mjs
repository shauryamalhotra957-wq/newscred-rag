import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SourceReputationScorer } from '../src/utils/source_reputation.js';

describe('SourceReputationScorer Test Suite', () => {
  test('trusted institutional TLDs receive high credibility score', () => {
    const score = SourceReputationScorer.scoreDomain('nih.gov');
    assert.ok(score >= 80.0);
  });

  test('suspicious domain patterns receive severe penalty', () => {
    const score = SourceReputationScorer.scoreDomain('breaking-clickbait-today.xyz');
    assert.ok(score <= 20.0);
  });

  test('empty domain returns zero', () => {
    assert.strictEqual(SourceReputationScorer.scoreDomain(''), 0.0);
  });
});
