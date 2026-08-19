/**
 * Project filesystem.
 * Direct disk-backed filesystem controller with MongoDB File synchronization for version control.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mongoose from 'mongoose';
import File from '../models/File.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Where a project's files live. This is also the terminal's cwd. */
export const projectDiskDir = (projectId) => path.join(process.cwd(), 'projects', projectId);

// Project ids come from the URL. Anything but a Mongo-style id could walk out of projects/.
const isSafeProjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

const NO_DESCEND = new Set([
  'node_modules', '.git', '.venv', 'venv', '__pycache__', '.next', '.cache', 'dist', 'build',
]);
const MAX_ENTRIES = 5000;

// Maximum size we will return to Monaco (2 MB). Files larger than this would freeze the tab.
const MAX_EDITABLE_BYTES = 2 * 1024 * 1024;

// Extensions we treat as binary and refuse to open in Monaco.
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.wav', '.ogg', '.mp4', '.webm',
  '.ttf', '.woff', '.woff2', '.eot',
  '.pyc', '.class', '.o',
]);

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/** A brand-new project should not open on an empty pane. */
const SEED = {
  'README.md': '# Welcome to your project\n\nStart building something amazing!\n',
  'index.html':
    '<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n    <title>My Page</title>\n' +
    '  </head>\n  <body>\n    <h1>Hello from CodeSync</h1>\n' +
    '    <script src="src/index.js"></script>\n  </body>\n</html>\n',
  'src/index.js': '// Start coding here\nconsole.log("Hello World!");\n',
};

/**
 * Projects created before the disk rewrite exist only as a JSON tree in
 * uploads/file-structures/<id>.json. Their directory may never have been written (the mirror only
 * ran when a terminal opened), so a straight switch to reading disk would show those users an
 * empty - or seed-filled - workspace and quietly strand their files. Write the legacy tree out
 * once, the first time the directory is needed.
 */
const LEGACY_STRUCTURES = path.join(process.cwd(), 'uploads', 'file-structures');

const writeLegacyTree = async (node, dir) => {
  for (const child of node.children || []) {
    const name = child.name;
    if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) continue;
    const target = path.join(dir, name);
    if (child.type === 'folder') {
      await ensureDir(target);
      await writeLegacyTree(child, target);
    } else {
      await fs.writeFile(target, child.content || '', 'utf-8');
    }
  }
};

const restoreLegacyProject = async (projectId, dir) => {
  const legacyPath = path.join(LEGACY_STRUCTURES, `${projectId}.json`);
  try {
    const tree = JSON.parse(await fs.readFile(legacyPath, 'utf-8'));
    if (!tree?.children?.length) return false;
    await writeLegacyTree(tree, dir);
    console.log(`[Filesystem] migrated legacy tree for ${projectId}`);
    return true;
  } catch {
    return false;
  }
};

export const ensureProjectDir = async (projectId) => {
  if (!isSafeProjectId(projectId)) throw new Error('Invalid project ID');
  const dir = projectDiskDir(projectId);
  const fresh = !fsSync.existsSync(dir) || (await fs.readdir(dir)).length === 0;
  await ensureDir(dir);

  if (fresh) {
    // An existing project's own files always win over the starter template.
    const migrated = await restoreLegacyProject(projectId, dir);
    if (!migrated) {
      for (const [rel, content] of Object.entries(SEED)) {
        const target = path.join(dir, ...rel.split('/'));
        await ensureDir(path.dirname(target));
        await fs.writeFile(target, content, 'utf-8');
      }
    }
  }
  return dir;
};

// Names come from the client, so names like '..' or 'foo/bar' must never escape the directory.
const isSafeSegment = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name !== '.' &&
  name !== '..' &&
  !name.includes('/') &&
  !name.includes('\\');

export const resolveProjectPath = (projectId, pathArray) => {
  if (!isSafeProjectId(projectId)) throw new Error('Invalid project id');
  const parts = (Array.isArray(pathArray) ? pathArray : []).filter((p) => p !== 'root');
  for (const part of parts) {
    if (!isSafeSegment(part)) throw new Error(`Illegal path segment: ${part}`);
  }
  const root = projectDiskDir(projectId);
  const target = path.join(root, ...parts);
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Illegal path segment: traversal');
  }
  return { target, parts, root };
};

const withPath = async (req, res, pathArray, fn) => {
  try {
    const { projectId } = req.params;
    const resolved = resolveProjectPath(projectId, pathArray);
    return await fn(resolved);
  } catch (error) {
    console.warn('[FileSystem] Path resolution failed:', error.message);
    return fail(res, 400, error.message);
  }
};

const broadcast = (req, event, data) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`project:${req.params.projectId}`).emit(event, {
    projectId: req.params.projectId,
    ...data,
  });
  io.to(req.params.projectId).emit(event, {
    projectId: req.params.projectId,
    ...data,
  });
};

