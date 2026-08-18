import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mongoose from 'mongoose';
import File from '../models/File.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store file structure
const STRUCTURE_FILE = path.join(__dirname, '../uploads/file-structures');

/**
 * Ensure directory exists
 */
const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Get structure file path for a project
 */
const getStructurePath = (projectId) => {
  return path.join(STRUCTURE_FILE, `${projectId}.json`);
};

/**
 * Initialize default structure
 */
const getDefaultStructure = () => ({
  id: 'root',
  name: 'root',
  type: 'folder',
  children: [
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      children: [
        {
          id: 'index.js',
          name: 'index.js',
          type: 'file',
          content: '// Start coding here\nconsole.log("Hello World!");'
        }
      ]
    },
    {
      id: 'readme.md',
      name: 'README.md',
      type: 'file',
      content: '# Welcome to your project\n\nStart building something amazing!'
    }
  ]
});

/**
 * Load file structure from disk
 */
export const loadStructure = async (projectId) => {
  try {
    await ensureDir(STRUCTURE_FILE);
    const structurePath = getStructurePath(projectId);
    
    try {
      const data = await fs.readFile(structurePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // If file doesn't exist, create default structure
      const defaultStructure = getDefaultStructure();
      await saveStructure(projectId, defaultStructure);
      return defaultStructure;
    }
  } catch (error) {
    console.error('Error loading structure:', error);
    return getDefaultStructure();
  }
};

/**
 * Save file structure to disk
 */
export const saveStructure = async (projectId, structure) => {
  try {
    await ensureDir(STRUCTURE_FILE);
    const structurePath = getStructurePath(projectId);
    await fs.writeFile(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
    // Keep the on-disk copy in step, so the terminal always runs what the editor shows.
    await mirrorProjectToDisk(projectId, structure);
    return true;
  } catch (error) {
    console.error('Error saving structure:', error);
    return false;
  }
};

/**
 * Where the terminal (and anything else that needs real files) sees this project.
 */
const projectDiskDir = (projectId) => path.join(process.cwd(), 'projects', projectId);

const mirrorManifestPath = (projectId) => path.join(STRUCTURE_FILE, `${projectId}.mirror.json`);

// Names come from the client, so a name like '../..' must never escape the project directory.
const isSafeName = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name !== '.' &&
  name !== '..' &&
  !name.includes('/') &&
  !name.includes('\\');

/**
 * Flatten the tree into relative paths. The root node itself contributes no path segment.
 */
const collectEntries = (node, prefix = [], out = []) => {
  for (const child of node.children || []) {
    if (!isSafeName(child.name)) {
      console.warn('[Mirror] Skipping unsafe name:', child.name);
      continue;
    }
    const rel = [...prefix, child.name];
    if (child.type === 'folder') {
      out.push({ rel, isDir: true });
      collectEntries(child, rel, out);
    } else {
      out.push({ rel, isDir: false, content: child.content || '' });
    }
  }
  return out;
};

/**
 * Write the project's file tree out as real files.
 *
 * WHY: the tree is stored as one JSON blob, but a shell can only run files that exist. The
 * terminal's cwd is this directory, so mirroring is what makes `python main.py` work.
 *
 * Pruning uses a manifest of what a previous mirror wrote, so files the user created *in* the
 * terminal (build output, node_modules, a venv) are never deleted - they were never mirrored.
 */
export const mirrorProjectToDisk = async (projectId, structure) => {
  const tree = structure || (await loadStructure(projectId));
  const dir = projectDiskDir(projectId);
  await ensureDir(dir);

  const entries = collectEntries(tree);
  const written = [];

  for (const entry of entries) {
    const target = path.join(dir, ...entry.rel);
    if (entry.isDir) {
      await ensureDir(target);
    } else {
      await ensureDir(path.dirname(target));
      // Only write on change: rewriting every save would bump mtimes and confuse watchers/make.
      let existing = null;
      try {
        existing = await fs.readFile(target, 'utf-8');
      } catch {
        existing = null;
      }
      if (existing !== entry.content) {
        await fs.writeFile(target, entry.content, 'utf-8');
      }
    }
    written.push(entry.rel.join('/'));
  }

  let previous = [];
  try {
    previous = JSON.parse(await fs.readFile(mirrorManifestPath(projectId), 'utf-8'));
  } catch {
    previous = [];
  }

  const stillPresent = new Set(written);
  for (const rel of previous) {
    if (stillPresent.has(rel)) continue;
    await fs.rm(path.join(dir, ...rel.split('/')), { recursive: true, force: true });
  }

  await fs.writeFile(mirrorManifestPath(projectId), JSON.stringify(written), 'utf-8');
};

/**
 * Find node by path in tree
 */
const findNodeByPath = (tree, pathArray) => {
  if (pathArray.length === 0) return tree;
  
  // Skip 'root' in path since tree itself is root
  const actualPath = pathArray[0] === 'root' ? pathArray.slice(1) : pathArray;
  
  if (actualPath.length === 0) return tree;
  
  let current = tree;
  for (let i = 0; i < actualPath.length; i++) {
    if (!current.children) return null;
    current = current.children.find(child => child.id === actualPath[i]);
    if (!current) return null;
  }
  return current;
};

/**
 * Find parent node
 */
const findParentNode = (tree, pathArray) => {
  if (pathArray.length === 0) return null;
  const parentPath = pathArray.slice(0, -1);
  return findNodeByPath(tree, parentPath);
};

/**
 * Generate unique ID
 */
const generateId = (name, parentPath = []) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `${name}_${timestamp}_${random}`;
};

/**
 * GET /api/filesystem/:projectId
 * Get entire file structure for a project
 */
export const getFileStructure = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    const structure = await loadStructure(projectId);
    
    res.json({
      success: true,
      data: structure
    });
  } catch (error) {
    console.error('Get file structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file structure',
      error: error.message
    });
  }
};

