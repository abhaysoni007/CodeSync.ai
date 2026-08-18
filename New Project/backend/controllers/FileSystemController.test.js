import { describe, it, expect } from 'vitest';
import { decodeText, resolveProjectPath } from './FileSystemController.js';

const PROJECT = 'a'.repeat(24);

describe('decodeText', () => {
  it('reads plain utf-8', () => {
    expect(decodeText(Buffer.from('hello', 'utf-8'))).toBe('hello');
  });

  it('strips a utf-8 BOM', () => {
    expect(decodeText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hello')]))).toBe('hello');
  });

  it('reads UTF-16LE, which is what PowerShell redirects produce', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('hello', 'utf16le')]);
    expect(decodeText(buf)).toBe('hello');
  });

  it('reads UTF-16BE', () => {
    const body = Buffer.from('hello', 'utf16le');
    expect(decodeText(Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(body).swap16()]))).toBe('hello');
  });
});

describe('resolveProjectPath', () => {
  it('resolves a nested path inside the project', () => {
    const { parts } = resolveProjectPath(PROJECT, ['src', 'index.js']);
    expect(parts).toEqual(['src', 'index.js']);
  });

  it("drops a leading 'root' segment the tree sends", () => {
    expect(resolveProjectPath(PROJECT, ['root', 'src']).parts).toEqual(['src']);
  });

  it('refuses traversal', () => {
    expect(() => resolveProjectPath(PROJECT, ['..', 'server.js'])).toThrow(/Illegal path segment/);
    expect(() => resolveProjectPath(PROJECT, ['a/../../b'])).toThrow(/Illegal path segment/);
  });

  it('refuses a project id that is not an object id', () => {
    expect(() => resolveProjectPath('../../etc', ['x'])).toThrow(/Invalid project id/);
  });
});
