import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import * as fileAPI from '../services/fileAPI';
import { makeActiveFile } from '../utils/fileIdentity';
import { isPreviewable } from '../utils/runners';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

import ProjectTimeline from '../components/ProjectTimeline';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import FileExplorer from '../components/FileExplorer';
import ActivityBar from '../components/ActivityBar';
import ExtensionsPanel from '../components/ExtensionsPanel';
import SearchPanel from '../components/SearchPanel';
import PortsPanel from '../components/PortsPanel';
import CommandPalette from '../components/CommandPalette';
import VideoChatPanel from '../components/VideoChatPanel';
import TerminalPanel from '../components/TerminalPanel';
import { useTerminalStore } from '../stores/terminalStore';
import AIToggleButton from '../components/AIInterface/AIToggleButton';
import AIInterface from '../components/AIInterface';
import '../components/FileExplorer.css';
import './ProjectRoom.css';
import {
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Save,
  Users,
  MessageSquare,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Send,
  X,
  Settings,
  ArrowLeft,
  FileCode,
  Folder,
  ChevronLeft,
  Clock,
  History,
  Globe,
} from 'lucide-react';

const isSamePath = (p1, p2) => {
  if (!p1 || !p2) return false;
  const str1 = Array.isArray(p1) ? p1.join('/') : String(p1);
  const str2 = Array.isArray(p2) ? p2.join('/') : String(p2);
  return str1 === str2;
};

// Generate consistent color for each user
const generateUserColor = (userId) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52C41A', '#1890FF', '#722ED1',
    '#EB2F96', '#FA8C16', '#13C2C2', '#2F54EB'
  ];
  
  if (!userId) return colors[0];
  const hash = String(userId).split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

const ProjectRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [project, setProject] = useState(null);
  const [sidebarView, setSidebarView] = useState('explorer');

  /**
   * Open editor tabs.
   * Tab shape: { key, name, path, content, saved, loading }.
   */
  const [tabs, setTabs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const closedStack = useRef([]);
  const [autosave, setAutosave] = useState(
    () => localStorage.getItem('codesync:autosave') === 'true'
  );
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [palette, setPalette] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  
  // Activity Timeline State
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  
  // Version History State
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);
  
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const socketRef = useRef(null);
  const announcedConnect = useRef(false);

  const activeTab = tabs.find((t) => t.key === activeKey) || null;
  const activeFile = activeTab
    ? { _id: activeTab.key, name: activeTab.name, path: activeTab.path, content: activeTab.content }
    : null;
  const code = activeTab?.content ?? '';
  const isDirty = (tab) => tab && tab.content !== tab.saved;
  const dirtyTabs = tabs.filter(isDirty);

  const patchTab = (key, patch) =>
    setTabs((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  const activeFileRef = useRef(null);
  const showChatRef = useRef(true);
  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Yjs CRDT References
  const ydocRef = useRef(null);
  const awarenessRef = useRef(null);
  const bindingRef = useRef(null);
  const currentBoundPathRef = useRef(null);

  // Socket.IO connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');

    if (!user?.id) return undefined;

    const socketInstance = io(API_URL, {
      auth: { token },
      query: { projectId: id },
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
      if (!announcedConnect.current) {
        announcedConnect.current = true;
        toast.success('Connected to collaboration server');
      }
      
      // Join project room
      socketRef.current.emit('join-project', { projectId: id, userId: user?.id });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.io.on('reconnect_failed', () => {
      toast.error('Lost connection to the collaboration server');
    });

    socketRef.current.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
      if (!showChatRef.current && data.userId !== user?.id) {
        setUnreadMessages(prev => prev + 1);
      }
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    socketRef.current.on('user-typing', ({ userId, username, isTyping }) => {
      if (userId === user?.id) return;
      
      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.find(u => u.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        } else {
          return prev.filter(u => u.userId !== userId);
        }
      });
    });

    socketRef.current.on('users-online', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('filesystem:deleted', ({ path: deletedPath }) => {
      if (activeFile?.path && isSamePath(deletedPath, activeFile.path)) {
        closeTab(activeKey);
      }
    });

    socketRef.current.on('version:created', (data) => {
      console.log('Realtime version event:', data);
      toast.success(`Version v${data.versionNumber} ${data.action === 'restore' ? 'restored' : 'saved'}`);
      if (data.action === 'restore' && data.content !== undefined) {
        if (activeKey) {
          patchTab(activeKey, { content: data.content, saved: data.content });
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id, user]);

  useEffect(() => {
    loadProject();
    loadMessages();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await api.getProject(id);
      setProject(response.data.data.project);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      navigate('/dashboard');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get(`/projects/${id}/messages?limit=50`);
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  /**
   * Yjs CRDT Collaboration Binding with Monaco Editor
   */
  useEffect(() => {
    const editor = editorRef.current;
    const socketInstance = socketRef.current;

    if (!editor || !socketInstance || !activeFile?.path) {
      return;
    }

    const pathStr = Array.isArray(activeFile.path) ? activeFile.path.join('/') : String(activeFile.path);

    // Clean up any existing Yjs binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (awarenessRef.current) {
      awarenessRef.current.destroy();
      awarenessRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (currentBoundPathRef.current && currentBoundPathRef.current !== pathStr) {
      socketInstance.emit('yjs:leave-file', {
        projectId: id,
        filePath: currentBoundPathRef.current
      });
    }

    currentBoundPathRef.current = pathStr;

    // 1. Create new Y.Doc and Awareness
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');
    const awareness = new awarenessProtocol.Awareness(ydoc);
    awarenessRef.current = awareness;

    // 2. Set local user state in Awareness
    const userColor = generateUserColor(user?.id || 'default');
    awareness.setLocalStateField('user', {
      name: user?.username || 'Anonymous',
      color: userColor,
      colorLight: `${userColor}33`,
    });

    // 3. Bind Yjs Text to Monaco Model
    const model = editor.getModel();
    if (model) {
      bindingRef.current = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        awareness
      );
    }

    // 4. Update tab content when document text changes
    const handleYdocChange = () => {
      const currentText = ytext.toString();
      if (activeKey) {
        patchTab(activeKey, { content: currentText });
      }
    };
    ytext.observe(handleYdocChange);

    // 5. Send local document updates to socket
    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'remote-socket' && socketInstance.connected) {
        const encoder = encoding.createEncoder();
        syncProtocol.writeUpdate(encoder, update);
        
        socketInstance.emit('yjs:sync', {
          projectId: id,
          filePath: activeFile.path,
          update: encoding.toUint8Array(encoder)
        });
      }
    };
    ydoc.on('update', handleLocalUpdate);

    // 6. Send local awareness updates (cursors/selections) to socket
    const handleLocalAwareness = ({ added, updated, removed }, origin) => {
      if (origin !== 'remote-socket' && socketInstance.connected) {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        
        socketInstance.emit('yjs:awareness', {
          projectId: id,
          filePath: activeFile.path,
          update: encoding.toUint8Array(encoder)
        });
      }
    };
    awareness.on('update', handleLocalAwareness);

    // 7. Receive remote Yjs sync updates
    const handleRemoteSync = ({ filePath, update }) => {
      if (!isSamePath(filePath, activeFile.path) || !ydocRef.current) return;
      
      try {
        const uint8 = update instanceof Uint8Array ? update : new Uint8Array(update);
        const decoder = decoding.createDecoder(uint8);
        const encoder = encoding.createEncoder();
        
        syncProtocol.readSyncMessage(decoder, encoder, ydocRef.current, 'remote-socket');

        if (encoding.length(encoder) > 0 && socketInstance.connected) {
          socketInstance.emit('yjs:sync', {
            projectId: id,
            filePath: activeFile.path,
            update: encoding.toUint8Array(encoder)
          });
        }
      } catch (err) {
        console.error('[Yjs] Error applying remote sync:', err);
      }
    };

    // 8. Receive remote awareness updates (peer cursors)
    const handleRemoteAwareness = ({ filePath, update }) => {
      if (!isSamePath(filePath, activeFile.path) || !awarenessRef.current) return;
      
      try {
        const uint8 = update instanceof Uint8Array ? update : new Uint8Array(update);
        awarenessProtocol.applyAwarenessUpdate(awarenessRef.current, uint8, 'remote-socket');
      } catch (err) {
        console.error('[Yjs] Error applying remote awareness:', err);
      }
    };

    socketInstance.on('yjs:sync', handleRemoteSync);
    socketInstance.on('yjs:awareness', handleRemoteAwareness);

    // 9. Join the file room on the backend
    socketInstance.emit('yjs:join-file', {
      projectId: id,
      filePath: activeFile.path,
      initialContent: activeFile.content || ''
    });

    return () => {
      socketInstance.off('yjs:sync', handleRemoteSync);
      socketInstance.off('yjs:awareness', handleRemoteAwareness);
      ytext.unobserve(handleYdocChange);
      ydoc.off('update', handleLocalUpdate);
      awareness.off('update', handleLocalAwareness);

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (awarenessRef.current) {
        awarenessRef.current.destroy();
        awarenessRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, [id, activeKey, activeFile?.path, user, editorInstance]);

  const handleSaveFile = async () => {
    if (!activeTab || !activeTab.path) return;

    try {
      setSaveState('saving');
      const currentContent = editorRef.current?.getValue() || activeTab.content;
      await fileAPI.updateFileContent(id, { path: activeTab.path, content: currentContent });
      patchTab(activeTab.key, { saved: currentContent, content: currentContent });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
      toast.success('File saved');
    } catch (error) {
      console.error('Failed to save file:', error);
      setSaveState('error');
      toast.error('Failed to save file');
    }
  };

  const saveRef = useRef(handleSaveFile);
  useEffect(() => { saveRef.current = handleSaveFile; }, [handleSaveFile]);

  // Open / Close Tab helpers
  const openFile = async (node, pathArray) => {
    if (node.type !== 'file') return;
    const next = makeActiveFile(node, pathArray);
    const key = Array.isArray(pathArray) ? pathArray.join('/') : String(pathArray);

    const existing = tabs.find(t => t.key === key);
    if (existing) {
      setActiveKey(key);
      return;
    }

    const newTab = {
      key,
      name: node.name,
      path: pathArray,
      content: node.content || '',
      saved: node.content || '',
      loading: false
    };

    setTabs(prev => [...prev, newTab]);
    setActiveKey(key);

    try {
      const res = await fileAPI.getFileContent(id, pathArray);
      if (res?.success && res.data?.content !== undefined) {
        patchTab(key, { content: res.data.content, saved: res.data.content });
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  };

  const openFileByPath = async (pathStr, line) => {
    const parts = pathStr.split('/').filter(Boolean);
    const name = parts[parts.length - 1] || 'untitled';
    await openFile({ name, type: 'file' }, parts);
    if (line && editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
    }
  };

  const closeTab = (key) => {
    const idx = tabs.findIndex(t => t.key === key);
    if (idx === -1) return;

    const closing = tabs[idx];
    closedStack.current.push(closing);

    const newTabs = tabs.filter(t => t.key !== key);
    setTabs(newTabs);

    if (activeKey === key) {
      const nextTab = newTabs[idx] || newTabs[idx - 1] || null;
      setActiveKey(nextTab ? nextTab.key : null);
    }
  };

  const runFile = (node, pathArray) => {
    const filePath = Array.isArray(pathArray) ? pathArray.join('/') : String(pathArray);
    setShowTerminal(true);
    const termSocket = socketRef.current;
    if (termSocket) {
      termSocket.emit('terminal:run-file', { projectId: id, filePath });
    }
  };

  const goToLine = (lineNumber) => {
    if (editorRef.current && lineNumber > 0) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column: 1 });
      editorRef.current.focus();
    }
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('user-typing', { projectId: id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('user-typing', { projectId: id, isTyping: false });
      }, 2000);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('chat-message', {
      projectId: id,
      message: newMessage.trim()
    }, (res) => {
      if (res && !res.success) {
        toast.error('Failed to send message');
      }
    });
    setNewMessage('');
  };

  const getFileLanguage = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      markdown: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
    };
    return languageMap[ext] || 'plaintext';
  };

  const commands = [
    { id: 'save', label: 'Save Current File', shortcut: 'Ctrl+S', run: () => saveRef.current() },
    { id: 'quick-open', label: 'Quick Open File', shortcut: 'Ctrl+P', run: () => setPalette('file') },
    { id: 'go-to-line', label: 'Go to Line...', shortcut: 'Ctrl+G', run: () => setPalette('line') },
    { id: 'toggle-terminal', label: 'Toggle Integrated Terminal', shortcut: 'Ctrl+`', run: () => setShowTerminal(v => !v) },
    { id: 'version-history', label: 'View Version History', run: () => setShowVersionHistory(true) },
    { id: 'activity-timeline', label: 'View Project Activity Timeline', run: () => setShowActivityPanel(true) },
  ];

  return (
    <div className="flex flex-col h-screen bg-vscode-bg text-vscode-text">
      {/* Top Header */}
      <div className="h-12 bg-vscode-panel border-b border-vscode-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 hover:bg-vscode-bg rounded transition-colors text-vscode-textMuted hover:text-vscode-text"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-vscode-accent" />
            <h1 className="font-semibold text-sm">{project?.name || 'Project'}</h1>
            <span className="text-xs text-vscode-textMuted px-2 py-0.5 rounded bg-vscode-bg">
              {project?.joinCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Version History Toggle */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
              showVersionHistory 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
            title="Version Control"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          {/* Activity Timeline Toggle */}
          <button
            onClick={() => setShowActivityPanel(!showActivityPanel)}
            className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
              showActivityPanel 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
            title="Activity Timeline"
          >
            <Clock className="w-4 h-4" />
            <span>Activity</span>
          </button>

          {/* Terminal Toggle */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showTerminal 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
          >
            Terminal
          </button>

          {/* Open Preview */}
          {activeFile && isPreviewable(activeFile.name) && (
            <button
              onClick={() => window.open(fileAPI.previewUrl(id, activeFile.path), '_blank', 'noopener')}
              className="px-3 py-1.5 text-sm rounded bg-vscode-bg text-vscode-text hover:bg-vscode-border"
              title="Open in browser"
            >
              <Globe className="w-4 h-4 mr-1.5 inline" />
              Preview
            </button>
          )}

          {/* Save Button */}
          {activeFile && (
            <button
              onClick={handleSaveFile}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-vscode-border">
            <div className="w-7 h-7 rounded-full bg-vscode-accent text-white flex items-center justify-center font-medium text-xs">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-vscode-text font-medium">{user?.username}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (VS Code left strip) */}
        <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />

        {/* Primary Sidebar */}
        {sidebarView && (
          <aside className="w-64 bg-vscode-panel border-r border-vscode-border flex flex-col">
            {sidebarView === 'explorer' && (
              <FileExplorer
                projectId={id}
                socket={socket}
                activeFile={activeFile}
                onFileSelect={openFile}
                onRunFile={runFile}
              />
            )}
            {sidebarView === 'search' && (
              <SearchPanel
                projectId={id}
                onOpenResult={(hit) => openFileByPath(hit.path, hit.line)}
              />
            )}
            {sidebarView === 'ports' && <PortsPanel projectId={id} />}
            {sidebarView === 'extensions' && <ExtensionsPanel />}
          </aside>
        )}

        {/* Central Editor & Tabs Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-vscode-bg">
          {activeFile ? (
            <>
              {/* Tab Bar */}
              <div className="h-9 bg-vscode-sidebar border-b border-vscode-border flex items-center justify-between px-2 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {tabs.map((tab) => (
                    <div
                      key={tab.key}
                      onClick={() => setActiveKey(tab.key)}
                      className={`group flex items-center gap-2 px-3 py-1 text-xs rounded-t border-b-2 cursor-pointer transition-colors ${
                        activeKey === tab.key
                          ? 'bg-vscode-bg text-vscode-text border-vscode-accent'
                          : 'bg-transparent text-vscode-textMuted border-transparent hover:bg-vscode-panel'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{tab.name}</span>
                      {isDirty(tab) && (
                        <span className="w-2 h-2 rounded-full bg-vscode-accent" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.key);
                        }}
                        className="p-0.5 rounded hover:bg-vscode-border opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mr-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="CRDT Live Sync Active" />
                  <span className="text-xs text-vscode-textMuted font-mono">Yjs CRDT</span>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  language={getFileLanguage(activeFile.name)}
                  defaultValue={activeFile.content || ''}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme('codesync-dark', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
                        { token: 'keyword', foreground: 'E8A855' },
                        { token: 'string', foreground: '9ECE6A' },
                        { token: 'number', foreground: 'F0BE7A' },
                      ],
                      colors: {
                        'editor.background': '#0D0F12',
                        'editor.foreground': '#F4F4F5',
                        'editorLineNumber.foreground': '#4B5563',
                        'editorLineNumber.activeForeground': '#E8A855',
                        'editor.selectionBackground': '#3A2A1466',
                        'editor.inactiveSelectionBackground': '#3A2A1433',
                        'editorCursor.foreground': '#E8A855',
                        'editor.lineHighlightBackground': '#1C202766',
                        'editorIndentGuide.background': '#292E38',
                        'editorIndentGuide.activeBackground': '#4B5563',
                        'editorWidget.background': '#1C2027',
                        'editorWidget.border': '#292E38',
                        'editorSuggestWidget.background': '#1C2027',
                        'editorSuggestWidget.selectedBackground': '#3A2A14',
                        'scrollbarSlider.background': '#29303840',
                        'scrollbarSlider.hoverBackground': '#E8A85540',
                      },
                    });
                  }}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    setEditorInstance(editor);

                    editor.onDidChangeCursorPosition((e) => {
                      setCursorPosition({ lineNumber: e.position.lineNumber, column: e.position.column });
                    });

                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                      saveRef.current();
                    });

                    editor.focus();
                  }}
                  theme="codesync-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: '"JetBrains Mono", Consolas, Monaco, monospace',
                    fontLigatures: true,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: true,
                    smoothScrolling: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    quickSuggestions: true,
                    folding: true,
                    foldingStrategy: 'indentation',
                    showFoldingControls: 'always',
                    matchBrackets: 'always',
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                  }}
                />
              </div>

              {/* Editor Status Bar */}
              <div className="h-6 bg-vscode-panel border-t border-vscode-border flex items-center justify-between px-4 text-xs text-vscode-textMuted">
                <div className="flex items-center gap-4">
                  <span>Line {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
                  <span className="capitalize">{getFileLanguage(activeFile.name)}</span>
                  <span className={saveState === 'error' ? 'text-red-400' : ''}>
                    {saveState === 'saving'
                      ? 'Saving…'
                      : saveState === 'error'
                        ? 'Save failed'
                        : isDirty(activeTab)
                          ? 'Unsaved'
                          : 'Saved'}
                  </span>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Connected
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-vscode-textMuted bg-[#0D0F12]">
              <FileCode className="w-16 h-16 mb-4 text-vscode-border" />
              <p className="text-lg font-medium text-vscode-text">No file open</p>
              <p className="text-sm mt-1">Select a file from the explorer to begin collaborative editing</p>
            </div>
          )}

          {/* Integrated Terminal Panel */}
          {showTerminal && (
            <div className="h-64 border-t border-vscode-border">
              <TerminalPanel
                socket={socket}
                projectId={id}
                isVisible={showTerminal}
                onToggle={() => setShowTerminal(!showTerminal)}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar - Video & Project Chat */}
        <div className="w-80 border-l border-vscode-border flex flex-col bg-vscode-panel">
          <VideoChatPanel
            socket={socket}
            projectId={id}
            user={user}
            currentUser={user}
            onlineUsers={onlineUsers}
            messages={messages}
            onSendMessage={handleSendMessage}
            newMessage={newMessage}
            onMessageChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            typingUsers={typingUsers}
            showChat={showChat}
            onToggleChat={(isChat) => {
              setShowChat(isChat);
              if (isChat) setUnreadMessages(0);
            }}
            unreadMessages={unreadMessages}
          />
        </div>

        {/* Activity Timeline Slide-out */}
        {showActivityPanel && (
          <aside className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col z-40">
            <div className="flex items-center justify-between p-3 border-b border-vscode-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-vscode-accent" />
                <h2 className="font-semibold text-sm text-white">Activity Timeline</h2>
              </div>
              <button
                onClick={() => setShowActivityPanel(false)}
                className="p-1 hover:bg-vscode-bg rounded text-vscode-textMuted hover:text-vscode-text transition-colors"
                title="Close Activity Timeline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProjectTimeline projectId={id} socket={socket} />
            </div>
          </aside>
        )}

        {/* Version History Slide-out */}
        {showVersionHistory && (
          <VersionHistoryPanel
            activeFile={activeTab}
            projectId={id}
            currentCode={activeTab?.content || ''}
            onClose={() => setShowVersionHistory(false)}
            onVersionRestored={(restoredCode) => {
              if (activeTab) {
                patchTab(activeTab.key, { content: restoredCode, saved: restoredCode });
              }
            }}
          />
        )}
      </div>

      {/* Command Palette */}
      {palette && (
        <CommandPalette
          mode={palette}
          commands={commands}
          fileTree={fileTree}
          onRunCommand={(command) => command.run()}
          onOpenFile={(file) => openFileByPath(file.path)}
          onGoToLine={goToLine}
          onClose={() => setPalette(null)}
        />
      )}

      {/* Floating AI Assistant (Ask Mode) */}
      <AIToggleButton />
      <AIInterface />
    </div>
  );
};

export default ProjectRoom;
