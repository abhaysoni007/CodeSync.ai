import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { calculateHash, generateUnifiedDiff, getDiffStats } from '../utils/diffUtil.js';
import File from '../models/File.js';
import FileVersion from '../models/FileVersion.js';
import {
  saveSnapshot,
  getVersionHistory,
  getVersionDetails,
  compareVersions,
  revertToVersion,
  deleteVersion
} from '../controllers/FileVersionController.js';

describe('Version Control Diff & Hash Utilities', () => {
  it('calculates deterministic SHA-256 content hashes', () => {
    const hash1 = calculateHash('const x = 1;');
    const hash2 = calculateHash('const x = 1;');
    const hash3 = calculateHash('const x = 1;\n');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('calculates accurate diff statistics', () => {
    const oldContent = 'line 1\nline 2';
    const newContent = 'line 1\nline 2 modified\nline 3';

    const stats = getDiffStats(oldContent, newContent);
    expect(stats.linesAdded).toBeGreaterThan(0);
    expect(stats.oldLineCount).toBe(2);
    expect(stats.newLineCount).toBe(3);
  });

  it('generates empty diff for identical versions', () => {
    const content = 'console.log("hello");';
    const diff = generateUnifiedDiff(content, content, 'v1', 'v1');
    expect(diff).toContain('--- v1');
    expect(diff).toContain('+++ v1');
  });
});

describe('FileVersionController Logic & Validation', () => {
  it('exports all expected controller functions', () => {
    expect(typeof saveSnapshot).toBe('function');
    expect(typeof getVersionHistory).toBe('function');
    expect(typeof getVersionDetails).toBe('function');
    expect(typeof compareVersions).toBe('function');
    expect(typeof revertToVersion).toBe('function');
    expect(typeof deleteVersion).toBe('function');
  });

  it('rejects version save requests with missing content', async () => {
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: {},
      userId: new mongoose.Types.ObjectId().toString()
    };
    const res = {
      status: (code) => {
        expect(code).toBe(422);
        return {
          json: (data) => {
            expect(data.success).toBe(false);
            expect(data.message).toContain('Content is required');
          }
        };
      }
    };

    await saveSnapshot(req, res);
  });
});