/**
 * Sync file node with MongoDB File collection
 */
export const syncMongoFile = async (projectId, pathInput, name, content, userId) => {
  try {
    let pathString = '';
    if (Array.isArray(pathInput)) {
      const filtered = pathInput.filter(p => p !== 'root');
      pathString = filtered.length > 0 ? filtered.join('/') : pathInput.join('/');
    } else if (typeof pathInput === 'string') {
      pathString = pathInput;
    }
    if (!pathString) return null;

    let validProjectId = null;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      validProjectId = new mongoose.Types.ObjectId(projectId);
    } else {
      const hash = crypto.createHash('md5').update(String(projectId)).digest('hex').substring(0, 24);
      validProjectId = new mongoose.Types.ObjectId(hash);
    }

    let validUserId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = new mongoose.Types.ObjectId(userId);
    } else {
      const hash = crypto.createHash('md5').update(userId ? String(userId) : 'system').digest('hex').substring(0, 24);
      validUserId = new mongoose.Types.ObjectId(hash);
    }

    const fileName = name || pathString.split('/').pop() || 'untitled';

    const mongoFile = await File.findOneAndUpdate(
      { projectId: validProjectId, path: pathString },
      {
        name: fileName,
        path: pathString,
        projectId: validProjectId,
        content: content || '',
        createdBy: validUserId,
        lastModifiedBy: validUserId,
        isDeleted: false,
        size: Buffer.byteLength(content || '', 'utf8')
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return mongoFile;
  } catch (err) {
    console.error('Error syncing Mongo File:', err);
    return null;
  }
};

/**
 * Helper to load default structure if directory is completely empty
 */
const writeDefaultProjectFiles = async (dir) => {
  const src = path.join(dir, 'src');
  await ensureDir(src);
  const mainFile = path.join(src, 'index.js');
  if (!fsSync.existsSync(mainFile)) {
    await fs.writeFile(mainFile, '// Start coding here\nconsole.log("Hello World!");\n', 'utf-8');
  }
  const readme = path.join(dir, 'README.md');
  if (!fsSync.existsSync(readme)) {
    await fs.writeFile(readme, '# Welcome to your project\n\nStart building something amazing!\n', 'utf-8');
  }
};

export const buildTree = async (dir, prefix = []) => {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });

  const children = [];
  for (const entry of entries) {
    const rel = [...prefix, entry.name];
    const uniqueId = rel.join('/');
    if (entry.isDirectory()) {
      const node = {
        id: uniqueId,
        name: entry.name,
        type: 'folder',
        path: rel,
        children: NO_DESCEND.has(entry.name) ? [] : await buildTree(path.join(dir, entry.name), rel),
      };
      children.push(node);
    } else {
      children.push({
        id: uniqueId,
        name: entry.name,
        type: 'file',
        path: rel,
      });
    }
  }
  return children;
};

/**
 * GET /api/filesystem/:projectId
 * Get the tree for a project. Returns the legacy wrapper shape { id: 'root', name: 'root', type: 'folder', children: [...] }
 */
export const getFileStructure = async (req, res) => {
  try {
    const dir = await ensureProjectDir(req.params.projectId);
    const top = await fs.readdir(dir).catch(() => []);
    if (top.length === 0) {
      await writeDefaultProjectFiles(dir);
    }

    const children = await buildTree(dir);
    res.json({
      success: true,
      data: {
        id: 'root',
        name: 'root',
        type: 'folder',
        children,
      },
    });
  } catch (error) {
    console.error('Get structure error:', error);
    fail(res, 500, error.message);
  }
};

/**
 * POST /api/filesystem/:projectId/create   { name, type, parentPath }
 */
