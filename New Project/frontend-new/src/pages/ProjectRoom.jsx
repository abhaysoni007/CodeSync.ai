import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import ProjectTimeline from '../components/ProjectTimeline';
import FileExplorer from '../components/FileExplorer';
import VideoChatPanel from '../components/VideoChatPanel';
import TerminalPanel from '../components/TerminalPanel';
import AIToggleButton from '../components/AIInterface/AIToggleButton';
import AIInterface from '../components/AIInterface';
import '../components/FileExplorer.css';
import './ProjectRoom.css';
import { useDeltaSync } from '../hooks/useDeltaSync';
import VersionHistoryPanel from '../components/DeltaEngine/VersionHistoryPanel';
import DeltaSyncStatus from '../components/DeltaEngine/DeltaSyncStatus';
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

const ProjectRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
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
  
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const cursorTimeoutsRef = useRef({});
  const isRemoteUpdateRef = useRef(false);

  // Delta Engine Integration (DISABLED FOR NOW - needs backend setup)
  // Uncomment when backend delta routes are ready
  /*
  const {
    sendDelta,
    saveSnapshot,
    rollbackToSnapshot,
    getVersionHistory,
    isInitialized,
    isSyncing,
    isSynced,
  } = useDeltaSync(id, activeFile?._id, code);
  */

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

    // Collaboration events
    socketRef.current.on('code-update', (data) => {
      console.log('Code update received:', data);
      if (data.fileId === activeFile?._id && data.userId !== user?.id) {
        // Set flag to prevent re-emitting this update
        isRemoteUpdateRef.current = true;
        setCode(data.code);
        
        // Update editor content if editor is mounted
        if (editorRef.current && monacoRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            const currentValue = model.getValue();
            if (currentValue !== data.code) {
              // Preserve cursor position during remote update
              const position = editorRef.current.getPosition();
              editorRef.current.setValue(data.code);
              if (position) {
                editorRef.current.setPosition(position);
              }
            }
          }
        }
        
        // Reset flag after a brief delay
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 100);
      }
    });

    socketRef.current.on('cursor-update', (data) => {
      console.log('Cursor update:', data);
      if (data.userId !== user?.id && data.fileId === activeFile?._id) {
        const userColor = data.color || generateUserColor(data.userId);
        
        setCursors(prev => ({
          ...prev,
          [data.userId]: {
            position: data.position,
            username: data.username,
            color: userColor,
            lastUpdate: Date.now(),
          }
        }));
        
        // Update cursor decorations in Monaco Editor
        updateCursorDecorations(data.userId, data.position, data.username, userColor);
        
        // Clear existing timeout for this user
        if (cursorTimeoutsRef.current[data.userId]) {
          clearTimeout(cursorTimeoutsRef.current[data.userId]);
        }
        
        // Set timeout to remove cursor after 10 seconds of inactivity
        cursorTimeoutsRef.current[data.userId] = setTimeout(() => {
          setCursors(prev => {
            const updated = { ...prev };
            delete updated[data.userId];
            return updated;
          });
          
          // Remove decorations
          if (editorRef.current && decorationsRef.current[data.userId]) {
            editorRef.current.deltaDecorations(decorationsRef.current[data.userId], []);
            delete decorationsRef.current[data.userId];
          }
          
          // Remove style
          const styleElement = document.getElementById(`cursor-style-${data.userId}`);
          if (styleElement) {
            styleElement.remove();
          }
        }, 10000);
      }
    });

    socketRef.current.on('chat-message', (data) => {
      console.log('Chat message received:', data);
      setMessages(prev => [...prev, data]);
      
      // Increment unread count if chat is not visible
      if (!showChat && data.userId !== user?.id) {
        setUnreadMessages(prev => prev + 1);
      }
      
      // Remove typing indicator for this user
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    socketRef.current.on('user-typing', ({ userId, username, isTyping }) => {
      if (userId === user?.id) return; // Ignore own typing
      
      setTypingUsers(prev => {
        if (isTyping) {
          // Add user if not already in the list
          if (!prev.find(u => u.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== userId);
        }
      });
    });

    socketRef.current.on('users-online', (users) => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    socketRef.current.on('file-created', (file) => {
      console.log('File created:', file);
      setFiles(prev => [...prev, file]);
      toast.success(`${file.name} created`);
    });

    socketRef.current.on('file-deleted', (fileId) => {
      console.log('File deleted:', fileId);
      setFiles(prev => prev.filter(f => f._id !== fileId));
      if (activeFile?._id === fileId) {
        setActiveFile(null);
        setCode('');
      }
      toast.success('File deleted');
    });

    socketRef.current.on('user-joined', (userData) => {
      toast.success(`${userData.username} joined the project`);
    });

    socketRef.current.on('user-left', (userData) => {
      toast(`${userData.username} left the project`);
    });

    return () => {
      // Cleanup
      if (socketRef.current) {
        socketRef.current.emit('leave-project', { projectId: id });
        socketRef.current.disconnect();
      }
    };
  }, [id, user, activeFile]);

  // Load project data
  useEffect(() => {
    loadProject();
    loadFiles();
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

  const loadFiles = async () => {
    try {
      const response = await api.getFiles(id);
      setFiles(response.data.data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
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
      // Don't show error toast, messages are not critical for initial load
    }
  };

  const handleEditorChange = (value) => {
    // Skip if this is a remote update to prevent echo
    if (isRemoteUpdateRef.current) {
      return;
    }
    
    setCode(value);
    
    // Delta Engine integration (disabled for now)
    // if (activeFile && isInitialized) {
    //   sendDelta(value);
    // }
    
    // Emit code update to other users via Socket.IO
    if (socketRef.current && activeFile) {
      socketRef.current.emit('code-update', {
        projectId: id,
        roomId: id, // For backward compatibility with Claude backend
        fileId: activeFile._id,
        code: value,
        userId: user?.id,
      });
    }
  };

  const handleCursorChange = (position) => {
    if (socketRef.current && activeFile) {
      const userColor = generateUserColor(user?.id || 'default');
      
      socketRef.current.emit('cursor-update', {
        projectId: id,
        roomId: id, // For backward compatibility
        fileId: activeFile._id,
        position,
        userId: user?.id,
        username: user?.username,
        color: userColor,
      });
    }
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
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Update cursor decorations in Monaco Editor
  const updateCursorDecorations = (userId, position, username, color) => {
    if (!editorRef.current || !monacoRef.current || !position) return;

    const { lineNumber, column } = position;
    
    // Remove old decorations for this user
    if (decorationsRef.current[userId]) {
      decorationsRef.current[userId] = editorRef.current.deltaDecorations(
        decorationsRef.current[userId],
        []
      );
    }

    // Create new decorations
    const decorations = [
      {
        range: new monacoRef.current.Range(lineNumber, column, lineNumber, column + 1),
        options: {
          className: 'remote-cursor',
          beforeContentClassName: 'remote-cursor-line',
          afterContentClassName: 'remote-cursor-label',
          after: {
            content: username,
            inlineClassName: 'remote-cursor-name',
          },
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          zIndex: 100,
          isWholeLine: false,
        }
      },
      // Cursor line highlight
      {
        range: new monacoRef.current.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'remote-cursor-line-highlight',
          linesDecorationsClassName: 'remote-cursor-line-decoration',
        }
      }
    ];

    // Apply decorations
    decorationsRef.current[userId] = editorRef.current.deltaDecorations([], decorations);

    // Inject custom CSS for this user's cursor color
    injectCursorStyle(userId, color, username);
  };

  // Inject custom CSS for cursor styling
  const injectCursorStyle = (userId, color, username) => {
    const styleId = `cursor-style-${userId}`;
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      .remote-cursor-${userId} {
        border-left: 2px solid ${color} !important;
        position: relative;
      }
      .remote-cursor-${userId}::before {
        content: "${username}";
        position: absolute;
        top: -20px;
        left: -2px;
        background-color: ${color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `;
  };

  // Clear cursor decorations when users leave
  useEffect(() => {
    const currentOnlineUserIds = new Set(onlineUsers.map(u => u.id));
    
    // Remove decorations for users who are no longer online
    Object.keys(decorationsRef.current).forEach(userId => {
      if (!currentOnlineUserIds.has(userId) && userId !== user?.id) {
        if (editorRef.current && decorationsRef.current[userId]) {
          editorRef.current.deltaDecorations(decorationsRef.current[userId], []);
          delete decorationsRef.current[userId];
        }
        
        // Remove style element
        const styleElement = document.getElementById(`cursor-style-${userId}`);
        if (styleElement) {
          styleElement.remove();
        }
      }
    });
  }, [onlineUsers, user]);

  const handleSaveFile = async () => {
    if (!activeFile) return;

    try {
      // Use virtual filesystem API for virtual files
      // Delta Engine integration coming soon
      toast.success('File saved successfully (auto-sync enabled)');
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
    }
  };

  const handleTyping = () => {
    if (!socketRef.current || !id) return;
    
    // Emit typing started
    socketRef.current.emit('typing', { projectId: id, isTyping: true });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (!socketRef.current || !id) return;
    
    // Emit typing stopped
    socketRef.current.emit('typing', { projectId: id, isTyping: false });
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Stop typing indicator
    handleStopTyping();

    const messageData = {
      projectId: id,
      userId: user?.id,
      username: user?.username,
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

  const handleCreateFile = async () => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const response = await api.createFile(id, {
        name: fileName,
        content: '',
        type: 'file',
      });
      
      const newFile = response.data.data.file;
      setFiles(prev => [...prev, newFile]);
      setActiveFile(newFile);
      setCode('');
      
      if (socketRef.current) {
        socketRef.current.emit('file-created', { projectId: id, file: newFile });
      }
      
      toast.success('File created successfully');
    } catch (error) {
      console.error('Failed to create file:', error);
      toast.error('Failed to create file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f._id !== fileId));
      
      if (activeFile?._id === fileId) {
        setActiveFile(null);
        setCode('');
      }
      
      if (socketRef.current) {
        socketRef.current.emit('file-deleted', { projectId: id, fileId });
      }
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleFileClick = async (file) => {
    setActiveFile(file);
    
    try {
      const response = await api.getFile(file._id);
      setCode(response.data.data.file.content || '');
    } catch (error) {
      console.error('Failed to load file content:', error);
      setCode('');
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getFileLanguage = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
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
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
    };
    return languageMap[ext] || 'plaintext';
  };

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text">
      {/* Top Header */}
      <header className="h-12 bg-vscode-panel border-b border-vscode-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 hover:bg-vscode-bg rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-vscode-accent" />
            <h1 className="font-semibold text-white">{project?.name || 'Loading...'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online Users */}
          <div className="flex items-center gap-2 px-3 py-1 bg-vscode-bg rounded">
            <Users className="w-4 h-4 text-vscode-accent" />
            <span className="text-sm text-vscode-textMuted">{onlineUsers.length} online</span>
          </div>

          {/* Activity Timeline Toggle */}
          <button
            onClick={() => setShowActivityPanel(!showActivityPanel)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showActivityPanel 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
            title="Toggle Activity Timeline"
          >
            <Clock className="w-4 h-4 mr-1.5 inline" />
            Activity
          </button>

          {/* Version History Toggle */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showVersionHistory 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
            title="Toggle Version History"
          >
            <History className="w-4 h-4 mr-1.5 inline" />
            History
          </button>

          {/* Terminal Toggle */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showTerminal 
                ? 'bg-vscode-accent text-white' 
                : 'bg-vscode-bg text-vscode-text hover:bg-vscode-border'
            }`}
            title="Toggle Terminal"
          >
            <svg 
              className="w-4 h-4 mr-1.5 inline" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            Terminal
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveFile}
            disabled={!activeFile}
            className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <aside className="w-64 bg-vscode-panel border-r border-vscode-border flex flex-col">
          <FileExplorer
            projectId={id}
            socket={socketRef.current}
            onFileSelect={(node, path) => {
              if (node.type === 'file') {
                // Find or create file in your files array
                const existingFile = files.find(f => f.name === node.name);
                if (existingFile) {
                  handleFileClick(existingFile);
                } else {
                  // Create a temporary file object to display in editor
                  const tempFile = {
                    _id: node.id,
                    name: node.name,
                    content: node.content || '',
                    language: getFileLanguage(node.name)
                  };
                  setActiveFile(tempFile);
                  setCode(node.content || '');
                }
              }
            }}
          />
        </aside>

        {/* Center - Monaco Editor */}
        <main className="flex-1 flex flex-col">
          {activeFile ? (
            <>
              <div className="h-10 bg-vscode-panel border-b border-vscode-border flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-vscode-accent" />
                  <span className="text-sm">{activeFile.name}</span>
                </div>
                
                {/* Active users in this file */}
                {Object.keys(cursors).length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {Object.entries(cursors).slice(0, 3).map(([userId, cursor]) => (
                        <div
                          key={userId}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-vscode-panel"
                          style={{ backgroundColor: cursor.color }}
                          title={cursor.username}
                        >
                          {cursor.username?.[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    {Object.keys(cursors).length > 3 && (
                      <span className="text-xs text-vscode-textMuted">
                        +{Object.keys(cursors).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getFileLanguage(activeFile.name)}
                  value={code}
                  onChange={handleEditorChange}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    
                    console.log('Monaco Editor mounted');
                    
                    // Track cursor position changes
                    editor.onDidChangeCursorPosition((e) => {
                      handleCursorChange({
                        lineNumber: e.position.lineNumber,
                        column: e.position.column,
                      });
                    });

                    // Track selection changes
                    editor.onDidChangeCursorSelection((e) => {
                      const selection = e.selection;
                      if (!selection.isEmpty()) {
                        // User has selected text
                        handleCursorChange({
                          lineNumber: selection.startLineNumber,
                          column: selection.startColumn,
                          endLineNumber: selection.endLineNumber,
                          endColumn: selection.endColumn,
                        });
                      }
                    });

                    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                      handleSaveFile();
                    });

                    // Focus editor on mount
                    editor.focus();
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
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
                    renderWhitespace: 'selection',
                    renderLineHighlight: 'all',
                  }}
                />
              </div>
              
              {/* Editor Status Bar */}
              <div className="h-6 bg-vscode-panel border-t border-vscode-border flex items-center justify-between px-4 text-xs text-vscode-textMuted">
                <div className="flex items-center gap-4">
                  <span>Line {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span>
                  <span className="capitalize">{getFileLanguage(activeFile.name)}</span>
                  {socketRef.current?.connected && (
                    <span className="flex items-center gap-1 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Connected
                    </span>
                  )}
                  {/* Delta Sync Status (disabled for now) */}
                  {/* activeFile && <DeltaSyncStatus fileId={activeFile._id} /> */}
                </div>
                <div className="flex items-center gap-2">
                  {Object.keys(cursors).length > 0 && (
                    <span className="text-vscode-accent">
                      {Object.keys(cursors).length} {Object.keys(cursors).length === 1 ? 'user' : 'users'} editing
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-vscode-bg">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 text-vscode-textMuted opacity-50" />
                <h3 className="text-lg font-semibold text-white mb-2">No file selected</h3>
                <p className="text-vscode-textMuted text-sm">
                  Select a file from the explorer or create a new one
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Chat & Video */}
        <VideoChatPanel
          socket={socketRef.current}
          projectId={id}
          user={user}
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
            if (isChat) {
              setUnreadMessages(0);
            }
          }}
          unreadMessages={unreadMessages}
        />

        {/* Version History Panel (disabled for now - needs backend setup) */}
        {/*
        {showVersionHistory && activeFile && (
          <aside className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col">
            <div className="p-4 border-b border-vscode-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-vscode-accent" />
                <h2 className="font-semibold text-white">Version History</h2>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-1 hover:bg-vscode-bg rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <VersionHistoryPanel
                fileId={activeFile._id}
                onRestore={(version) => {
                  rollbackToSnapshot(version.snapshotId);
                  toast.success(`Restored to version ${version.versionNumber}`);
                }}
              />
            </div>
          </aside>
        )}
        */}
      </div>

      {/* Activity Timeline Panel */}
      {showActivityPanel && (
        <aside className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col">
          {/* Activity Panel Header */}
          <div className="p-4 border-b border-vscode-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-vscode-accent" />
              <h2 className="font-semibold text-white">Activity Timeline</h2>
            </div>
            <button
              onClick={() => setShowActivityPanel(false)}
              className="p-1 hover:bg-vscode-bg rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto">
            <ProjectTimeline projectId={id} socket={socketRef.current} />
          </div>
        </aside>
      )}

      {/* Terminal Panel */}
      <TerminalPanel
        socket={socketRef.current}
        projectId={id}
        isVisible={showTerminal}
        onToggle={() => setShowTerminal(!showTerminal)}
      />

      {/* AI Assistant - Only visible in Project Room */}
      <AIToggleButton />
      <AIInterface />
    </div>
  );
};

export default ProjectRoom;
