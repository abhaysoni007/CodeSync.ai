import React from 'react';
import { createRoot } from 'react-dom/client';
import VideoChatPanel from './VideoChatPanel';

function App() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Video Chat Feature - Example Usage</h2>
      <VideoChatPanel serverUrl="http://localhost:4001" projectId="demo-project" />
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
