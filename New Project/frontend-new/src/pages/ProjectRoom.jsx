import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import * as fileAPI from '../services/fileAPI';
import { makeActiveFile } from '../utils/fileIdentity';
import { isPreviewable } from '../utils/runners';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
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

const ProjectRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [project, setProject] = useState(null);
  const [sidebarView, setSidebarView] = useState('explorer');

  /**
   * Open editor tabs.
   *
   * WHY tabs and not one `code` string: the editor used to hold a single buffer, so clicking a
   * second file overwrote it and clicking back re-fetched the file from the server - every
   * unsaved edit was silently destroyed. Each tab now owns its own buffer plus the content it was
   * last saved with, which is also what makes a dirty marker possible.
   *
   * Tab shape: { key, name, path, content, saved, loading }. `key` is the file's path joined,
   * which is the same identity the collaboration events use (see utils/fileIdentity.js).
   */
  const [tabs, setTabs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  // Files closed this session, newest last - Ctrl+Shift+T pops from here.
  const closedStack = useRef([]);
  const [autosave, setAutosave] = useState(
    () => localStorage.getItem('codesync:autosave') === 'true'
  );
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  // 'command' | 'file' | 'line' | null
  const [palette, setPalette] = useState(null);
  // A copy of the tree for quick-open. The explorer owns its own copy; duplicating one fetch is
  // far less code than lifting the whole explorer hook up here.
  const [fileTree, setFileTree] = useState(null);
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
  
  // The socket lives in state as well as a ref: children (FileExplorer, TerminalPanel, ...) only
  // learn about it when a render carries it down, and a ref mutation does not re-render.
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Cursor position for the status bar. Reading editorRef during render never re-renders, so the
  // indicator was frozen at "Line 1, Col 1".
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const socketRef = useRef(null);
  const announcedConnect = useRef(false);

  const activeTab = tabs.find((t) => t.key === activeKey) || null;
  const activeFile = activeTab
    ? { _id: activeTab.key, name: activeTab.name, path: activeTab.path }
    : null;
  const code = activeTab?.content ?? '';
  const isDirty = (tab) => tab.content !== tab.saved;
  const dirtyTabs = tabs.filter(isDirty);

  const patchTab = (key, patch) =>
    setTabs((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  // Socket handlers are registered once, so they read tabs through a ref instead of a stale closure.
  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  // Handlers registered once must still see the latest values. Refs, not deps: re-running the
  // connect effect for every file click tore the connection down and killed every terminal.
  const activeFileRef = useRef(null);
  const showChatRef = useRef(true);
  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const cursorTimeoutsRef = useRef({});
  const isRemoteUpdateRef = useRef(false);

  // Socket.IO connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');

    // Wait for the user to load. Connecting first and reconnecting once `user` arrived meant the
    // terminal could spawn its shell on a socket that was about to be thrown away, so the next
    // "run this file" had no session to run in.
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
      // Only announce the first connect. socket.io reconnects on its own after a blip, and a
      // toast per reconnect is noise, not information.
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

    // A connection that cannot come back is worth telling the user about; a transient drop is not.
    socketInstance.io.on('reconnect_failed', () => {
      toast.error('Lost connection to the collaboration server');
    });

    // Collaboration events
    socketRef.current.on('code-update', (data) => {
      console.log('Code update received:', data);
      if (data.fileId === activeFileRef.current?._id && data.userId !== user?.id) {
        // Set flag to prevent re-emitting this update
        isRemoteUpdateRef.current = true;
        patchTab(data.fileId, { content: data.code });
        
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
      if (data.userId !== user?.id && data.fileId === activeFileRef.current?._id) {
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
      if (!showChatRef.current && data.userId !== user?.id) {
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

    socketRef.current.on('version:created', (data) => {
      console.log('Realtime version event:', data);
      toast.success(`Version v${data.versionNumber} ${data.action === 'restore' ? 'restored' : 'saved'}`);
      if (data.action === 'restore' && data.content !== undefined) {
        if (activeFile && (data.fileId === activeFile._id || data.fileId === activeFile.mongoFileId)) {
          setCode(data.content);
          if (editorRef.current) {
            editorRef.current.setValue(data.content);
          }
        }
      }
    });

    // File create/delete/rename are handled by the FileExplorer via the filesystem:* events
    // (see useFileExplorer). ProjectRoom only reacts by clearing the editor if the open file
    // is deleted out from under it.
    // The server announces every tree change (its own HTTP mutations and anything a shell wrote).
    // A file that no longer exists cannot stay open, so drop its tab.
    socketRef.current.on('filesystem:changed', ({ reason, path }) => {
      if (reason !== 'delete' || !path?.length) return;
      const prefix = path.join('/');
      setTabs((prev) => prev.filter((t) => t.key !== prefix && !t.key.startsWith(`${prefix}/`)));
    });

    socketRef.current.on('user-joined', (userData) => {
      toast.success(`${userData.username} joined the project`);
    });

    socketRef.current.on('user-left', (userData) => {
      toast(`${userData.username} left the project`);
    });

    return () => {
      // Cleanup
      socketInstance.emit('leave-project', { projectId: id });
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [id, user?.id]);

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
      // Don't show error toast, messages are not critical for initial load
    }
  };

  const handleEditorChange = (value) => {
    // Skip if this is a remote update to prevent echo
    if (isRemoteUpdateRef.current) {
      return;
    }
    
    if (!activeKey) return;
    patchTab(activeKey, { content: value });

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

  const handleSaveFile = async (keyOverride) => {
    const key = typeof keyOverride === 'string' ? keyOverride : activeKey;
    const tab = tabsRef.current.find((t) => t.key === key);
    if (!tab) return;
    setSaveState('saving');

    // Snapshot what we are writing: the user can keep typing while the request is in flight, and
    // marking the tab clean against the *later* text would lose those keystrokes silently.
    const written = tab.content;

    try {
      await fileAPI.updateFileContent(id, { path: tab.path, content: written });
      patchTab(tab.key, { saved: written });
      setSaveState('saved');
      if (socketRef.current) {
        socketRef.current.emit('filesystem:file-updated', {
          projectId: id,
          path: tab.path,
          content: written,
        });
      }
      toast.success('File saved');
    } catch (error) {
      console.error('Failed to save file:', error);
      // A failed save must never look like a successful one: the tab stays dirty and the status
      // bar says so, so the user still knows there is work only the browser has.
      setSaveState('error');
      toast.error(error.response?.data?.message || 'Failed to save file');
    }
  };

  // onMount runs once, so a command registered there closes over the FIRST render's `code` and
  // would save stale (usually empty) content forever. Go through a ref that always points at the
  // current handler.
  const saveRef = useRef(handleSaveFile);
  saveRef.current = handleSaveFile;

  // Ctrl+S must save the file wherever focus is - clicking the tree or the terminal and hitting
  // Ctrl+S otherwise opened the browser's "Save page as" dialog.
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  // Open a file selected in the FileExplorer tree. Identity is the tree path (see fileIdentity.js);
  // content is fetched fresh from the single filesystem backend so we never show a stale tree copy.
  const openFile = async (node, path) => {
    if (node.type !== 'file') return;

    const key = makeActiveFile(node, path)._id;

    // Already open: just focus it. Re-fetching a file the user may have edited is exactly the bug
    // that wiped unsaved work when switching tabs.
    if (tabsRef.current.some((t) => t.key === key)) {
      setActiveKey(key);
      return;
    }

    setTabs((prev) => [...prev, { key, name: node.name, path, content: '', saved: '', loading: true }]);
    setActiveKey(key);

    try {
      const res = await fileAPI.getFileContent(id, path);
      const content = res?.success ? res.data?.content ?? '' : '';
      const mongoFileId = res?.data?.mongoFileId || res?.data?.fileId || null;
      patchTab(key, { content, saved: content, loading: false, mongoFileId, _id: mongoFileId });
    } catch (error) {
      console.error('Failed to load file content:', error);
      toast.error(error.response?.data?.message || `Could not open ${node.name}`);
      setTabs((prev) => prev.filter((t) => t.key !== key));
    }
  };

  /**
   * Open a file by its real path, without needing the tree node - what the command palette and a
   * search result have to work with. `line` reveals a specific line once the buffer is in.
   */
  const openFileByPath = async (filePath, line) => {
    const key = filePath.join('/');
    const name = filePath.at(-1);

    if (!tabsRef.current.some((t) => t.key === key)) {
      setTabs((prev) => [...prev, { key, name, path: filePath, content: '', saved: '', loading: true }]);
      setActiveKey(key);
      try {
        const res = await fileAPI.getFileContent(id, filePath);
        const content = res?.success ? res.data?.content ?? '' : '';
        patchTab(key, { content, saved: content, loading: false });
      } catch (error) {
        toast.error(error.response?.data?.message || `Could not open ${name}`);
        setTabs((prev) => prev.filter((t) => t.key !== key));
        return;
      }
    } else {
      setActiveKey(key);
    }

    if (line) {
      // The model is swapped on the next render, so jump after React has painted it.
      setTimeout(() => goToLine(line), 60);
    }
  };

  const goToLine = (line) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  const formatDocument = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  };

  const closeAllTabs = () => {
    const dirty = tabsRef.current.filter(isDirty);
    if (dirty.length && !window.confirm(`${dirty.length} file(s) have unsaved changes. Close them anyway?`)) {
      return;
    }
    tabsRef.current.forEach((t) => closedStack.current.push({ path: t.path, name: t.name }));
    setTabs([]);
  };

  const reopenClosedTab = () => {
    const last = closedStack.current.pop();
    if (last) openFileByPath(last.path);
  };

  const closeTab = (key) => {
    const tab = tabsRef.current.find((t) => t.key === key);
    if (!tab) return;
    if (isDirty(tab) && !window.confirm(`${tab.name} has unsaved changes. Close it anyway?`)) return;
    closedStack.current.push({ path: tab.path, name: tab.name });
    setTabs((prev) => prev.filter((t) => t.key !== key));
  };

  // Whenever the active tab disappears (closed here, or deleted by someone else), fall back to a
  // neighbour rather than leaving the editor pointing at nothing.
  useEffect(() => {
    if (activeKey && !tabs.some((t) => t.key === activeKey)) {
      setActiveKey(tabs.at(-1)?.key ?? null);
    }
  }, [tabs, activeKey]);

  // Unsaved work must survive a stray reload or a mis-clicked back button.
  useEffect(() => {
    if (dirtyTabs.length === 0) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyTabs.length]);

  /**
   * Run a file the user clicked in the explorer.
   *
   * The server only runs commands in a shell this socket already owns, so the panel has to be
   * open and its PTY spawned first - otherwise the click just produced "No terminal open".
   */
  const runFile = async ({ command, fileName }) => {
    if (!socketRef.current) return;
    setShowTerminal(true);

    // ponytail: poll the terminal store for a live shell; a ready-event subscription would be
    // tidier if anything else ever needs to wait on the terminal.
    const hasShell = () =>
      useTerminalStore.getState().terminals.some((t) => t.status === 'ready');
    const deadline = Date.now() + 20000;
    while (!hasShell() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (!hasShell()) {
      toast.error('Terminal did not start');
      return;
    }

    socketRef.current.emit('terminal:run-file', { projectId: id, command, fileName });
    toast.success(`Running ${fileName}`);
  };

  // ---------------------------------------------------------------- autosave
  // Debounced, and only for the tab being typed in. Off by default: saving under a collaborator
  // is a surprise, so the user opts in and the choice sticks.
  const autosaveRef = useRef(null);
  useEffect(() => {
    if (!autosave || !activeTab || !isDirty(activeTab)) return;
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => handleSaveFile(activeTab.key), 1200);
    return () => clearTimeout(autosaveRef.current);
  }, [autosave, activeTab?.key, activeTab?.content]);

  useEffect(() => {
    localStorage.setItem('codesync:autosave', String(autosave));
  }, [autosave]);

  // ------------------------------------------------- open tabs survive a reload
  const TABS_KEY = `codesync:tabs:${id}`;
  const restoredTabs = useRef(false);

  useEffect(() => {
    if (restoredTabs.current || !id) return;
    restoredTabs.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(TABS_KEY) || 'null');
      if (!saved?.paths?.length) return;
      // Sequential, so the tab order matches what the user left behind.
      (async () => {
        for (const filePath of saved.paths) await openFileByPath(filePath);
        if (saved.activeKey) setActiveKey(saved.activeKey);
      })();
    } catch {
      /* corrupt entry - not worth failing the room over */
    }
  }, [id]);

  useEffect(() => {
    if (!restoredTabs.current) return;
    localStorage.setItem(TABS_KEY, JSON.stringify({ paths: tabs.map((t) => t.path), activeKey }));
  }, [tabs, activeKey, TABS_KEY]);

  // ------------------------------------------- a tree copy for quick-open (Ctrl+P)
  useEffect(() => {
    if (!id) return;
    const load = () => fileAPI.getFileStructure(id).then((r) => r.success && setFileTree(r.data)).catch(() => {});
    load();
    if (!socket) return;
    socket.on('filesystem:changed', load);
    return () => socket.off('filesystem:changed', load);
  }, [id, socket]);

  // ------------------------------------------------------------ command palette
  const commands = [
    { id: 'file.save', label: 'File: Save', hint: 'Ctrl+S', run: () => handleSaveFile() },
    { id: 'file.closeAll', label: 'View: Close All Editors', hint: '', run: closeAllTabs },
    { id: 'file.reopen', label: 'File: Reopen Closed Editor', hint: 'Ctrl+Shift+T', run: reopenClosedTab },
    { id: 'editor.format', label: 'Format Document', hint: 'Alt+Shift+F', run: formatDocument },
    { id: 'editor.goToLine', label: 'Go to Line...', hint: 'Ctrl+G', run: () => setPalette('line') },
    { id: 'file.quickOpen', label: 'Go to File...', hint: 'Ctrl+P', run: () => setPalette('file') },
    { id: 'view.explorer', label: 'View: Explorer', hint: 'Ctrl+B', run: () => setSidebarView('explorer') },
    { id: 'view.search', label: 'View: Search Across Files', hint: '', run: () => setSidebarView('search') },
    { id: 'view.ports', label: 'View: Ports', hint: '', run: () => setSidebarView('ports') },
    { id: 'view.terminal', label: 'View: Toggle Terminal', hint: 'Ctrl+`', run: () => setShowTerminal((v) => !v) },
    { id: 'view.activity', label: 'View: Toggle Activity Timeline', hint: '', run: () => setShowActivityPanel((v) => !v) },
    { id: 'file.autosave', label: 'Toggle Auto Save', hint: '', run: () => setAutosave((v) => !v) },
    {
      id: 'file.preview',
      label: 'Open Current File in Browser',
      hint: '',
      run: () =>
        activeFileRef.current &&
        window.open(fileAPI.previewUrl(id, activeFileRef.current.path), '_blank', 'noopener'),
    },
  ];

  // Registered on window (not on Monaco) so the shortcuts work with focus in the tree or terminal.
  const shortcutRef = useRef({});
  shortcutRef.current = { closeTab, closeAllTabs, reopenClosedTab, formatDocument, activeKey };

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = (e.key.length === 1 ? e.key : '').toLowerCase() || e.code.replace(/^Key/, '').toLowerCase();

      if (e.shiftKey && k === 'p') { e.preventDefault(); setPalette('command'); }
      else if (e.shiftKey && k === 't') { e.preventDefault(); shortcutRef.current.reopenClosedTab(); }
      else if (!e.shiftKey && k === 'p') { e.preventDefault(); setPalette('file'); }
      else if (k === 'g') { e.preventDefault(); setPalette('line'); }
      else if (k === 'b') { e.preventDefault(); setSidebarView((v) => (v === 'explorer' ? 'search' : 'explorer')); }
      else if (k === '`') { e.preventDefault(); setShowTerminal((v) => !v); }
      else if (k === 'w') {
        // Ctrl+W would close the browser tab and take every unsaved buffer with it.
        e.preventDefault();
        if (shortcutRef.current.activeKey) shortcutRef.current.closeTab(shortcutRef.current.activeKey);
      }
    };

    const onAltShiftF = (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        shortcutRef.current.formatDocument();
      }
    };

    // Capture phase: Monaco and xterm both stop propagation on keys they claim, so a bubble-phase
    // listener never sees Ctrl+Shift+P or Ctrl+G once the editor or the terminal has focus.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keydown', onAltShiftF, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keydown', onAltShiftF, true);
    };
  }, []);

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

          {/* Open the current file as a real web page (HTML/SVG/CSS/images). */}
          {activeFile && isPreviewable(activeFile.name) && (
            <button
              onClick={() => window.open(fileAPI.previewUrl(id, activeFile.path), '_blank', 'noopener')}
              className="px-3 py-1.5 text-sm rounded bg-vscode-bg text-vscode-text hover:bg-vscode-border"
              title="Open in browser"
              data-testid="open-in-browser"
            >
              <Globe className="w-4 h-4 mr-1.5 inline" />
              Preview
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveFile}
            disabled={!activeTab || !isDirty(activeTab)}
            className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-button"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {activeTab && isDirty(activeTab) ? 'Save •' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar - switches the sidebar between Explorer and Extensions */}
        <ActivityBar active={sidebarView} onChange={setSidebarView} />

        {/* Left Sidebar */}
        <aside className="w-64 bg-vscode-panel border-r border-vscode-border flex flex-col">
          {sidebarView === 'explorer' && (
            <FileExplorer
              projectId={id}
              socket={socket}
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

        {/* Center - Monaco Editor */}
        <main className="flex-1 flex flex-col">
          {activeFile ? (
            <>
              {/* Tab strip. Each tab keeps its own buffer, so switching never touches the text. */}
              <div className="h-10 bg-vscode-panel border-b border-vscode-border flex items-center justify-between pr-4">
                <div className="flex items-center overflow-x-auto" data-testid="editor-tabs">
                  {tabs.map((tab) => (
                    <div
                      key={tab.key}
                      onClick={() => setActiveKey(tab.key)}
                      onAuxClick={(e) => {
                        if (e.button === 1) closeTab(tab.key);
                      }}
                      title={tab.path.join('/')}
                      data-testid={`editor-tab-${tab.key}`}
                      data-dirty={isDirty(tab) ? 'true' : 'false'}
                      className={`group h-10 flex items-center gap-2 pl-3 pr-2 text-sm cursor-pointer border-r border-vscode-border whitespace-nowrap ${
                        tab.key === activeKey
                          ? 'bg-vscode-bg text-white'
                          : 'text-vscode-textMuted hover:text-vscode-text'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-vscode-accent shrink-0" />
                      <span>{tab.name}</span>
                      {isDirty(tab) && (
                        <span
                          className="w-2 h-2 rounded-full bg-vscode-accent"
                          title="Unsaved changes"
                          data-testid="dirty-dot"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.key);
                        }}
                        title="Close"
                        aria-label={`Close ${tab.name}`}
                        className="p-0.5 rounded hover:bg-vscode-border opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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
                  beforeMount={(monaco) => {
                    // Custom theme matching the app palette — vs-dark's default widget/border
                    // colors don't match the app's ink/paper/periwinkle system.
                    monaco.editor.defineTheme('codesync-dark', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
                        { token: 'keyword', foreground: '7C7CFF' },
                        { token: 'string', foreground: '9ECE6A' },
                        { token: 'number', foreground: '9A9AFF' },
                      ],
                      colors: {
                        'editor.background': '#0A0A0B',
                        'editor.foreground': '#EDEDEF',
                        'editorLineNumber.foreground': '#4B5563',
                        'editorLineNumber.activeForeground': '#7C7CFF',
                        'editor.selectionBackground': '#7C7CFF33',
                        'editor.inactiveSelectionBackground': '#7C7CFF1A',
                        'editorCursor.foreground': '#7C7CFF',
                        'editor.lineHighlightBackground': '#1313154D',
                        'editorIndentGuide.background': '#232326',
                        'editorIndentGuide.activeBackground': '#4B5563',
                        'editorWidget.background': '#131315',
                        'editorWidget.border': '#232326',
                        'editorSuggestWidget.background': '#131315',
                        'editorSuggestWidget.selectedBackground': '#1D1B3A',
                        'scrollbarSlider.background': '#23232640',
                        'scrollbarSlider.hoverBackground': '#7C7CFF40',
                      },
                    });
                  }}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    
                    console.log('Monaco Editor mounted');
                    
                    // Track cursor position changes
                    editor.onDidChangeCursorPosition((e) => {
                      setCursorPosition({ lineNumber: e.position.lineNumber, column: e.position.column });
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
                      saveRef.current();
                    });

                    // Focus editor on mount
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
                    renderWhitespace: 'selection',
                    renderLineHighlight: 'all',
                  }}
                />
              </div>
              
              {/* Editor Status Bar */}
              <div className="h-6 bg-vscode-panel border-t border-vscode-border flex items-center justify-between px-4 text-xs text-vscode-textMuted">
                <div className="flex items-center gap-4">
                  <span>Line {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
                  <span className="capitalize">{getFileLanguage(activeFile.name)}</span>
                  <span data-testid="save-status" className={saveState === 'error' ? 'text-red-400' : ''}>
                    {saveState === 'saving'
                      ? 'Saving…'
                      : saveState === 'error'
                        ? 'Save failed'
                        : activeTab && isDirty(activeTab)
                          ? 'Unsaved'
                          : 'Saved'}
                  </span>
                  <button
                    onClick={() => setAutosave((v) => !v)}
                    data-testid="autosave-toggle"
                    className={`hover:text-vscode-text ${autosave ? 'text-vscode-accent' : ''}`}
                    title="Toggle auto save"
                  >
                    Auto Save: {autosave ? 'On' : 'Off'}
                  </button>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Connected
                    </span>
                  )}
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

        {/* Activity Timeline Panel - must live inside the main row, or it renders below the
            editor with no height left to occupy and is invisible. */}
      {showActivityPanel && (
        <aside className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col">
          {/* ProjectTimeline draws its own header; this row only carries the close button. */}
          <div className="flex justify-end p-1 border-b border-vscode-border">
            <button
              onClick={() => setShowActivityPanel(false)}
              className="p-1 hover:bg-vscode-bg rounded transition-colors"
              title="Close Activity Timeline"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto">
            <ProjectTimeline projectId={id} socket={socket} />
          </div>
        </aside>
      )}


        {/* Right Sidebar - Chat & Video */}
        <VideoChatPanel
          socket={socket}
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
            <ProjectTimeline projectId={id} socket={socket} />
          </div>
        </aside>
      )}

      {/* Version History Panel */}
      {showVersionHistory && (
        <VersionHistoryPanel
          activeFile={activeTab}
          projectId={id}
          currentCode={activeTab?.content || ''}
          onClose={() => setShowVersionHistory(false)}
          onVersionRestored={(restoredCode) => {
            if (activeTab) {
              patchTab(activeTab.key, { content: restoredCode });
            }
          }}
        />
      )}
      {/* Terminal Panel */}
      <TerminalPanel
        socket={socket}
        projectId={id}
        isVisible={showTerminal}
        onToggle={() => setShowTerminal(!showTerminal)}
      />

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

      {/* AI Assistant - Only visible in Project Room */}
      <AIToggleButton />
      <AIInterface />
    </div>
  );
};

export default ProjectRoom;
