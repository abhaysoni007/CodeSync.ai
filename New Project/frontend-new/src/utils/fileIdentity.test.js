import { describe, it, expect } from 'vitest';
import { fileIdFromPath, makeActiveFile } from './fileIdentity.js';

// WHY: the two file backends collided because the editor keyed files by Mongo `_id` while the
// file tree keys them by a `path` array of node ids. Unifying on ONE identity (the path) is the
// crux of the refactor, so we pin the contract here: the same tree file must yield the same id
// for every user (the naive `code-update` collab groups edits by that id).
describe('file identity', () => {
  it('derives a stable id by joining the path of node ids', () => {
    expect(fileIdFromPath(['root', 'src', 'index.js'])).toBe('root/src/index.js');
  });

  it('is deterministic — the same path always yields the same id', () => {
    const path = ['root', 'a', 'b'];
    expect(fileIdFromPath(path)).toBe(fileIdFromPath(['root', 'a', 'b']));
  });

  it('builds an editor file object carrying id, name, path and content', () => {
    const node = { id: 'x1', name: 'app.js', type: 'file', content: 'hello' };
    const path = ['root', 'x1'];
    const file = makeActiveFile(node, path);

    expect(file._id).toBe('root/x1');
    expect(file.name).toBe('app.js');
    expect(file.path).toEqual(['root', 'x1']);
    expect(file.content).toBe('hello');
  });

  it('defaults missing content to an empty string', () => {
    const file = makeActiveFile({ id: 'x1', name: 'empty.txt', type: 'file' }, ['root', 'x1']);
    expect(file.content).toBe('');
  });
});
