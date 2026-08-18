/**
 * Watch a project directory and tell its room when anything on disk changes.
 *
 * WHY: the editor writes files over HTTP, the shell writes them directly, and a dev server writes
 * build output on its own schedule. Only the filesystem sees all three, so the filesystem is what
 * we watch - anything else (relaying UI events, sniffing terminal output) can only ever report the
 * changes it happens to be told about.
 *
 * Uses stdlib `fs.watch` with `recursive: true`, supported on Windows, macOS and - since Node 20 -
 * Linux. No extra dependency.
 *
 * ponytail: one recursive watcher per project, ref-counted by room membership, and a single
 * "something changed" event rather than a per-path diff. Clients answer it by refetching the tree,
 * which is cheap. Send per-path events only if refetch ever shows up in a profile.
 */

import fs from 'fs';
import path from 'path';
import { projectDiskDir } from '../controllers/FileSystemController.js';

// projectId -> { watcher, refs, timer }
const watchers = new Map();

// Churn that is noise, not news: writing node_modules during an install would otherwise emit
// thousands of events, and a lock/swap file is never something the user wants to see.
const IGNORED = /(^|[\\/])(\.git|node_modules|\.next|\.cache|__pycache__)([\\/]|$)|~$|\.swp$|\.tmp$/;

const DEBOUNCE_MS = 400;

export const startWatching = (io, projectId) => {
  const existing = watchers.get(projectId);
  if (existing) {
    existing.refs += 1;
    return;
  }

  const dir = projectDiskDir(projectId);
  if (!fs.existsSync(dir)) return;

  const entry = { refs: 1, timer: null, watcher: null };

  const notify = () => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      io.to(`project:${projectId}`).emit('filesystem:changed', { projectId, reason: 'disk' });
    }, DEBOUNCE_MS);
  };

  try {
    entry.watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
      if (filename && IGNORED.test(filename)) return;
      notify();
    });
    // A watcher error (the directory was deleted, a handle limit was hit) must not take the
    // process down with it.
    entry.watcher.on('error', (error) => {
      console.error(`[Watcher] ${projectId}:`, error.message);
      stopWatchingAll(projectId);
    });
  } catch (error) {
    console.error(`[Watcher] could not watch ${dir}:`, error.message);
    return;
  }

  watchers.set(projectId, entry);
  console.log(`[Watcher] watching ${path.basename(dir)}`);
};

export const stopWatching = (projectId) => {
  const entry = watchers.get(projectId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  stopWatchingAll(projectId);
};

export const stopWatchingAll = (projectId) => {
  const entry = watchers.get(projectId);
  if (!entry) return;
  clearTimeout(entry.timer);
  try {
    entry.watcher?.close();
  } catch {
    /* already closed */
  }
  watchers.delete(projectId);
};

export default { startWatching, stopWatching, stopWatchingAll };
