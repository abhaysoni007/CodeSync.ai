import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Props:
//  - serverUrl: socket server URL (http://localhost:4001)
//  - projectId: project/room id to join
export default function VideoChatPanel({ serverUrl = 'http://localhost:4001', projectId = 'demo' }) {
  const [socket, setSocket] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const pcsRef = useRef({});
  const pendingIceRef = useRef({});
  const localStreamRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const s = io(serverUrl, { auth: { token: 'demo-user' + Math.floor(Math.random()*1000) } });
    setSocket(s);

    s.on('connect', () => {
      console.log('socket connected', s.id);
      s.emit('join-project', { projectId }, (res) => {
        console.log('joined project', res);
        s.emit('get-messages', { limit: 100 }, (r) => {
          if (r.success) setMessages(r.messages || []);
        });
      });
    });

    s.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    s.on('webrtc:offer', async ({ from, offer, username }) => {
      console.log('Received offer from', from);
      await handleIncomingOffer(from, offer);
    });

    s.on('webrtc:answer', async ({ from, answer }) => {
      console.log('Received answer from', from);
      const pc = pcsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    s.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      const pc = pcsRef.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn('addIceCandidate error', err);
        }
      } else {
        if (!pendingIceRef.current[from]) pendingIceRef.current[from] = [];
        pendingIceRef.current[from].push(candidate);
      }
    });

    s.on('webrtc:call-started', ({ from, username }) => {
      console.log('Call started by', username || from);
    });

    s.on('webrtc:call-ended', ({ userId, username }) => {
      console.log('Call ended by', username || userId);
      // cleanup peer
      closePeer(userId);
    });

    return () => {
      if (s) s.disconnect();
      stopLocalStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, projectId]);

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  const createPeerFor = async (remoteId, isInitiator = false) => {
    if (pcsRef.current[remoteId]) return pcsRef.current[remoteId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcsRef.current[remoteId] = pc;

    // attach local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket) {
        socket.emit('webrtc:ice-candidate', { to: remoteId, candidate: ev.candidate });
      }
    };

    pc.ontrack = (ev) => {
      console.log('ontrack from', remoteId, ev.streams);
      const stream = ev.streams && ev.streams[0];
      if (stream) {
        setRemoteStream(remoteId, stream);
      }
    };

    // process any queued ICE
    if (pendingIceRef.current[remoteId]) {
      for (const cand of pendingIceRef.current[remoteId]) {
        try { pc.addIceCandidate(cand); } catch (e) { console.warn(e); }
      }
      delete pendingIceRef.current[remoteId];
    }

    return pc;
  };

  const setRemoteStream = (id, stream) => {
    remoteVideosRef.current[id] = stream;
    // trigger re-render by changing onlineUsers mapping
    setOnlineUsers(u => Array.from(new Set([...u, id])));
    // assign stream to a dynamic video element
    const el = document.getElementById(`remote-video-${id}`);
    if (el) el.srcObject = stream;
  };

  const closePeer = (id) => {
    const pc = pcsRef.current[id];
    if (pc) {
      try { pc.close(); } catch(e){}
      delete pcsRef.current[id];
    }
    delete remoteVideosRef.current[id];
    setOnlineUsers(u => u.filter(x => x !== id));
    const el = document.getElementById(`remote-video-${id}`);
    if (el) el.srcObject = null;
  };

  const handleIncomingOffer = async (from, offer) => {
    const pc = await createPeerFor(from, false);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (socket) socket.emit('webrtc:answer', { to: from, answer });
    } catch (err) {
      console.error('handleIncomingOffer error', err);
    }
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // notify others
      socket && socket.emit('webrtc:call-started', { projectId });

      // create offers to any existing known users (demo: none), remote peers will send offers/answers as they detect
    } catch (err) {
      console.error('getUserMedia failed', err);
    }
  };

  const endCall = () => {
    socket && socket.emit('webrtc:end-call', { projectId, userId: socket.id, username: socket.username });
    Object.keys(pcsRef.current).forEach(id => closePeer(id));
    stopLocalStream();
  };

  const sendMessage = () => {
    if (!messageText || !socket) return;
    socket.emit('send-message', { content: messageText }, (res) => {
      if (res && res.success) setMessageText('');
    });
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <h3>Video Chat Panel (demo)</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 240, height: 160, background: '#000' }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={startCall}>Start Call (getUserMedia)</button>
            <button onClick={endCall} style={{ marginLeft: 8 }}>End Call</button>
          </div>
        </div>

        <div>
          <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #eee', padding: 6, width: 360 }}>
            {messages.map(m => (
              <div key={m._id} style={{ padding: 6, borderBottom: '1px solid #f3f3f3' }}>
                <strong>{m.sender.username}:</strong> {m.content}
                <div style={{ fontSize: 11, color: '#666' }}>{new Date(m.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message" />
            <button onClick={sendMessage} style={{ marginLeft: 6 }}>Send</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Remote streams</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onlineUsers.map(id => (
            <video key={id} id={`remote-video-${id}`} autoPlay playsInline style={{ width: 160, height: 120, background: '#000' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
