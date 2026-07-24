import { describe, it, expect } from 'vitest';
import { formatTimestamp } from './timeUtils.js';

// Smoke test for the real relative-time formatter used across the activity timeline / chat.
// Uses offsets from "now" so it doesn't depend on a fixed clock.
describe('formatTimestamp', () => {
  const secondsAgo = (s) => Date.now() - s * 1000;

  it('shows "just now" for very recent timestamps', () => {
    expect(formatTimestamp(secondsAgo(5))).toBe('just now');
  });

  it('pluralises minutes correctly', () => {
    expect(formatTimestamp(secondsAgo(60))).toBe('1 minute ago');
    expect(formatTimestamp(secondsAgo(180))).toBe('3 minutes ago');
  });

  it('reports hours for older-but-same-day timestamps', () => {
    expect(formatTimestamp(secondsAgo(2 * 3600))).toBe('2 hours ago');
  });
});