/**
 * POST /api/filesystem/:projectId/create
 * Create a new file or folder
 */
export const createFileOrFolder = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, type, parentPath = [], content = '' } = req.body;

    console.log('📁 Create request:', { projectId, name, type, parentPath, content: content?.substring(0, 50) });

    if (!projectId || !name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, name, and type are required'
      });
    }

    if (!['file', 'folder'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "file" or "folder"'
      });
    }

    // Load current structure
    const structure = await loadStructure(projectId);
    console.log('📂 Loaded structure:', JSON.stringify(structure, null, 2).substring(0, 500));

    // Find parent node
    const parent = parentPath.length === 0 ? structure : findNodeByPath(structure, parentPath);
    console.log('👨‍👦 Parent node:', parent ? { id: parent.id, name: parent.name, type: parent.type } : 'NOT FOUND');
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent folder not found',
        debug: { parentPath, structureKeys: Object.keys(structure) }
      });
    }

    if (parent.type !== 'folder') {
      return res.status(400).json({
        success: false,
        message: 'Parent must be a folder'
      });
    }

    // Ensure children array exists
    if (!parent.children) {
      parent.children = [];
    }

    // Check if name already exists
    const exists = parent.children.some(child => child.name === name);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `A ${type} with name "${name}" already exists`
      });
    }

    // Create new node
    const newNode = {
      id: generateId(name, parentPath),
      name,
      type,
      ...(type === 'folder' ? { children: [] } : { content })
    };

    // Add to parent
    parent.children.push(newNode);

    // Save structure
    await saveStructure(projectId, structure);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('file_created', {
        projectId,
        node: newNode,
        parentPath
      });
    }

    res.status(201).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
      data: newNode
    });
  } catch (error) {
    console.error('Create file/folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create file/folder',
      error: error.message
    });
  }
};

/**
 * PUT /api/filesystem/:projectId/rename
 * Rename a file or folder
 */