export const createFileOrFolder = async (req, res) => {
  const { name, type, parentPath = [], content = '' } = req.body;
  if (!name || !type) return fail(res, 400, 'name and type are required');
  if (!['file', 'folder'].includes(type)) return fail(res, 400, 'type must be "file" or "folder"');
  if (!isSafeSegment(name)) return fail(res, 400, `Invalid name: "${name}"`);

  const parts = [...parentPath.filter((p) => p !== 'root'), name];

  return withPath(req, res, parts, async ({ target, parts: relParts }) => {
    try {
      if (fsSync.existsSync(target)) {
        return fail(res, 409, `A ${type} named "${name}" already exists there`);
      }
      await ensureDir(path.dirname(target));
      if (type === 'folder') {
        await ensureDir(target);
      } else {
        await fs.writeFile(target, content ?? '', 'utf-8');
        await syncMongoFile(req.params.projectId, relParts, name, content ?? '', req.userId);
      }

      broadcast(req, 'filesystem:changed', { reason: 'create', path: relParts, type });

      res.status(201).json({
        success: true,
        message: `${type === 'folder' ? 'Folder' : 'File'} created`,
        data: {
          id: name,
          name,
          type,
          ...(type === 'folder' ? { children: [] } : { content: content ?? '' }),
        },
      });
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
  if (!isSafeSegment(newName)) return fail(res, 400, `Invalid name: "${newName}"`);

  return withPath(req, res, nodePath, async ({ target: source, parts, root }) => {
    const parentParts = parts.slice(0, -1);
    const destParts = [...parentParts, newName];

    return withPath(req, res, destParts, async ({ target: dest }) => {
      try {
        if (!fsSync.existsSync(source)) return fail(res, 404, 'File or folder not found');
        if (fsSync.existsSync(dest) && source !== dest) {
          return fail(res, 409, `A file or folder named "${newName}" already exists there`);
        }
        await fs.rename(source, dest);
        broadcast(req, 'filesystem:changed', { reason: 'rename', oldPath: parts, newPath: destParts });
        res.json({
          success: true,
          message: 'Renamed',
          data: { oldName: parts.at(-1), newName, path: destParts },
        });
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
 * Decode buffer to text safely handling utf-8, UTF-8 BOM, UTF-16LE, and UTF-16BE
 */
export const decodeText = (buf) => {
  if (!buf || !buf.length) return '';
  try {
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return buf.subarray(3).toString('utf-8');
    }
    if (buf[0] === 0xff && buf[1] === 0xfe) {
      return buf.subarray(2).toString('utf16le');
    }
    if (buf[0] === 0xfe && buf[1] === 0xff) {
      const swapped = Buffer.from(buf.subarray(2)).swap16();
      return swapped.toString('utf16le');
    }
    return buf.toString('utf-8');
  } catch {
    return '';
  }
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
      const rawText = decodeText(await fs.readFile(target));
      const mongoFile = await syncMongoFile(req.params.projectId, parts, parts.at(-1), rawText, req.userId);

      res.json({
        success: true,
        data: {
          name: parts.at(-1),
          path: parts,
          id: parts.join('/'),
          content: rawText,
          fileId: mongoFile ? mongoFile._id.toString() : parts.join('/'),
          mongoFileId: mongoFile ? mongoFile._id.toString() : null
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
      const mongoFile = await syncMongoFile(req.params.projectId, parts, parts.at(-1), content ?? '', req.userId);
      broadcast(req, 'file_updated', { path: parts, content: content ?? '' });
      res.json({
        success: true,
        message: 'Saved',
        data: {
          path: parts,
          id: parts.join('/'),
          fileId: mongoFile ? mongoFile._id.toString() : parts.join('/'),
          mongoFileId: mongoFile ? mongoFile._id.toString() : null
        }
      });
    } catch (error) {
      console.error('Write error:', error);
      fail(res, 500, error.message);
    }
  });
};

/**
 * POST /api/filesystem/:projectId/move   { path, targetPath }
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
 * GET /api/filesystem/:projectId/search?q=needle
 */
export const searchProject = async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ success: true, data: [] });

  const caseSensitive = req.query.caseSensitive === 'true';
  const isRegex = req.query.regex === 'true';

  let matcher;
  try {
    if (isRegex) {
      matcher = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matcher = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
  } catch (err) {
    return fail(res, 400, `Invalid regex: ${err.message}`);
  }

  try {
    const root = await ensureProjectDir(req.params.projectId);
    const results = [];

    const searchDir = async (dir, prefix = []) => {
      if (results.length >= 200) return;
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (results.length >= 200) break;
        const rel = [...prefix, entry.name];
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!NO_DESCEND.has(entry.name)) {
            await searchDir(full, rel);
          }
        } else {
          if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
          const stat = await fs.stat(full).catch(() => null);
          if (!stat || stat.size > MAX_EDITABLE_BYTES) continue;

          const text = decodeText(await fs.readFile(full));
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= 200) break;
            matcher.lastIndex = 0;
            if (matcher.test(lines[i])) {
              results.push({
                path: rel,
                line: i + 1,
                snippet: lines[i].slice(0, 300),
              });
            }
          }
        }
      }
    };

    await searchDir(root);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    fail(res, 500, error.message);
  }
};

/**
 * GET /api/filesystem/:projectId/download?path=["src","image.png"]
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
    try {
      if (!fsSync.existsSync(target)) return fail(res, 404, 'File not found');
      const stat = await fs.stat(target);
      if (stat.isDirectory()) return fail(res, 400, 'Cannot download a folder directly');
      res.download(target, parts.at(-1));
    } catch (error) {
      console.error('Download error:', error);
      fail(res, 500, error.message);
    }
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
  syncMongoFile,
  moveFileOrFolder,
  searchProject,
  downloadFile,
  uploadFiles,
};
