import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaChevronRight, 
  FaChevronDown, 
  FaFile, 
  FaFolder, 
  FaFolderOpen,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEllipsisV,
  FaPlay
} from 'react-icons/fa';
import { getFileIcon, getFolderIcon, getIconStyle } from '../utils/fileExplorerIcons';
import { useFileExplorer } from '../hooks/useFileExplorer';
import { useTheme } from '../hooks/useTheme';
import toast from 'react-hot-toast';
import './FileExplorer.css';

/**
 * FileExplorer Component
 * VS Code-style file explorer with real-time collaboration
 * 
 * @param {Object} props
 * @param {string} props.projectId - Current project ID
 * @param {Object} props.socket - Socket.io instance
 * @param {Function} props.onFileSelect - Callback when file is selected
 * @param {string} props.className - Additional CSS classes
 */
const FileExplorer = ({ projectId, socket, onFileSelect, className = '' }) => {
  const { theme } = useTheme();
  
  const {
    fileStructure,
    loading,
    error,
    expandedFolders,
    selectedNode,
    renamingNode,
    contextMenu,
    createNode,
    renameNode,
    deleteNode,
    toggleFolder,
    expandFolder,
    selectNode,
    startRenaming,
    cancelRenaming,
    showContextMenu,
    hideContextMenu
  } = useFileExplorer(projectId, socket);

  const [newNodeDialog, setNewNodeDialog] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);
  const explorerRef = useRef(null);

  /**
   * Focus rename input when renaming starts
   */
  useEffect(() => {
    if (renamingNode && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNode]);

  /**
   * Initialize rename value
   */
  useEffect(() => {
    if (renamingNode) {
      setRenameValue(renamingNode.node.name);
    }
  }, [renamingNode]);

  /**
   * Close context menu on click outside
   */
  useEffect(() => {
    const handleClick = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu, hideContextMenu]);

  /**
   * Handle create new file/folder
   */
  const handleCreateNode = async (type) => {
    if (!newNodeName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await createNode(
        newNodeName.trim(),
        type,
        newNodeDialog?.parentPath || []
      );
      
      // Expand parent folder
      if (newNodeDialog?.parentPath?.length > 0) {
        const parentId = newNodeDialog.parentPath[newNodeDialog.parentPath.length - 1];
        expandFolder(parentId);
      }

      setNewNodeDialog(null);
      setNewNodeName('');
    } catch (err) {
      // Error already handled in hook
    }
  };

  /**
   * Handle rename submit
   */
  const handleRenameSubmit = async () => {
    if (!renameValue.trim() || !renamingNode) return;

    if (renameValue.trim() === renamingNode.node.name) {
      cancelRenaming();
      return;
    }

    try {
      await renameNode(renamingNode.path, renameValue.trim());
    } catch (err) {
      // Error already handled in hook
    }
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = async (path, nodeName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${nodeName}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteNode(path);
        hideContextMenu();
      } catch (err) {
        // Error already handled in hook
      }
    }
  };

  /**
   * Handle run file in terminal
   */
  const handleRunFile = (node, path) => {
    if (!socket) {
      toast.error('Terminal not connected');
      return;
    }

    const fileName = node.name;
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Build file path from tree path
    let filePath = fileName;
    if (path && path.length > 1) {
      // Reconstruct path from node IDs
      const pathNames = [];
      let currentNode = fileStructure;
      
      for (let i = 1; i < path.length; i++) {
        const nodeId = path[i];
        if (currentNode.children) {
          const foundNode = currentNode.children.find(child => child.id === nodeId);
          if (foundNode) {
            pathNames.push(foundNode.name);
            currentNode = foundNode;
          }
        }
      }
      
      if (pathNames.length > 0) {
        filePath = pathNames.join('/');
      }
    }
    
    let command = '';
    
    // Determine command based on file extension
    switch (extension) {
      case 'js':
        command = `node "${filePath}"`;
        break;
      case 'jsx':
        command = `node "${filePath}"`;
        break;
      case 'ts':
        command = `ts-node "${filePath}"`;
        break;
      case 'tsx':
        command = `ts-node "${filePath}"`;
        break;
      case 'py':
        // Use simple python command for Windows
        command = `python "${filePath}"`;
        break;
      case 'java':
        const className = fileName.replace('.java', '');
        command = `javac "${filePath}" && java ${className}`;
        break;
      case 'cpp':
        const cppOut = fileName.replace('.cpp', '');
        command = `g++ "${filePath}" -o ${cppOut} && ./${cppOut}`;
        break;
      case 'c':
        const cOut = fileName.replace('.c', '');
        command = `gcc "${filePath}" -o ${cOut} && ./${cOut}`;
        break;
      case 'sh':
        command = `bash "${filePath}"`;
        break;
      case 'bat':
        command = `"${filePath}"`;
        break;
      case 'ps1':
        command = `powershell -File "${filePath}"`;
        break;
      default:
        toast.error(`Don't know how to run .${extension} files`);
        return;
    }

    console.log('[FileExplorer] Running file:', {
      fileName,
      filePath,
      command,
      path
    });

    // Emit run command event
    socket.emit('terminal:run-file', {
      projectId,
      command,
      fileName,
      filePath
    });

    toast.success(`Running ${fileName} in terminal...`);
  };

  /**
   * Handle file/folder click
   */
  const handleNodeClick = (node, path) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      selectNode(node, path);
      
      // Call onFileSelect callback if provided
      if (onFileSelect) {
        onFileSelect(node, path);
      }
    }
  };

  /**
   * Handle file double-click
   */
  const handleFileDoubleClick = (node, path) => {
    if (node.type === 'file' && onFileSelect) {
      onFileSelect(node, path);
      toast.success(`Opening ${node.name}...`);
    }
  };

  /**
   * Render tree node recursively
   */
  const renderNode = (node, path = []) => {
    if (!node) return null;

    const currentPath = [...path, node.id];
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNode?.node?.id === node.id;
    const isRenaming = renamingNode?.node?.id === node.id;
    const isFolder = node.type === 'folder';

    return (
      <div key={node.id} className="tree-node">
        <motion.div
          className={`tree-node-content ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'}`}
          onClick={() => handleNodeClick(node, currentPath)}
          onDoubleClick={() => handleFileDoubleClick(node, currentPath)}
          onContextMenu={(e) => showContextMenu(e, node, currentPath)}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Expand/Collapse Icon (Folders only) */}
          {isFolder && (
            <span className="expand-icon" onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node.id);
            }}>
              {isExpanded ? (
                <FaChevronDown size={12} />
              ) : (
                <FaChevronRight size={12} />
              )}
            </span>
          )}

          {/* File/Folder Icon */}
          <span className="node-icon">
            {isFolder ? (
              <img 
                src={getFolderIcon(theme, isExpanded)} 
                alt="folder"
                style={{
                  ...getIconStyle('folder', theme),
                  width: '16px',
                  height: '16px'
                }}
              />
            ) : (
              <img 
                src={getFileIcon(node.name)} 
                alt="file"
                style={{
                  ...getIconStyle('file', theme),
                  width: '16px',
                  height: '16px'
                }}
              />
            )}
          </span>

          {/* Node Name or Rename Input */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              className="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  cancelRenaming();
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="node-name">{node.name}</span>
          )}

          {/* Run Button for executable files */}
          {!isFolder && !isRenaming && (
            node.name.endsWith('.js') ||
            node.name.endsWith('.jsx') ||
            node.name.endsWith('.ts') ||
            node.name.endsWith('.tsx') ||
            node.name.endsWith('.py') ||
            node.name.endsWith('.java') ||
            node.name.endsWith('.cpp') ||
            node.name.endsWith('.c') ||
            node.name.endsWith('.sh') ||
            node.name.endsWith('.bat') ||
            node.name.endsWith('.ps1')
          ) && (
            <button
              className="run-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRunFile(node, currentPath);
              }}
              title="Run in Terminal"
            >
              <FaPlay size={10} />
            </button>
          )}
        </motion.div>

        {/* Children (for folders) */}
        {isFolder && isExpanded && node.children && (
          <AnimatePresence>
            <motion.div
              className="tree-node-children"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children
                .sort((a, b) => {
                  // Folders first, then files
                  if (a.type === 'folder' && b.type === 'file') return -1;
                  if (a.type === 'file' && b.type === 'folder') return 1;
                  return a.name.localeCompare(b.name);
                })
                .map(child => renderNode(child, currentPath))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  };

  /**
   * Loading state
   */
  if (loading && !fileStructure) {
    return (
      <div className={`file-explorer ${theme} ${className}`}>
        <div className="file-explorer-loading">
          <div className="spinner"></div>
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className={`file-explorer ${theme} ${className}`}>
        <div className="file-explorer-error">
          <p>Failed to load files</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`file-explorer ${theme} ${className}`} ref={explorerRef}>
      {/* Header */}
      <div className="file-explorer-header">
        <h3>Explorer</h3>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setNewNodeDialog({ type: 'file', parentPath: [] })}
            title="New File"
          >
            <FaFile size={14} />
            <FaPlus size={10} className="plus-badge" />
          </button>
          <button
            className="icon-btn"
            onClick={() => setNewNodeDialog({ type: 'folder', parentPath: [] })}
            title="New Folder"
          >
            <FaFolder size={14} />
            <FaPlus size={10} className="plus-badge" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="file-tree">
        {fileStructure && renderNode(fileStructure)}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          path={contextMenu.path}
          theme={theme}
          onNewFile={() => {
            setNewNodeDialog({ 
              type: 'file', 
              parentPath: contextMenu.node.type === 'folder' ? contextMenu.path : contextMenu.path.slice(0, -1) 
            });
            hideContextMenu();
          }}
          onNewFolder={() => {
            setNewNodeDialog({ 
              type: 'folder', 
              parentPath: contextMenu.node.type === 'folder' ? contextMenu.path : contextMenu.path.slice(0, -1) 
            });
            hideContextMenu();
          }}
          onRename={() => {
            startRenaming(contextMenu.node, contextMenu.path);
            hideContextMenu();
          }}
          onDelete={() => {
            handleDelete(contextMenu.path, contextMenu.node.name);
          }}
          onRun={() => {
            handleRunFile(contextMenu.node, contextMenu.path);
            hideContextMenu();
          }}
          onClose={hideContextMenu}
        />
      )}

      {/* New File/Folder Dialog */}
      {newNodeDialog && (
        <NewNodeDialog
          type={newNodeDialog.type}
          value={newNodeName}
          onChange={setNewNodeName}
          onSubmit={() => handleCreateNode(newNodeDialog.type)}
          onCancel={() => {
            setNewNodeDialog(null);
            setNewNodeName('');
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

/**
 * Context Menu Component
 */
const ContextMenu = ({ x, y, node, path, theme, onNewFile, onNewFolder, onRename, onDelete, onRun, onClose }) => {
  const isFolder = node.type === 'folder';
  const isRoot = node.id === 'root';
  
  // Check if file is executable
  const isExecutable = node.type === 'file' && (
    node.name.endsWith('.js') ||
    node.name.endsWith('.jsx') ||
    node.name.endsWith('.ts') ||
    node.name.endsWith('.tsx') ||
    node.name.endsWith('.py') ||
    node.name.endsWith('.java') ||
    node.name.endsWith('.cpp') ||
    node.name.endsWith('.c') ||
    node.name.endsWith('.sh') ||
    node.name.endsWith('.bat') ||
    node.name.endsWith('.ps1')
  );

  return (
    <div 
      className={`context-menu ${theme}`}
      style={{ 
        position: 'fixed', 
        top: y, 
        left: x,
        zIndex: 1000 
      }}
    >
      {/* Run option for executable files */}
      {isExecutable && (
        <>
          <button 
            className="context-menu-item"
            onClick={onRun}
          >
            <FaPlay className="menu-icon" />
            Run File in Terminal
          </button>
          <div className="context-menu-separator" />
        </>
      )}
      
      {isFolder && (
        <>
          <div className="context-menu-item" onClick={onNewFile}>
            <FaFile size={14} />
            <span>New File</span>
          </div>
          <div className="context-menu-item" onClick={onNewFolder}>
            <FaFolder size={14} />
            <span>New Folder</span>
          </div>
          <div className="context-menu-divider"></div>
        </>
      )}
      
      {!isRoot && (
        <>
          <div className="context-menu-item" onClick={onRename}>
            <FaEdit size={14} />
            <span>Rename</span>
          </div>
          <div className="context-menu-item danger" onClick={onDelete}>
            <FaTrash size={14} />
            <span>Delete</span>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * New Node Dialog Component
 */
const NewNodeDialog = ({ type, value, onChange, onSubmit, onCancel, theme }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className={`modal-overlay ${theme}`} onClick={onCancel}>
      <motion.div 
        className={`modal-content ${theme}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h3>Create New {type === 'file' ? 'File' : 'Folder'}</h3>
        <input
          ref={inputRef}
          type="text"
          placeholder={`Enter ${type} name...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
          className="modal-input"
        />
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSubmit}>
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FileExplorer;
