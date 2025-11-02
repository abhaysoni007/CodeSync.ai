import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import FileExplorer from '../components/FileExplorer';
import toast from 'react-hot-toast';
import './DashboardDemo.css';

/**
 * Dashboard Demo Component
 * Shows how to integrate FileExplorer into your dashboard
 */
const DashboardDemo = () => {
  const { projectId } = useParams();
  const [socket, setSocket] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [connected, setConnected] = useState(false);

  /**
   * Initialize Socket.io connection
   */
  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login first');
      return;
    }

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
      
      // Join project room for file system updates
      newSocket.emit('join-project', { projectId, userId: token });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error('Failed to connect to server');
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('leave-project', { projectId });
        newSocket.disconnect();
      }
    };
  }, [projectId]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (node, path) => {
    console.log('File selected:', node, path);
    setSelectedFile({ node, path });
    
    // Here you would typically:
    // 1. Load file content from server
    // 2. Open file in editor
    // 3. Initialize Yjs collaboration for this file
    
    toast.success(`Selected: ${node.name}`);
  };

  return (
    <div className="dashboard-demo">
      {/* Left Sidebar - File Explorer */}
      <div className="sidebar">
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <FileExplorer
          projectId={projectId}
          socket={socket}
          onFileSelect={handleFileSelect}
          className="main-file-explorer"
        />
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="editor-area">
          {selectedFile ? (
            <div className="file-info">
              <h2>📄 {selectedFile.node.name}</h2>
              <p className="file-path">
                Path: {selectedFile.path.join(' / ')}
              </p>
              <div className="file-content-preview">
                <h3>File Content:</h3>
                <pre>
                  {selectedFile.node.content || '// Empty file - start coding!'}
                </pre>
              </div>
              <div className="editor-placeholder">
                <p>🎨 Your Monaco Editor / Code Editor would go here</p>
                <p>Integrate with Yjs for real-time collaboration</p>
              </div>
            </div>
          ) : (
            <div className="welcome-screen">
              <h1>👋 Welcome to Your Workspace</h1>
              <p>Select a file from the explorer to start coding</p>
              <div className="quick-actions">
                <button className="action-btn">
                  📝 Create New File
                </button>
                <button className="action-btn">
                  📁 Create New Folder
                </button>
                <button className="action-btn">
                  📂 Open Existing Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar (Optional) */}
      <div className="right-sidebar">
        <div className="panel">
          <h3>Project Info</h3>
          <p>Project ID: {projectId}</p>
          <p>Files loaded: ✅</p>
        </div>

        <div className="panel">
          <h3>Collaborators</h3>
          <p>Real-time collaboration active</p>
          <div className="collaborators-list">
            <div className="collaborator">
              <span className="avatar">👤</span>
              <span>You</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span>📄 File Explorer loaded</span>
            </div>
            {selectedFile && (
              <div className="activity-item">
                <span>✅ Selected: {selectedFile.node.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDemo;
