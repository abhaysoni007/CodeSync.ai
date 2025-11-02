import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import FileVersion from '../models/FileVersion.js';
import File from '../models/File.js';
import crypto from 'crypto';

/**
 * Yjs Document Manager
 * Manages collaborative editing with Yjs documents
 */
class YjsDocumentManager {
  constructor() {
    // Map of document instances: key = "roomId:fileId"
    this.docs = new Map();
    
    // Map of awareness instances
    this.awareness = new Map();
    
    // Debounce timers for saving
    this.saveTimers = new Map();
  }

  /**
   * Get or create Yjs document for a room/file pair
   */
  async getDocument(roomId, fileId) {
    const key = `${roomId}:${fileId}`;
    
    if (this.docs.has(key)) {
      return this.docs.get(key);
    }

    // Create new Yjs document
    const ydoc = new Y.Doc();
    
    // Load existing content from database
    await this.loadDocumentFromDB(ydoc, fileId);
    
    // Listen for updates to persist
    ydoc.on('update', (update) => {
      this.scheduleDocumentSave(roomId, fileId, ydoc, update);
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
  getAwareness(roomId, fileId) {
    const key = `${roomId}:${fileId}`;
    return this.awareness.get(key);
  }

  /**
   * Load document content from MongoDB
   */
  async loadDocumentFromDB(ydoc, fileId) {
    try {
      // Get file from database
      const file = await File.findById(fileId);
      
      if (!file) {
        console.log(`File ${fileId} not found, initializing empty document`);
        return;
      }

      // Get latest version with Yjs update
      const latestVersion = await FileVersion.findOne({ fileId })
        .sort({ versionNumber: -1 })
        .limit(1);

      if (latestVersion && latestVersion.diff) {
        // If we have a Yjs update stored, apply it
        try {
          const updateBuffer = Buffer.from(latestVersion.diff, 'base64');
          Y.applyUpdate(ydoc, updateBuffer);
          console.log(`✅ Loaded Yjs state for file ${fileId}`);
        } catch (error) {
          console.error('Error applying Yjs update:', error);
          // Fallback to content
          this.initializeFromContent(ydoc, file.content);
        }
      } else {
        // Initialize from file content
        this.initializeFromContent(ydoc, file.content);
      }
    } catch (error) {
      console.error('Error loading document from DB:', error);
    }
  }

  /**
   * Initialize Yjs document from plain text content
   */
  initializeFromContent(ydoc, content) {
    const ytext = ydoc.getText('monaco');
    ytext.insert(0, content || '');
  }

  /**
   * Schedule document save with debouncing (5 seconds)
   */
  scheduleDocumentSave(roomId, fileId, ydoc, update) {
    const key = `${roomId}:${fileId}`;
    
    // Clear existing timer
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.saveDocumentToDB(roomId, fileId, ydoc, update);
    }, 5000); // 5 second debounce

    this.saveTimers.set(key, timer);
  }

  /**
   * Save document to MongoDB
   */
  async saveDocumentToDB(roomId, fileId, ydoc, update) {
    try {
      // Get current content
      const ytext = ydoc.getText('monaco');
      const content = ytext.toString();

      // Update file content
      const file = await File.findById(fileId);
      if (!file) {
        console.error(`File ${fileId} not found for saving`);
        return;
      }

      file.content = content;
      file.size = Buffer.byteLength(content, 'utf8');
      file.metadata.lineCount = content.split('\n').length;
      await file.save();

      // Save Yjs state vector as a version
      const stateVector = Y.encodeStateAsUpdate(ydoc);
      const stateBase64 = Buffer.from(stateVector).toString('base64');
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');

      // Get version number
      const lastVersion = await FileVersion.findOne({ fileId })
        .sort({ versionNumber: -1 })
        .limit(1);
      
      const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

      // Create new version
      const version = new FileVersion({
        fileId,
        versionNumber,
        content,
        contentHash,
        diff: stateBase64, // Store Yjs state as diff
        createdBy: file.lastModifiedBy || file.createdBy,
        message: 'Auto-saved collaborative changes',
        size: file.size,
        isAutoSave: true,
        metadata: {
          linesAdded: 0,
          linesRemoved: 0,
          charactersAdded: content.length,
          charactersRemoved: 0
        }
      });

      await version.save();
      
      console.log(`✅ Saved version ${versionNumber} for file ${fileId}`);
    } catch (error) {
      console.error('Error saving document to DB:', error);
    }
  }

  /**
   * Remove document from memory
   */
  closeDocument(roomId, fileId) {
    const key = `${roomId}:${fileId}`;
    
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

    console.log(`🗑️ Closed document ${key}`);
  }

  /**
   * Get sync message for a document
   */
  getSyncMessage(roomId, fileId, encodedState) {
    const ydoc = this.docs.get(`${roomId}:${fileId}`);
    if (!ydoc) return null;

    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(encodedState);
    const messageType = decoding.readVarUint(decoder);

    syncProtocol.readSyncMessage(decoder, encoder, ydoc, null);
    
    return encoding.toUint8Array(encoder);
  }
}

// Create singleton instance
const yjsManager = new YjsDocumentManager();

export default yjsManager;
