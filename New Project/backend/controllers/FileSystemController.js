/**
 * Project filesystem.
 *
 * WHY THIS IS DISK-BACKED: the previous version kept the tree as one JSON blob in
 * uploads/file-structures/<id>.json and mirrored it *out* to disk so the terminal had something to
 * run. Nothing ever read back, so everything the shell produced - `npm install`, `mkdir`, build
 * output, a cloned repo - existed on disk but was invisible in the explorer, and a mirror refresh
 * could delete it. There is now exactly one source of truth: the real directory. The editor reads
 * and writes the same bytes the shell sees.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/** Where a project's files live. This is also the terminal's cwd. */
export const projectDiskDir = (projectId) => path.join(process.cwd(), 'projects', projectId);

// Project ids come from the URL. Anything but a Mongo-style id could walk out of projects/.
const isSafeProjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

// Directories that are real but not worth walking: one npm install is 30k files and would make
// every tree fetch enormous. They still appear in the tree (that is the whole point of the
// rewrite), they are just not expanded.
// ponytail: fixed skip list + entry cap. Swap for lazy per-folder loading if users need to browse
// inside node_modules.
const NO_DESCEND = new Set([
  'node_modules', '.git', '.venv', 'venv', '__pycache__', '.next', '.cache', 'dist', 'build',
]);
const MAX_ENTRIES = 5000;

/**
 * Resolve a client-supplied path (array of names, optionally led by 'root') to an absolute path
 * that is provably inside the project directory.
 */
export const resolveProjectPath = (projectId, segments = []) => {
  if (!isSafeProjectId(projectId)) throw new Error('Invalid project id');
  const root = projectDiskDir(projectId);
  const parts = (Array.isArray(segments) ? segments : [segments])
    .filter((s) => s !== undefined && s !== null && s !== '')
    .map(String);
  if (parts[0] === 'root') parts.shift();
  for (const part of parts) {
    if (part === '.' || part === '..' || part.includes('/') || part.includes('\\')) {
      throw new Error(`Illegal path segment: ${part}`);
    }
  }
  const target = path.resolve(root, ...parts);
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes project');
  return { root, target, parts };
};

const ensureDir = (dir) => fs.mkdir(dir, { recursive: true });

/** A brand-new project should not open on an empty pane. */
const SEED = {
  'README.md': '# Welcome to your project\n\nStart building something amazing!\n',
  'index.html':
    '<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n    <title>My Page</title>\n' +
    '  </head>\n  <body>\n    <h1>Hello from CodeSync</h1>\n' +
    '    <script src="src/index.js"></script>\n  </body>\n</html>\n',
  'src/index.js': '// Start coding here\nconsole.log("Hello World!");\n',
};

const ensureProjectDir = async (projectId) => {
  const dir = projectDiskDir(projectId);
  const fresh = !fsSync.existsSync(dir);
  await ensureDir(dir);
  if (fresh) {
    for (const [rel, content] of Object.entries(SEED)) {
      const target = path.join(dir, ...rel.split('/'));
      await ensureDir(path.dirname(target));
      await fs.writeFile(target, content, 'utf-8');
    }
  }
  return dir;
};

/**
 * Read the directory into the tree shape the explorer renders.
 *
 * `id` is the path relative to the project root ('src/index.js'), which makes it unique and
 * stable - the old random `name_timestamp_rand` ids changed on every recreation and could collide
 * between two folders holding the same name.
 */
const readTree = async (absDir, relParts, counter) => {
  let dirents = [];
  try {
    dirents = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const children = [];
  for (const entry of dirents) {
    if (counter.n >= MAX_ENTRIES) break;
    counter.n += 1;
    const rel = [...relParts, entry.name];
    const id = rel.join('/');

    if (entry.isDirectory()) {
      const skip = NO_DESCEND.has(entry.name);
      children.push({
        id,
        name: entry.name,
        type: 'folder',
        path: rel,
        truncated: skip,
        children: skip ? [] : await readTree(path.join(absDir, entry.name), rel, counter),
      });
    } else if (entry.isFile()) {
      let size = 0;
      try {
        size = (await fs.stat(path.join(absDir, entry.name))).size;
      } catch {
        /* raced with a delete; report it as empty rather than failing the whole tree */
      }
      children.push({ id, name: entry.name, type: 'file', path: rel, size });
    }
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return children;
};

export const buildTree = async (projectId) => {
  const dir = await ensureProjectDir(projectId);
  return {
    id: 'root',
    name: 'root',
    type: 'folder',
    path: [],
    children: await readTree(dir, [], { n: 0 }),
  };
};

// Anything above this is not editor content; Monaco would choke and the socket payload would be
// absurd. The client gets a clear reason instead of a truncated file it might save back.
const MAX_EDITABLE_BYTES = 2 * 1024 * 1024;

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.pdf', '.zip', '.gz', '.tar',
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.woff', '.woff2', '.ttf', '.mp4', '.mp3',
]);

