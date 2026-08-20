import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import fs from 'fs/promises';
import { resolveProjectPath, syncMongoFile } from '../controllers/FileSystemController.js';

/**
 * Normalizes project ID and file path into a single document key
 */
export const normalizeKey = (projectId, filePath) => {
  const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath || '');
  return `${projectId}:${pathStr}`;
};

/**
 * Normalizes file path into array format for filesystem resolution
 */
export const normalizePathArray = (filePath) => {
  if (Array.isArray(filePath)) return filePath.filter((p) => p !== 'root');
  if (!filePath) return [];
  return String(filePath).split('/').filter(Boolean).filter((p) => p !== 'root');
};

/**
 * Yjs Document Manager
 * Coordinates collaborative CRDT documents across users and persists changes to project filesystem.
 */
class YjsDocumentManager {
  constructor() {
    // Map of document instances: key = "projectId:filePath"
    this.docs = new Map();
    
    // Map of awareness instances: key = "projectId:filePath"
    this.awareness = new Map();
    
    // Debounce timers for auto-saving: key = "projectId:filePath"
    this.saveTimers = new Map();
  }

  /**
   * Get or create Yjs document for a project/file pair
   */
  async getDocument(projectId, filePath, initialContent = null) {
    const key = normalizeKey(projectId, filePath);
    
    if (this.docs.has(key)) {
      return this.docs.get(key);
    }

    // Create new Yjs document
    const ydoc = new Y.Doc();
    
    // Load existing content from disk or fallback
    await this.loadDocumentFromFilesystem(ydoc, projectId, filePath, initialContent);
    
    // Listen for document updates to schedule debounced auto-save
    ydoc.on('update', (update, origin) => {
      // Avoid scheduling save if originated internally from initial load
      if (origin !== 'initial-load') {
        this.scheduleDocumentSave(projectId, filePath, ydoc);
      }
    });

    this.docs.set(key, ydoc);
    
    // Create awareness instance
    const awareness = new awarenessProtocol.Awareness(ydoc);
    this.awareness.set(key, awareness);

    return ydoc;
  }

  /**
   * Get awareness instance for a document
   */
  getAwareness(projectId, filePath) {
    const key = normalizeKey(projectId, filePath);
    return this.awareness.get(key);
  }

  /**
   * Load document content from disk filesystem
   */
  async loadDocumentFromFilesystem(ydoc, projectId, filePath, fallbackContent = null) {
    try {
      const pathArray = normalizePathArray(filePath);
      const { target } = resolveProjectPath(projectId, pathArray);
      let content = fallbackContent;
      try {
        content = await fs.readFile(target, 'utf-8');
      } catch {
        content = fallbackContent || '';
      }

      this.initializeFromContent(ydoc, content || '');
      console.log(`✅ Loaded Yjs doc for ${projectId}:${pathArray.join('/')}`);
    } catch (error) {
      console.error(`Error loading Yjs doc for ${projectId}:`, error);
      this.initializeFromContent(ydoc, fallbackContent || '');
    }
  }

  /**
   * Initialize Yjs document with plain text content
   */
  initializeFromContent(ydoc, content) {
    const ytext = ydoc.getText('monaco');
    if (ytext.length === 0 && content) {
      ydoc.transact(() => {
        ytext.insert(0, content);
      }, 'initial-load');
    }
  }

  /**
   * Handle incoming Yjs sync protocol binary message
   * Returns reply Uint8Array if one is needed (Step 2 or sync reply)
   */
  handleSyncMessage(ydoc, messageBuffer) {
    if (!ydoc || !messageBuffer) return null;
    
    try {
      const uint8 = messageBuffer instanceof Uint8Array 
        ? messageBuffer 
        : new Uint8Array(messageBuffer);

      const decoder = decoding.createDecoder(uint8);
      const encoder = encoding.createEncoder();

      syncProtocol.readSyncMessage(decoder, encoder, ydoc, null);

      if (encoding.length(encoder) > 0) {
        return encoding.toUint8Array(encoder);
      }
      return null;
    } catch (error) {
      console.error('Error handling Yjs sync message:', error);
      return null;
    }
  }

  /**
   * Schedule document save with debouncing (3 seconds)
   */
  scheduleDocumentSave(projectId, filePath, ydoc) {
    const key = normalizeKey(projectId, filePath);
    
    // Clear existing timer
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.saveDocumentToFilesystem(projectId, filePath, ydoc);
    }, 3000);

    this.saveTimers.set(key, timer);
  }

  /**
   * Save current document content to disk filesystem and sync MongoDB
   */
  async saveDocumentToFilesystem(projectId, filePath, ydoc) {
    try {
      const ytext = ydoc.getText('monaco');
      const content = ytext.toString();
      const pathArray = normalizePathArray(filePath);
      const { target } = resolveProjectPath(projectId, pathArray);

      await fs.writeFile(target, content, 'utf-8');
      const fileName = pathArray[pathArray.length - 1] || 'file';
      await syncMongoFile(projectId, pathArray, fileName, content, null);
      console.log(`💾 Auto-saved collaborative changes to ${projectId}:${pathArray.join('/')}`);
    } catch (error) {
      console.error('Error saving collaborative document:', error);
    }
  }

  /**
   * Remove document from memory when no users are viewing it
   */
  closeDocument(projectId, filePath) {
    const key = normalizeKey(projectId, filePath);
    
    // Clear save timer
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key));
      this.saveTimers.delete(key);
    }

    // Destroy document
    if (this.docs.has(key)) {
      const doc = this.docs.get(key);
      doc.destroy();
      this.docs.delete(key);
    }

    // Destroy awareness
    if (this.awareness.has(key)) {
      const awareness = this.awareness.get(key);
      awareness.destroy();
      this.awareness.delete(key);
    }

    console.log(`🗑️ Closed collaborative doc ${key}`);
  }
}

// Create singleton instance
const yjsManager = new YjsDocumentManager();

export default yjsManager;
