import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import './TerminalPanel.css';
import { 
  Terminal as TerminalIcon, 
  X, 
  Plus, 
  Trash2, 
  Square,
  ChevronUp,
  ChevronDown,
  Copy,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useTerminalStore } from '../stores/terminalStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TerminalPanel = ({ socket, projectId, isVisible, onToggle }) => {
  const {
    terminals,
    activeTerminalId,
    addTerminal,
    removeTerminal,
    setActiveTerminal,
    updateTerminalOutput,
    clearTerminalOutput,
    setTerminalStatus,
    addToHistory,
  } = useTerminalStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [panelHeight, setPanelHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  
  const terminalRefs = useRef({});
  const fitAddonRefs = useRef({});
  const containerRef = useRef(null);
  const resizeStartRef = useRef(null);

  // Initialize default terminal on mount
  useEffect(() => {
    if (terminals.length === 0) {
      const terminalId = `terminal-${Date.now()}`;
      addTerminal(terminalId, 'bash');
    }
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('terminal:output', (data) => {
      const { terminalId, output } = data;
      updateTerminalOutput(terminalId, output);
      
      // Append output to xterm
      const term = terminalRefs.current[terminalId];
      if (term) {
        term.write(output);
      }
    });

    socket.on('terminal:error', (data) => {
      const { terminalId, error } = data;
      const term = terminalRefs.current[terminalId];
      if (term) {
        term.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
      }
      toast.error(`Terminal error: ${error}`);
    });

    socket.on('terminal:exit', (data) => {
      const { terminalId, code } = data;
      setTerminalStatus(terminalId, 'idle');
      const term = terminalRefs.current[terminalId];
      if (term) {
        term.write(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`);
      }
    });

    socket.on('terminal:created', (data) => {
      const { terminalId, cwd } = data;
      const term = terminalRefs.current[terminalId];
      if (term) {
        term.write(`\x1b[32m[Terminal ready]\x1b[0m\r\n`);
        term.write(`\x1b[36m${cwd}>\x1b[0m `);
      }
    });

    return () => {
      socket.off('terminal:output');
      socket.off('terminal:error');
      socket.off('terminal:exit');
      socket.off('terminal:created');
    };
  }, [socket]);

  // Initialize xterm instances for each terminal
  useEffect(() => {
    terminals.forEach((terminal) => {
      if (!terminalRefs.current[terminal.id]) {
        initializeTerminal(terminal.id);
      }
    });

    // Cleanup removed terminals
    Object.keys(terminalRefs.current).forEach((terminalId) => {
      if (!terminals.find(t => t.id === terminalId)) {
        if (terminalRefs.current[terminalId]) {
          terminalRefs.current[terminalId].dispose();
          delete terminalRefs.current[terminalId];
          delete fitAddonRefs.current[terminalId];
        }
      }
    });
  }, [terminals]);

  // Fit terminal on resize
  useEffect(() => {
    const handleResize = () => {
      Object.values(fitAddonRefs.current).forEach(fitAddon => {
        try {
          fitAddon?.fit();
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeTerminal = (terminalId) => {
    const terminalElement = document.getElementById(`xterm-${terminalId}`);
    if (!terminalElement) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      scrollback: 1000,
      convertEol: true,
      disableStdin: false,
      rows: 20,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalElement);

    // Store refs
    terminalRefs.current[terminalId] = term;
    fitAddonRefs.current[terminalId] = fitAddon;

    // Fit terminal to container
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.error('Error fitting terminal:', error);
      }
    }, 100);

    // Handle user input
    let currentLine = '';
    
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Enter key
      if (code === 13) {
        term.write('\r\n');
        if (currentLine.trim()) {
          executeCommand(terminalId, currentLine.trim());
          addToHistory(terminalId, currentLine.trim());
        }
        currentLine = '';
        return;
      }

      // Handle Backspace
      if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      // Handle Ctrl+C
      if (code === 3) {
        term.write('^C\r\n');
        killProcess(terminalId);
        currentLine = '';
        return;
      }

      // Handle Ctrl+L (clear)
      if (code === 12) {
        term.clear();
        currentLine = '';
        return;
      }

      // Regular character input
      if (code >= 32 && code <= 126) {
        currentLine += data;
        term.write(data);
      }
    });

    // Request terminal creation on backend
    if (socket) {
      socket.emit('terminal:create', {
        terminalId,
        projectId,
        shell: 'powershell', // Windows default
      });
    }
  };

  const executeCommand = (terminalId, command) => {
    if (!socket || !command.trim()) return;

    setTerminalStatus(terminalId, 'running');

    socket.emit('terminal:execute', {
      terminalId,
      projectId,
      command: command.trim(),
    });
  };

  const killProcess = (terminalId) => {
    if (!socket) return;

    socket.emit('terminal:kill', {
      terminalId,
      projectId,
    });

    setTerminalStatus(terminalId, 'idle');
    
    const term = terminalRefs.current[terminalId];
    if (term) {
      term.write('\r\n\x1b[33m[Process killed]\x1b[0m\r\n');
    }
  };

  const handleCreateTerminal = () => {
    const terminalId = `terminal-${Date.now()}`;
    addTerminal(terminalId, 'powershell');
    setActiveTerminal(terminalId);
    toast.success('New terminal created');
  };

  const handleCloseTerminal = (terminalId) => {
    if (terminals.length === 1) {
      toast.error('Cannot close the last terminal');
      return;
    }

    // Kill any running process
    killProcess(terminalId);

    // Cleanup socket session
    if (socket) {
      socket.emit('terminal:close', { terminalId, projectId });
    }

    // Dispose xterm instance
    if (terminalRefs.current[terminalId]) {
      terminalRefs.current[terminalId].dispose();
      delete terminalRefs.current[terminalId];
      delete fitAddonRefs.current[terminalId];
    }

    removeTerminal(terminalId);
    toast.success('Terminal closed');
  };

  const handleClearTerminal = (terminalId) => {
    const term = terminalRefs.current[terminalId];
    if (term) {
      term.clear();
      clearTerminalOutput(terminalId);
    }
  };

  const handleCopyOutput = (terminalId) => {
    const term = terminalRefs.current[terminalId];
    if (term) {
      const selection = term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        toast.success('Copied to clipboard');
      } else {
        toast.error('No text selected');
      }
    }
  };

  const handleResize = (e) => {
    if (!isDragging) return;
    
    const deltaY = resizeStartRef.current.y - e.clientY;
    const newHeight = Math.max(150, Math.min(800, resizeStartRef.current.height + deltaY));
    setPanelHeight(newHeight);

    // Refit terminals
    setTimeout(() => {
      Object.values(fitAddonRefs.current).forEach(fitAddon => {
        try {
          fitAddon?.fit();
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      });
    }, 0);
  };

  const startResize = (e) => {
    setIsDragging(true);
    resizeStartRef.current = {
      y: e.clientY,
      height: panelHeight,
    };
  };

  const stopResize = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
    }
  }, [isDragging]);

  if (!isVisible) return null;

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="terminal-panel fixed bottom-0 left-0 right-0 bg-vscode-panel border-t border-vscode-border z-40"
        style={{ 
          height: isCollapsed ? '40px' : isMaximized ? 'calc(100vh - 48px)' : `${panelHeight}px`,
          transition: isCollapsed || isMaximized ? 'height 0.2s ease' : 'none'
        }}
        ref={containerRef}
      >
        {/* Resize Handle */}
        {!isCollapsed && !isMaximized && (
          <div
            className="resize-handle absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-vscode-accent transition-colors"
            onMouseDown={startResize}
          />
        )}

        {/* Header */}
        <div className="terminal-header h-10 bg-vscode-bg border-b border-vscode-border flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-vscode-accent" />
            <span className="text-sm font-semibold text-white">Terminal</span>
            
            {/* Terminal Tabs */}
            <div className="flex items-center gap-1 ml-4">
              {terminals.map((terminal, index) => (
                <button
                  key={terminal.id}
                  onClick={() => setActiveTerminal(terminal.id)}
                  className={`px-3 py-1 text-xs rounded flex items-center gap-2 transition-colors ${
                    terminal.id === activeTerminalId
                      ? 'bg-vscode-panel text-white'
                      : 'bg-transparent text-vscode-textMuted hover:bg-vscode-panel'
                  }`}
                >
                  <span>{terminal.shell}</span>
                  {terminals.length > 1 && (
                    <X
                      className="w-3 h-3 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTerminal(terminal.id);
                      }}
                    />
                  )}
                  {terminal.status === 'running' && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Terminal Actions */}
            {activeTerminal && (
              <>
                <button
                  onClick={() => handleClearTerminal(activeTerminal.id)}
                  className="p-1.5 hover:bg-vscode-border rounded transition-colors"
                  title="Clear Terminal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyOutput(activeTerminal.id)}
                  className="p-1.5 hover:bg-vscode-border rounded transition-colors"
                  title="Copy Selection"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => killProcess(activeTerminal.id)}
                  className="p-1.5 hover:bg-vscode-border rounded transition-colors"
                  title="Kill Process (Ctrl+C)"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            )}
            
            <div className="w-px h-6 bg-vscode-border mx-1" />
            
            <button
              onClick={handleCreateTerminal}
              className="p-1.5 hover:bg-vscode-border rounded transition-colors"
              title="New Terminal"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-vscode-border rounded transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-vscode-border rounded transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-vscode-border rounded transition-colors"
              title="Close Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        {!isCollapsed && (
          <div className="terminal-content" style={{ height: 'calc(100% - 40px)' }}>
            {terminals.map((terminal) => (
              <div
                key={terminal.id}
                id={`xterm-${terminal.id}`}
                className="xterm-container w-full h-full"
                style={{ 
                  display: terminal.id === activeTerminalId ? 'block' : 'none',
                  padding: '8px'
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TerminalPanel;
