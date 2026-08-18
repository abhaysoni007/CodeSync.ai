import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import * as fileAPI from '../services/fileAPI';
import { makeActiveFile } from '../utils/fileIdentity';
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
import FileExplorer from '../components/FileExplorer';
import ActivityBar from '../components/ActivityBar';
import ExtensionsPanel from '../components/ExtensionsPanel';
import VideoChatPanel from '../components/VideoChatPanel';
import TerminalPanel from '../components/TerminalPanel';
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
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});
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
  
  const socketRef = useRef(null);
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

    socketRef.current = io(API_URL, {
      auth: { token },
      query: { projectId: id },
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      toast.success('Connected to collaboration server');
      
      // Join project room
      socketRef.current.emit('join-project', { projectId: id, userId: user?.id });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      toast.error('Disconnected from server');
    });

    // Presence & Chat events
    socketRef.current.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
      if (!showChat) {
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

    socketRef.current.on('filesystem:deleted', ({ path }) => {
      if (activeFile?.path && isSamePath(path, activeFile.path)) {
        setActiveFile(null);
        setCode('');
      }
    });

    socketRef.current.on('user-joined', (userData) => {
      toast.success(`${userData.username} joined the project`);
    });

    socketRef.current.on('user-left', (userData) => {
      toast(`${userData.username} left the project`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-project', { projectId: id });
        socketRef.current.disconnect();
      }
    };
  }, [id, user]);

  // Load project data
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
    const socket = socketRef.current;

    if (!editor || !socket || !activeFile?.path) {
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
      socket.emit('yjs:leave-file', {
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

    // 4. Update local state when document text changes
    const handleYdocChange = () => {
      setCode(ytext.toString());
    };
    ytext.observe(handleYdocChange);

    // 5. Send local document updates to socket
    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'remote-socket' && socket.connected) {
        const encoder = encoding.createEncoder();
        syncProtocol.writeUpdate(encoder, update);
        
        socket.emit('yjs:sync', {
          projectId: id,
          filePath: activeFile.path,
          update: encoding.toUint8Array(encoder)
        });
      }
    };
    ydoc.on('update', handleLocalUpdate);

    // 6. Send local awareness updates (cursors/selections) to socket
    const handleLocalAwareness = ({ added, updated, removed }, origin) => {
      if (origin !== 'remote-socket' && socket.connected) {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        
        socket.emit('yjs:awareness', {
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

        if (encoding.length(encoder) > 0 && socket.connected) {
          socket.emit('yjs:sync', {
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

    socket.on('yjs:sync', handleRemoteSync);
    socket.on('yjs:awareness', handleRemoteAwareness);

    // 9. Join the file room on the backend
    socket.emit('yjs:join-file', {
      projectId: id,
      filePath: activeFile.path,
      initialContent: activeFile.content || ''
    });

    return () => {
      socket.off('yjs:sync', handleRemoteSync);
      socket.off('yjs:awareness', handleRemoteAwareness);
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
  }, [id, activeFile, user, editorInstance]);

  const handleSaveFile = async () => {
    if (!activeFile?.path) return;

    try {
      const currentContent = editorRef.current?.getValue() || code;
      await fileAPI.updateFileContent(id, { path: activeFile.path, content: currentContent });
      
      if (socketRef.current) {
        socketRef.current.emit('filesystem:file-updated', {
          projectId: id,
          path: activeFile.path,
          content: currentContent,
        });
      }
      toast.success('File saved');
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
    }
  };

  const handleTyping = () => {
    if (!socketRef.current || !id) return;
    socketRef.current.emit('typing', { projectId: id, isTyping: true });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (!socketRef.current || !id) return;
    socketRef.current.emit('typing', { projectId: id, isTyping: false });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    handleStopTyping();

    const messageData = {
      projectId: id,
      message: newMessage.trim(),
    };

    if (socketRef.current) {
      socketRef.current.emit('chat-message', messageData, (response) => {
        if (response && !response.success) {
          toast.error('Failed to send message');
        }
      });
      setNewMessage('');
    }
  };

  const openFile = async (node, path) => {
    if (node.type !== 'file') return;

    const next = makeActiveFile(node, path);
    setActiveFile(next);
    setCode(next.content);

    try {
      const res = await fileAPI.getFileContent(id, path);
      if (res?.success) {
        setCode(res.data?.content ?? '');
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
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

          {/* Chat Toggle */}
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setUnreadMessages(0);
            }}
            className={`relative px-3 py-1.5 text-sm rounded transition-colors ${
              showChat 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Chat
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </button>

          {/* Save Button */}
          {activeFile && (
            <button
              onClick={handleSaveFile}
              className="px-3 py-1.5 text-sm bg-vscode-accent text-white rounded hover:bg-opacity-90 transition-colors flex items-center gap-1"
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

        {/* Primary Sidebar (Explorer / Extensions) */}
        {sidebarView && (
          <div className="w-64 bg-vscode-panel border-r border-vscode-border flex flex-col">
            {sidebarView === 'explorer' && (
              <FileExplorer
                projectId={id}
                socket={socketRef.current}
                activeFile={activeFile}
                onFileSelect={openFile}
              />
            )}
            {sidebarView === 'extensions' && <ExtensionsPanel />}
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeFile ? (
            <>
              {/* Tab Bar */}
              <div className="h-9 bg-vscode-panel border-b border-vscode-border flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-vscode-accent" />
                  <span className="text-sm">{activeFile.name}</span>
                  <span className="text-xs text-vscode-textMuted">
                    ({Array.isArray(activeFile.path) ? activeFile.path.join('/') : activeFile.path})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="CRDT Live Sync Active" />
                  <span className="text-xs text-vscode-textMuted font-mono">Yjs CRDT</span>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1">
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

                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                      handleSaveFile();
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-vscode-textMuted bg-[#0D0F12]">
              <FileCode className="w-16 h-16 mb-4 text-vscode-border" />
              <p className="text-lg font-medium text-vscode-text">No file open</p>
              <p className="text-sm mt-1">Select a file from the explorer to begin collaborative editing</p>
            </div>
          )}

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-64 border-t border-vscode-border">
              <TerminalPanel projectId={id} />
            </div>
          )}
        </div>

        {/* Right Panel: Project Chat & WebRTC Calling */}
        {showChat && (
          <div className="w-80 border-l border-vscode-border flex flex-col bg-vscode-panel">
            <VideoChatPanel
              projectId={id}
              socket={socketRef.current}
              user={user}
              currentUser={user}
              messages={messages}
              newMessage={newMessage}
              onMessageChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onSendMessage={handleSendMessage}
              typingUsers={typingUsers}
              showChat={showChat}
              onToggleChat={setShowChat}
              unreadMessages={unreadMessages}
            />
          </div>
        )}

        {/* Activity Timeline Slide-out Panel */}
        {showActivityPanel && (
          <div className="w-96 border-l border-vscode-border flex flex-col bg-vscode-panel z-40">
            <div className="p-3 border-b border-vscode-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-vscode-accent" />
                <h3 className="text-sm font-semibold">Project Activity Timeline</h3>
              </div>
              <button
                onClick={() => setShowActivityPanel(false)}
                className="p-1 hover:bg-vscode-bg rounded text-vscode-textMuted hover:text-vscode-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProjectTimeline projectId={id} socket={socketRef.current} />
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Assistant Button & Panel */}
      <AIToggleButton />
      <AIInterface />
    </div>
  );
};

export default ProjectRoom;
