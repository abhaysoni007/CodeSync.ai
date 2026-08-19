import { describe, it, expect, afterEach } from 'vitest';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import yjsManager, { normalizeKey, normalizePathArray } from './YjsManager.js';

describe('YjsManager & CRDT Collaboration Engine', () => {
  const projectId = '6a847f13e72787dac325b3f1';
  const nonExistentFile = 'src/virtual_crdt_test.js';

  afterEach(() => {
    yjsManager.closeDocument(projectId, nonExistentFile);
    yjsManager.closeDocument(projectId, ['src', 'virtual_crdt_test.js']);
    yjsManager.closeDocument(projectId, 'src/index.js');
  });

  describe('Key & Path Normalization', () => {
    it('normalizes string and array file paths to identical document keys', () => {
      const key1 = normalizeKey(projectId, 'src/app.js');
      const key2 = normalizeKey(projectId, ['src', 'app.js']);
      expect(key1).toBe(`${projectId}:src/app.js`);
      expect(key2).toBe(`${projectId}:src/app.js`);
    });

    it('filters out leading root segments in normalizePathArray', () => {
      expect(normalizePathArray(['root', 'src', 'app.js'])).toEqual(['src', 'app.js']);
      expect(normalizePathArray('root/src/app.js')).toEqual(['src', 'app.js']);
      expect(normalizePathArray('src/app.js')).toEqual(['src', 'app.js']);
    });
  });

  describe('Document Creation & Lifecycle', () => {
    it('loads existing file from disk if present', async () => {
      const doc = await yjsManager.getDocument(projectId, 'src/index.js', 'Fallback Code');
      expect(doc).toBeInstanceOf(Y.Doc);
      const text = doc.getText('monaco').toString();
      expect(text).toContain('console.log');
    });

    it('initializes from fallback content if file does not exist on disk', async () => {
      const initialCode = 'console.log("CRDT Virtual");';
      const doc = await yjsManager.getDocument(projectId, nonExistentFile, initialCode);
      
      expect(doc).toBeInstanceOf(Y.Doc);
      const text = doc.getText('monaco').toString();
      expect(text).toBe(initialCode);
    });

    it('returns the cached document on subsequent calls', async () => {
      const doc1 = await yjsManager.getDocument(projectId, nonExistentFile, 'Initial');
      const doc2 = await yjsManager.getDocument(projectId, ['src', 'virtual_crdt_test.js']);
      expect(doc1).toBe(doc2);
    });

    it('creates an associated awareness instance', async () => {
      await yjsManager.getDocument(projectId, nonExistentFile, 'test');
      const awareness = yjsManager.getAwareness(projectId, nonExistentFile);
      expect(awareness).toBeInstanceOf(awarenessProtocol.Awareness);
    });

    it('properly closes and destroys documents and awareness on closeDocument', async () => {
      await yjsManager.getDocument(projectId, nonExistentFile, 'test');
      expect(yjsManager.docs.has(normalizeKey(projectId, nonExistentFile))).toBe(true);

      yjsManager.closeDocument(projectId, nonExistentFile);
      expect(yjsManager.docs.has(normalizeKey(projectId, nonExistentFile))).toBe(false);
      expect(yjsManager.awareness.has(normalizeKey(projectId, nonExistentFile))).toBe(false);
    });
  });

  describe('Sync Protocol & Conflict-Free Resolution', () => {
    it('handles binary sync messages between client and server', async () => {
      const doc = await yjsManager.getDocument(projectId, nonExistentFile, 'Hello World');
      
      // Simulate client requesting sync step 1
      const clientDoc = new Y.Doc();
      const clientEncoder = encoding.createEncoder();
      syncProtocol.writeSyncStep1(clientEncoder, clientDoc);
      const step1Message = encoding.toUint8Array(clientEncoder);

      // Server processes step 1 and returns sync step 2
      const reply = yjsManager.handleSyncMessage(doc, step1Message);
      expect(reply).not.toBeNull();
      expect(reply.byteLength).toBeGreaterThan(0);

      // Client applies reply
      const replyDecoder = decoding.createDecoder(reply);
      syncProtocol.readSyncMessage(replyDecoder, encoding.createEncoder(), clientDoc, null);
      
      expect(clientDoc.getText('monaco').toString()).toBe('Hello World');
    });

    it('synchronizes concurrent bidirectional edits without conflicts', async () => {
      const serverDoc = await yjsManager.getDocument(projectId, nonExistentFile, 'Base Text');
      const clientDoc = new Y.Doc();

      // Step 1: Initial Sync
      const enc1 = encoding.createEncoder();
      syncProtocol.writeSyncStep1(enc1, clientDoc);
      const reply1 = yjsManager.handleSyncMessage(serverDoc, encoding.toUint8Array(enc1));
      syncProtocol.readSyncMessage(decoding.createDecoder(reply1), encoding.createEncoder(), clientDoc, null);

      // Step 2: Client inserts text at the beginning
      clientDoc.getText('monaco').insert(0, '[Prefix] ');
      const clientUpdate = Y.encodeStateAsUpdate(clientDoc);

      // Step 3: Server applies update
      Y.applyUpdate(serverDoc, clientUpdate);
      expect(serverDoc.getText('monaco').toString()).toBe('[Prefix] Base Text');

      // Step 4: Server inserts text at the end
      serverDoc.getText('monaco').insert(serverDoc.getText('monaco').length, ' [Suffix]');
      const serverUpdate = Y.encodeStateAsUpdate(serverDoc);

      // Step 5: Client applies server update
      Y.applyUpdate(clientDoc, serverUpdate);
      expect(clientDoc.getText('monaco').toString()).toBe('[Prefix] Base Text [Suffix]');
      expect(serverDoc.getText('monaco').toString()).toBe(clientDoc.getText('monaco').toString());
    });
  });
});