/**
 * Decode a file the editor is about to show.
 *
 * WHY not just utf-8: on Windows a redirect in the shell (`echo hi > notes.txt` in PowerShell)
 * writes UTF-16LE with a BOM, and a plain utf-8 read renders that as "h\0i\0" mojibake. Since the
 * terminal and the editor now share one directory, files the shell wrote have to open cleanly.
 */
export const decodeText = (buffer) => {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le', 2);
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return buffer.swap16().toString('utf16le', 2);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString('utf-8', 3);
  }
  return buffer.toString('utf-8');
};

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** Every handler funnels through this so a bad path is a 400, not a 500 stack trace. */
const withPath = (req, res, segments, run) => {
  let resolved;
  try {
    resolved = resolveProjectPath(req.params.projectId, segments);
  } catch (error) {
    fail(res, 400, error.message);
    return null;
  }
  return run(resolved);
};

/**
 * Tell everyone in the room the tree moved, so open explorers refetch.
 * The room name must match the one SocketHandlers' `join-project` uses - a bare projectId reaches
 * nobody.
 */
const broadcast = (req, event, payload) => {
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${req.params.projectId}`).emit(event, { projectId: req.params.projectId, ...payload });
  }
};

/**
 * GET /api/filesystem/:projectId
 */
export const getFileStructure = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isSafeProjectId(projectId)) return fail(res, 400, 'Invalid project id');
    res.json({ success: true, data: await buildTree(projectId) });
  } catch (error) {
    console.error('Get file structure error:', error);
    fail(res, 500, error.message);
  }
};

/**
 * POST /api/filesystem/:projectId/create   { name, type, parentPath, content }
 */
export const createFileOrFolder = async (req, res) => {
  const { name, type, parentPath = [], content = '' } = req.body;
  if (!name || !['file', 'folder'].includes(type)) {
    return fail(res, 400, 'name and type ("file" | "folder") are required');
  }

  return withPath(req, res, [...parentPath, name], async ({ target, parts }) => {
    try {
      await ensureProjectDir(req.params.projectId);
      if (fsSync.existsSync(target)) {
        return fail(res, 409, `A file or folder named "${name}" already exists`);
      }
      await ensureDir(path.dirname(target));
      if (type === 'folder') await ensureDir(target);
      else await fs.writeFile(target, content, 'utf-8');

      const node = { id: parts.join('/'), name, type, path: parts, ...(type === 'folder' ? { children: [] } : { content }) };
      broadcast(req, 'filesystem:changed', { reason: 'create', path: parts });
      res.status(201).json({ success: true, message: `${type} created`, data: node });
    } catch (error) {
      console.error('Create error:', error);
      fail(res, 500, error.message);
    }
  });
};

/**
 * PUT /api/filesystem/:projectId/rename   { path, newName }
 */
export const renameFileOrFolder = async (req, res) => {
  const { path: nodePath, newName } = req.body;
  if (!nodePath?.length || !newName) return fail(res, 400, 'path and newName are required');

  return withPath(req, res, nodePath, async ({ target, parts }) => {
    const destParts = [...parts.slice(0, -1), newName];
    return withPath(req, res, destParts, async ({ target: dest }) => {
      try {
        if (!fsSync.existsSync(target)) return fail(res, 404, 'File or folder not found');
        if (fsSync.existsSync(dest)) return fail(res, 409, `"${newName}" already exists`);
        await fs.rename(target, dest);
        broadcast(req, 'filesystem:changed', { reason: 'rename', path: parts, newPath: destParts });
        res.json({ success: true, message: 'Renamed', data: { oldName: parts.at(-1), newName, path: destParts } });
      } catch (error) {
        console.error('Rename error:', error);
        fail(res, 500, error.message);
      }
    });
  });
};

/**
 * DELETE /api/filesystem/:projectId/delete   { path }
 */
export const deleteFileOrFolder = async (req, res) => {
  const { path: nodePath } = req.body;
  if (!nodePath?.length) return fail(res, 400, 'path is required');

  return withPath(req, res, nodePath, async ({ target, parts, root }) => {
    try {
      if (path.resolve(target) === path.resolve(root)) return fail(res, 400, 'Cannot delete the project root');
      if (!fsSync.existsSync(target)) return fail(res, 404, 'File or folder not found');
      const isDir = (await fs.stat(target)).isDirectory();
      await fs.rm(target, { recursive: true, force: true });
      broadcast(req, 'filesystem:changed', { reason: 'delete', path: parts });
      res.json({ success: true, message: 'Deleted', data: { path: parts, type: isDir ? 'folder' : 'file' } });
    } catch (error) {
      console.error('Delete error:', error);
      fail(res, 500, error.message);
    }
  });
};

/**
 * GET /api/filesystem/:projectId/file?path=["src","index.js"]
 */
export const getFileContent = async (req, res) => {
  let nodePath = req.query.path;
  try {
    if (typeof nodePath === 'string') nodePath = JSON.parse(nodePath);
  } catch {
    return fail(res, 400, 'path must be a JSON array');
  }
  if (!nodePath?.length) return fail(res, 400, 'path is required');

  return withPath(req, res, nodePath, async ({ target, parts }) => {
    try {
      const stat = await fs.stat(target).catch(() => null);
      if (!stat) return fail(res, 404, 'File not found');
      if (stat.isDirectory()) return fail(res, 400, 'Path is a folder');
      if (stat.size > MAX_EDITABLE_BYTES) {
        return fail(res, 413, `File is ${(stat.size / 1048576).toFixed(1)} MB - too large to open in the editor`);
      }
      if (BINARY_EXT.has(path.extname(target).toLowerCase())) {
        return fail(res, 415, 'Binary file - open it with Download instead');
      }
      res.json({
        success: true,
        data: {
          name: parts.at(-1),
          path: parts,
          id: parts.join('/'),
          content: decodeText(await fs.readFile(target)),
        },
      });
    } catch (error) {
      console.error('Read error:', error);
      fail(res, 500, error.message);
    }
  });
};

/**
 * PUT /api/filesystem/:projectId/file   { path, content }
 */
export const updateFileContent = async (req, res) => {
  const { path: nodePath, content } = req.body;
  if (!nodePath?.length) return fail(res, 400, 'path is required');

  return withPath(req, res, nodePath, async ({ target, parts }) => {
    try {
      await ensureDir(path.dirname(target));
      await fs.writeFile(target, content ?? '', 'utf-8');
      broadcast(req, 'file_updated', { path: parts, content: content ?? '' });
      res.json({ success: true, message: 'Saved', data: { path: parts, id: parts.join('/') } });
    } catch (error) {
      console.error('Write error:', error);
      fail(res, 500, error.message);
    }
  });
};

/**
 * POST /api/filesystem/:projectId/move   { path, targetPath }
 *
 * Drag-and-drop in the explorer. `targetPath` is the destination FOLDER; the entry keeps its name.
 */
export const moveFileOrFolder = async (req, res) => {
  const { path: nodePath, targetPath = [] } = req.body;
  if (!nodePath?.length) return fail(res, 400, 'path is required');

  return withPath(req, res, nodePath, async ({ target: source, parts }) => {
    const name = parts.at(-1);
    const destParts = [...targetPath.filter((p) => p !== 'root'), name];

    return withPath(req, res, destParts, async ({ target: dest }) => {
      try {
        if (!fsSync.existsSync(source)) return fail(res, 404, 'File or folder not found');
        if (path.resolve(source) === path.resolve(dest)) {
          return res.json({ success: true, message: 'Already there', data: { path: destParts } });
        }
        // Dropping a folder inside itself would delete the tree it is being moved into.
        const rel = path.relative(source, dest);
        if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
          return fail(res, 400, 'Cannot move a folder into itself');
        }
        if (fsSync.existsSync(dest)) return fail(res, 409, `"${name}" already exists there`);

        await ensureDir(path.dirname(dest));
        await fs.rename(source, dest);
        broadcast(req, 'filesystem:changed', { reason: 'move', path: parts, newPath: destParts });
        res.json({ success: true, message: 'Moved', data: { path: destParts, oldPath: parts } });
      } catch (error) {
        console.error('Move error:', error);
        fail(res, 500, error.message);
      }
    });
  });
};

/**
 * GET /api/filesystem/:projectId/search?q=needle&caseSensitive=&regex=
 *
 * Plain text search across the workspace, with line numbers so a hit can be clicked open.
 * ponytail: a straight recursive scan with caps. If projects ever get large enough for this to
 * feel slow, shell out to ripgrep instead of building an index.
 */
const SEARCH_MAX_FILES = 2000;
const SEARCH_MAX_HITS = 300;
const SEARCH_MAX_FILE_BYTES = 512 * 1024;

export const searchProject = async (req, res) => {
  const { projectId } = req.params;
  const query = (req.query.q || '').toString();
  if (!isSafeProjectId(projectId)) return fail(res, 400, 'Invalid project id');
  if (query.length < 2) return fail(res, 400, 'Search needs at least 2 characters');

  let matcher;
  try {
    matcher = req.query.regex === 'true'
      ? new RegExp(query, req.query.caseSensitive === 'true' ? '' : 'i')
      : null;
  } catch (error) {
    return fail(res, 400, `Invalid regular expression: ${error.message}`);
  }
  const needle = req.query.caseSensitive === 'true' ? query : query.toLowerCase();

  const root = await ensureProjectDir(projectId);
  const results = [];
  let filesScanned = 0;
  let truncated = false;

  const walk = async (dir, relParts) => {
    if (truncated) return;
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (truncated) return;
      const rel = [...relParts, entry.name];
      if (entry.isDirectory()) {
        if (NO_DESCEND.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), rel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      if (++filesScanned > SEARCH_MAX_FILES) {
        truncated = true;
        return;
      }

      const abs = path.join(dir, entry.name);
      let stat;
      try {
        stat = await fs.stat(abs);
      } catch {
        continue;
      }
      if (stat.size > SEARCH_MAX_FILE_BYTES) continue;

      let text;
      try {
        text = decodeText(await fs.readFile(abs));
      } catch {
        continue;
      }
      // A file full of NULs is binary whatever its extension says.
      if (text.includes('\u0000')) continue;

      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hit = matcher
          ? matcher.test(line)
          : (req.query.caseSensitive === 'true' ? line : line.toLowerCase()).includes(needle);
        if (!hit) continue;

        results.push({
          path: rel,
          id: rel.join('/'),
          name: entry.name,
          line: i + 1,
          preview: line.length > 200 ? `${line.slice(0, 200)}…` : line,
        });
        if (results.length >= SEARCH_MAX_HITS) {
          truncated = true;
          return;
        }
      }
    }
  };

  try {
    await walk(root, []);
    res.json({ success: true, data: { results, truncated, filesScanned } });
  } catch (error) {
    console.error('Search error:', error);
    fail(res, 500, error.message);
  }
};

/**
 * GET /api/filesystem/:projectId/download?path=[...]  - raw bytes, for binaries and backups.
 */
export const downloadFile = async (req, res) => {
  let nodePath = req.query.path;
  try {
    if (typeof nodePath === 'string') nodePath = JSON.parse(nodePath);
  } catch {
    return fail(res, 400, 'path must be a JSON array');
  }
  if (!nodePath?.length) return fail(res, 400, 'path is required');

  return withPath(req, res, nodePath, async ({ target, parts }) => {
    const stat = await fs.stat(target).catch(() => null);
    if (!stat || stat.isDirectory()) return fail(res, 404, 'File not found');
    res.download(target, parts.at(-1));
  });
};

/**
 * POST /api/filesystem/:projectId/upload   multipart: files[] + parentPath
 */
export const uploadFiles = async (req, res) => {
  const files = req.files || [];
  if (!files.length) return fail(res, 400, 'No files uploaded');

  let parentPath = req.body.parentPath || [];
  try {
    if (typeof parentPath === 'string') parentPath = JSON.parse(parentPath);
  } catch {
    parentPath = [];
  }

  try {
    await ensureProjectDir(req.params.projectId);
    const written = [];
    for (const file of files) {
      const { target, parts } = resolveProjectPath(req.params.projectId, [...parentPath, file.originalname]);
      await ensureDir(path.dirname(target));
      await fs.writeFile(target, file.buffer);
      written.push(parts.join('/'));
    }
    broadcast(req, 'filesystem:changed', { reason: 'upload' });
    res.status(201).json({ success: true, message: `Uploaded ${written.length} file(s)`, data: written });
  } catch (error) {
    console.error('Upload error:', error);
    fail(res, 400, error.message);
  }
};

export default {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent,
  moveFileOrFolder,
  searchProject,
  downloadFile,
  uploadFiles,
};
