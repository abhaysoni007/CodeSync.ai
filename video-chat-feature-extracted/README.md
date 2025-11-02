Video Chat Feature Extraction

This folder contains a minimal, self-contained extraction of the project's video call (WebRTC signaling) and chat socket features. It's intended to be handed to another developer who maintains the main branch or used as a demo to integrate the feature.

Contents
- backend/: Minimal Express + Socket.IO server implementing the same socket event names used in the main app (signaling and chat). Uses an in-memory message store (demo only).
- frontend/: Minimal React component `VideoChatPanel.jsx` and `example-usage.jsx` demonstrating how to connect and use the signaling/chat events.

Quick run (demo)
1. Start backend:

	cd video-chat-feature-extracted/backend
	npm install
	npm start

2. Serve the frontend example (you can use any dev server). A simple way is to paste `example-usage.jsx` into an existing React app or use Vite/Parcel to serve it.

Notes & integration instructions
- The demo server intentionally keeps a small surface area and does not depend on your DB, Yjs manager, or models. It implements the same socket event names as the main project so it should be straightforward to copy the relevant pieces back into `backend/services/SocketHandlers.js` in the main repo.
- For production / full integration, copy the signaling and chat event handlers from `backend/server.js` into your main `SocketHandlers.js` and rewire to use your authentication, models (Message, Activity), and Yjs manager. The main repo already contains full implementations — this demo is for transfer and isolated testing.
- The frontend `VideoChatPanel.jsx` is intentionally minimal and omits advanced UI and error handling. It demonstrates user media access, basic offer/answer handling, ICE exchange, and chat send/receive. To integrate it into your app, either use the component directly or port the signaling parts into your existing `ProjectRoom.jsx` / `VideoChatPanel` UI.

Limitations of this extraction
- In-memory message store (no persistence).
- Authentication is a demo stub (socket.handshake.auth.token used as userId). Replace with your JWT verification when integrating.
- The demo doesn't attempt to mirror the full collaboration features (Yjs sync, file cursors, project membership logic) — only chat and WebRTC events.

If you'd like, I can also:
- Extract the specific lines from `backend/services/SocketHandlers.js` and produce a patch that copies just the chat + WebRTC blocks into a standalone file you can hand over.
- Create a tiny Vite-based frontend package.json + dev server so the example is runnable out-of-the-box.
