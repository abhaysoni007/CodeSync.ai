/**
 * The mirror is what lets the terminal run the files the editor shows, so the parts that can
 * silently ruin a project - pruning and path escapes - get a test.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { mirrorProjectToDisk } from './FileSystemController.js';

const PROJECT_ID = '__mirror_test__';
const diskDir = path.join(process.cwd(), 'projects', PROJECT_ID);
const manifest = path.join(process.cwd(), 'uploads', 'file-structures', `${PROJECT_ID}.mirror.json`);

const tree = (children) => ({ id: 'root', name: 'root', type: 'folder', children });
const file = (name, content) => ({ id: name, name, type: 'file', content });
const folder = (name, children) => ({ id: name, name, type: 'folder', children });

const read = (...segments) => fs.readFile(path.join(diskDir, ...segments), 'utf-8');
const exists = async (...segments) =>
  fs
    .access(path.join(diskDir, ...segments))
    .then(() => true)
    .catch(() => false);

afterEach(async () => {
  await fs.rm(diskDir, { recursive: true, force: true });
  await fs.rm(manifest, { force: true });
});

describe('mirrorProjectToDisk', () => {
  it('writes the tree out as real files', async () => {
    await mirrorProjectToDisk(PROJECT_ID, tree([folder('src', [file('main.py', 'print(1)')])]));

    expect(await read('src', 'main.py')).toBe('print(1)');
  });

  it('removes files that the tree no longer has', async () => {
    await mirrorProjectToDisk(PROJECT_ID, tree([file('gone.py', 'x = 1'), file('kept.py', 'y = 2')]));
    await mirrorProjectToDisk(PROJECT_ID, tree([file('kept.py', 'y = 2')]));

    expect(await exists('gone.py')).toBe(false);
    expect(await exists('kept.py')).toBe(true);
  });

  it('leaves files the user made in the terminal alone', async () => {
    await mirrorProjectToDisk(PROJECT_ID, tree([file('main.py', 'print(1)')]));
    // Stands in for build output, a venv, node_modules - things the mirror never wrote.
    await fs.writeFile(path.join(diskDir, 'output.log'), 'from a real run', 'utf-8');

    await mirrorProjectToDisk(PROJECT_ID, tree([file('main.py', 'print(2)')]));

    expect(await read('output.log')).toBe('from a real run');
    expect(await read('main.py')).toBe('print(2)');
  });

  it('refuses names that would escape the project directory', async () => {
    await mirrorProjectToDisk(
      PROJECT_ID,
      tree([file('..', 'nope'), file('../escape.txt', 'nope'), file('ok.txt', 'fine')])
    );

    expect(await read('ok.txt')).toBe('fine');
    const outside = await fs
      .access(path.join(process.cwd(), 'projects', 'escape.txt'))
      .then(() => true)
      .catch(() => false);
    expect(outside).toBe(false);
  });
});
