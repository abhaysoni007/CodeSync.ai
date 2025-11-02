/**
 * SIMPLE INTEGRATION EXAMPLE
 * Copy-paste this code into your existing dashboard component
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import FileExplorer from '../components/FileExplorer';

function MyDashboard() {
  // Your existing state
  const projectId = 'YOUR_PROJECT_ID'; // Get from URL params or props
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Join project room for real-time updates
      newSocket.emit('join-project', { projectId });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [projectId]);

  // Handle file selection
  const handleFileSelect = (node, path) => {
    console.log('File selected:', node.name);
    console.log('Path:', path);
    
    // TODO: Open file in your editor
    // TODO: Load file content
    // TODO: Initialize Yjs for collaboration
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* File Explorer Sidebar */}
      <div style={{ width: '250px', borderRight: '1px solid #ccc' }}>
        <FileExplorer
          projectId={projectId}
          socket={socket}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Your existing dashboard content */}
      <div style={{ flex: 1 }}>
        {/* Your editor, chat, video call, etc. */}
      </div>
    </div>
  );
}

export default MyDashboard;