export const renameFileOrFolder = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: nodePath, newName } = req.body;

    if (!projectId || !nodePath || !newName) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, path, and new name are required'
      });
    }

    // Load current structure
    const structure = await loadStructure(projectId);

    // Find the node
    const node = findNodeByPath(structure, nodePath);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'File or folder not found'
      });
    }

    // Find parent to check for duplicates
    const parent = nodePath.length === 1 ? structure : findParentNode(structure, nodePath);
    if (parent && parent.children) {
      const exists = parent.children.some(
        child => child.name === newName && child.id !== node.id
      );
      if (exists) {
        return res.status(409).json({
          success: false,
          message: `A ${node.type} with name "${newName}" already exists`
        });
      }
    }

    // Store old name for response
    const oldName = node.name;

    // Rename the node
    node.name = newName;

    // Save structure
    await saveStructure(projectId, structure);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('file_renamed', {
        projectId,
        path: nodePath,
        oldName,
        newName
      });
    }

    res.json({
      success: true,
      message: `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} renamed successfully`,
      data: { oldName, newName, node }
    });
  } catch (error) {
    console.error('Rename file/folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rename file/folder',
      error: error.message
    });
  }
};

/**
 * DELETE /api/filesystem/:projectId/delete
 * Delete a file or folder
 */
export const deleteFileOrFolder = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: nodePath } = req.body;

    if (!projectId || !nodePath || nodePath.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and path are required'
      });
    }

    // Load current structure
    const structure = await loadStructure(projectId);

    // Find parent node
    const parent = nodePath.length === 1 ? structure : findParentNode(structure, nodePath);
    
    if (!parent || !parent.children) {
      return res.status(404).json({
        success: false,
        message: 'Parent folder not found'
      });
    }

    // Find and remove the node
    const nodeId = nodePath[nodePath.length - 1];
    const nodeIndex = parent.children.findIndex(child => child.id === nodeId);
    
    if (nodeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File or folder not found'
      });
    }

    const deletedNode = parent.children[nodeIndex];
    parent.children.splice(nodeIndex, 1);

    // Save structure
    await saveStructure(projectId, structure);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('file_deleted', {
        projectId,
        path: nodePath,
        deletedNode
      });
    }

    res.json({
      success: true,
      message: `${deletedNode.type.charAt(0).toUpperCase() + deletedNode.type.slice(1)} deleted successfully`,
      data: deletedNode
    });
  } catch (error) {
    console.error('Delete file/folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file/folder',
      error: error.message
    });
  }
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
 * GET /api/filesystem/:projectId/file
 * Get file content
 */
export const getFileContent = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: nodePath } = req.query;

    if (!projectId || !nodePath) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and path are required'
      });
    }

    // Parse path if it's a string
    const pathArray = typeof nodePath === 'string' ? JSON.parse(nodePath) : nodePath;

    // Load structure
    const structure = await loadStructure(projectId);

    // Find the file
    const file = findNodeByPath(structure, pathArray);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.type !== 'file') {
      return res.status(400).json({
        success: false,
        message: 'Path does not point to a file'
      });
    }

    // Sync canonical Mongo File document
    const mongoFile = await syncMongoFile(projectId, pathArray, file.name, file.content || '', req.userId);

    res.json({
      success: true,
      data: {
        name: file.name,
        content: file.content || '',
        id: file.id,
        fileId: mongoFile ? mongoFile._id.toString() : file.id,
        mongoFileId: mongoFile ? mongoFile._id.toString() : null
      }
    });
  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file content',
      error: error.message
    });
  }
};

/**
 * PUT /api/filesystem/:projectId/file
 * Update file content
 */
export const updateFileContent = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: nodePath, content } = req.body;

    if (!projectId || !nodePath) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and path are required'
      });
    }

    // Load structure
    const structure = await loadStructure(projectId);

    // Find the file
    const file = findNodeByPath(structure, nodePath);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.type !== 'file') {
      return res.status(400).json({
        success: false,
        message: 'Path does not point to a file'
      });
    }

    // Update content
    file.content = content || '';

    // Save structure
    await saveStructure(projectId, structure);

    // Sync canonical Mongo File document
    const mongoFile = await syncMongoFile(projectId, nodePath, file.name, file.content, req.userId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(projectId).emit('file_updated', {
        projectId,
        path: nodePath,
        content: file.content
      });
    }

    res.json({
      success: true,
      message: 'File updated successfully',
      data: {
        ...file,
        fileId: mongoFile ? mongoFile._id.toString() : file.id,
        mongoFileId: mongoFile ? mongoFile._id.toString() : null
      }
    });
  } catch (error) {
    console.error('Update file content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file content',
      error: error.message
    });
  }
};

export default {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent,
  syncMongoFile
};
