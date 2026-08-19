import { describe, it, expect } from 'vitest';
import { runnerFor, isRunnable, isPreviewable, extensionOf } from './runners.js';

describe('runners utility', () => {
  describe('extensionOf', () => {
    it('extracts lowercased file extensions correctly', () => {
      expect(extensionOf('index.JS')).toBe('js');
      expect(extensionOf('App.test.tsx')).toBe('tsx');
      expect(extensionOf('README')).toBe('readme');
    });
  });

  describe('runnerFor', () => {
    it('builds node command for JavaScript files', () => {
      const runner = runnerFor('main.js', 'src/main.js');
      expect(runner).toEqual({ kind: 'terminal', command: 'node "src/main.js"' });
    });

    it('builds python command for Python files', () => {
      const runner = runnerFor('script.py', 'src/script.py');
      expect(runner).toEqual({ kind: 'terminal', command: 'python "src/script.py"' });
    });

    it('identifies HTML and SVG as browser previewable', () => {
      expect(runnerFor('index.html', 'index.html')).toEqual({ kind: 'browser' });
      expect(isPreviewable('index.html')).toBe(true);
      expect(isPreviewable('icon.svg')).toBe(true);
      expect(isPreviewable('script.js')).toBe(false);
    });

    it('returns null for unrunnable files like plain text or markdown', () => {
      expect(runnerFor('README.md', 'README.md')).toBeNull();
      expect(isRunnable('README.md')).toBe(false);
    });
  });
});
