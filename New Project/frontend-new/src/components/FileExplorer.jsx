import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronRight,
  FaChevronDown,
  FaFile,
  FaFolder,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPlay,
  FaSync,
  FaUpload,
  FaDownload,
  FaGlobe,
} from 'react-icons/fa';
import { getFileIcon, getFolderIcon, getIconStyle } from '../utils/fileExplorerIcons';
import { useFileExplorer } from '../hooks/useFileExplorer';
import { useTheme } from '../hooks/useTheme';
import { runnerFor, isRunnable, isPreviewable } from '../utils/runners';
import * as fileAPI from '../services/fileAPI';
import toast from 'react-hot-toast';
import './FileExplorer.css';

/**
 * VS Code-style file explorer over the project's real directory.
 *
 * Node identity is the real path: `node.path` is ['src','index.js'] and `node.id` is
 * 'src/index.js'. Nothing is reconstructed from ids any more - the server sends what is on disk.
 */
const FileExplorer = ({ projectId, socket, onFileSelect, onRunFile, className = '' }) => {
  const { theme } = useTheme();

  const {
    fileStructure,
    loading,
    error,
    expandedFolders,
    selectedNode,
    renamingNode,
    contextMenu,
    loadFileStructure,
    createNode,
    renameNode,
    deleteNode,
    moveNode,
    uploadFiles,
    toggleFolder,
    expandFolder,
    selectNode,
    startRenaming,
    cancelRenaming,
    showContextMenu,
    hideContextMenu,
  } = useFileExplorer(projectId, socket);

  const [newNodeDialog, setNewNodeDialog] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const renameInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const explorerRef = useRef(null);

  useEffect(() => {
    if (renamingNode && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNode]);

  useEffect(() => {
    if (renamingNode) setRenameValue(renamingNode.node.name);
  }, [renamingNode]);

  useEffect(() => {
    const handleClick = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) hideContextMenu();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu, hideContextMenu]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFileStructure();
    setRefreshing(false);
  };

  const handleCreateNode = async (type) => {
    if (!newNodeName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const parentPath = newNodeDialog?.parentPath || [];
      await createNode(newNodeName.trim(), type, parentPath);
      if (parentPath.length > 0) expandFolder(parentPath.join('/'));
      setNewNodeDialog(null);
      setNewNodeName('');
    } catch {
      /* the hook already toasted */
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameValue.trim() || !renamingNode) return;
    if (renameValue.trim() === renamingNode.node.name) {
      cancelRenaming();
      return;
    }
    try {
      await renameNode(renamingNode.path, renameValue.trim());
    } catch {
      /* the hook already toasted */
    }
  };

  const handleDelete = async (path, nodeName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${nodeName}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteNode(path);
      hideContextMenu();
    } catch {
      /* the hook already toasted */
    }
  };

  /** Open a file as a real web page (served by the backend's /preview route). */
  const handleOpenInBrowser = (node) => {
    window.open(fileAPI.previewUrl(projectId, node.path), '_blank', 'noopener');
  };

  const handleDownload = async (node) => {
    try {
      await fileAPI.downloadFile(projectId, node.path);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    }
  };

  /**
   * Run a file: a command in the project shell, or - for HTML and friends - a browser tab.
   */
  const handleRunFile = (node) => {
    const relPath = node.path.join('/');
    const runner = runnerFor(node.name, relPath);

    if (!runner) {
      toast.error(`Don't know how to run ${node.name}`);
      return;
    }
    if (runner.kind === 'browser') {
      handleOpenInBrowser(node);
      return;
    }
    if (!socket) {
      toast.error('Terminal not connected');
      return;
    }

    // The parent owns the terminal panel: it opens the panel if needed and waits for a live shell
    // before sending the command. Firing straight at the socket failed with "No terminal open"
    // whenever the user had not opened the panel first.
    onRunFile({ command: runner.command, fileName: node.name, filePath: relPath });
  };

  const handleNodeClick = (node, path) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      selectNode(node, path);
      onFileSelect?.(node, path);
    }
  };

  /**
   * One drop handler, two sources: files dragged in from the desktop are uploaded, and a node
   * dragged from inside the tree is moved. `dataTransfer.files` tells them apart.
   */
  const handleDrop = async (event, folderPath) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);

    const files = [...(event.dataTransfer?.files || [])];
    if (files.length) {
      try {
        await uploadFiles(files, folderPath);
        if (folderPath.length) expandFolder(folderPath.join('/'));
      } catch {
        /* the hook already toasted */
      }
      return;
    }

    const raw = event.dataTransfer?.getData('application/x-codesync-node');
    if (!raw) return;
    let movedPath;
    try {
      movedPath = JSON.parse(raw);
    } catch {
      return;
    }
    if (!movedPath?.length) return;
    // Dropping something back where it already is is not a move.
    if (movedPath.slice(0, -1).join('/') === folderPath.join('/')) return;

    try {
      await moveNode(movedPath, folderPath);
      if (folderPath.length) expandFolder(folderPath.join('/'));
    } catch {
      /* the hook already toasted */
    }
  };

  const renderNode = (node) => {
    if (!node) return null;

    const currentPath = node.path || [];
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNode?.node?.id === node.id;
    const isRenaming = renamingNode?.node?.id === node.id;
    const isFolder = node.type === 'folder';
    const canRun = !isFolder && (isRunnable(node.name) || isPreviewable(node.name));

    return (
      <div key={node.id} className="tree-node">
        <motion.div
          className={`tree-node-content ${isSelected ? 'selected' : ''} ${isFolder ? 'folder' : 'file'} ${
            dropTarget === node.id ? 'drop-target' : ''
          }`}
          onClick={() => handleNodeClick(node, currentPath)}
          onContextMenu={(e) => showContextMenu(e, node, currentPath)}
          draggable={node.id !== 'root'}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('application/x-codesync-node', JSON.stringify(currentPath));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={isFolder ? (e) => { e.preventDefault(); setDropTarget(node.id); } : undefined}
          onDragLeave={isFolder ? () => setDropTarget(null) : undefined}
          onDrop={isFolder ? (e) => handleDrop(e, currentPath) : undefined}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isFolder && (
            <span
              className="expand-icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
            >
              {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            </span>
          )}

          <span className="node-icon">
            <img
              src={isFolder ? getFolderIcon(theme, isExpanded) : getFileIcon(node.name)}
              alt={isFolder ? 'folder' : 'file'}
              style={{ ...getIconStyle(isFolder ? 'folder' : 'file', theme), width: '16px', height: '16px' }}
            />
          </span>

          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              className="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                else if (e.key === 'Escape') cancelRenaming();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="node-name">{node.name}</span>
          )}

          {/* Folders we do not walk into (node_modules, .git, ...) say so instead of looking empty. */}
          {isFolder && node.truncated && <span className="node-badge" title="Not expanded">…</span>}

          {canRun && !isRenaming && (
            <button
              className="run-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRunFile(node);
              }}
              title={runnerFor(node.name, node.path.join('/'))?.kind === 'browser'
                ? 'Open in browser'
                : 'Run in terminal'}
            >
              {runnerFor(node.name, node.path.join('/'))?.kind === 'browser'
                ? <FaGlobe size={10} />
                : <FaPlay size={10} />}
            </button>
          )}
        </motion.div>

        {isFolder && isExpanded && node.children?.length > 0 && (
          <AnimatePresence>
            <motion.div
              className="tree-node-children"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map((child) => renderNode(child))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  };

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

  if (error) {
    return (
      <div className={`file-explorer ${theme} ${className}`}>
        <div className="file-explorer-error">
          <p>Failed to load files</p>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`file-explorer ${theme} ${className}`} ref={explorerRef}>
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
          <button className="icon-btn" onClick={() => uploadInputRef.current?.click()} title="Upload Files">
            <FaUpload size={13} />
          </button>
          {/* The tree is a view of disk; this is how you re-read it by hand when you want to be sure. */}
          <button
            className="icon-btn"
            onClick={handleRefresh}
            title="Refresh"
            data-testid="explorer-refresh"
          >
            <FaSync size={13} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...e.target.files];
          e.target.value = '';
          if (files.length) await uploadFiles(files, []);
        }}
      />

      <div
        className="file-tree"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, [])}
      >
        {fileStructure && renderNode(fileStructure)}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          theme={theme}
          onNewFile={() => {
            setNewNodeDialog({
              type: 'file',
              parentPath:
                contextMenu.node.type === 'folder' ? contextMenu.path : contextMenu.path.slice(0, -1),
            });
            hideContextMenu();
          }}
          onNewFolder={() => {
            setNewNodeDialog({
              type: 'folder',
              parentPath:
                contextMenu.node.type === 'folder' ? contextMenu.path : contextMenu.path.slice(0, -1),
            });
            hideContextMenu();
          }}
          onRename={() => {
            startRenaming(contextMenu.node, contextMenu.path);
            hideContextMenu();
          }}
          onDelete={() => handleDelete(contextMenu.path, contextMenu.node.name)}
          onRun={() => {
            handleRunFile(contextMenu.node);
            hideContextMenu();
          }}
          onOpenInBrowser={() => {
            handleOpenInBrowser(contextMenu.node);
            hideContextMenu();
          }}
          onDownload={() => {
            handleDownload(contextMenu.node);
            hideContextMenu();
          }}
        />
      )}

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

const ContextMenu = ({
  x,
  y,
  node,
  theme,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onRun,
  onOpenInBrowser,
  onDownload,
}) => {
  const isFolder = node.type === 'folder';
  const isRoot = node.id === 'root';
  const runner = isFolder ? null : runnerFor(node.name, (node.path || []).join('/'));
  const previewable = !isFolder && isPreviewable(node.name);

  return (
    <div className={`context-menu ${theme}`} style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}>
      {runner?.kind === 'terminal' && (
        <button className="context-menu-item" onClick={onRun}>
          <FaPlay className="menu-icon" />
          Run File in Terminal
        </button>
      )}

      {previewable && (
        <button className="context-menu-item" onClick={onOpenInBrowser}>
          <FaGlobe className="menu-icon" />
          Open in Browser
        </button>
      )}

      {(runner || previewable) && <div className="context-menu-separator" />}

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

      {!isFolder && (
        <div className="context-menu-item" onClick={onDownload}>
          <FaDownload size={14} />
          <span>Download</span>
        </div>
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

const NewNodeDialog = ({ type, value, onChange, onSubmit, onCancel, theme }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
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
            if (e.key === 'Enter') onSubmit();
            else if (e.key === 'Escape') onCancel();
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
