import { describe, it, expect } from 'vitest';
import { generateUserColor } from './SocketHandlers.js';

describe('SocketHandlers Helpers', () => {
  describe('generateUserColor', () => {
    it('returns consistent hex colors for the same user ID', () => {
      const color1 = generateUserColor('user-12345');
      const color2 = generateUserColor('user-12345');
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('returns a fallback valid hex color when user ID is null or undefined', () => {
      const colorNull = generateUserColor(null);
      const colorUndefined = generateUserColor(undefined);
      expect(colorNull).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colorUndefined).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('distributes colors across different users', () => {
      const colorA = generateUserColor('alice_id');
      const colorB = generateUserColor('bob_id');
      expect(colorA).toBeDefined();
      expect(colorB).toBeDefined();
    });
  });
});
