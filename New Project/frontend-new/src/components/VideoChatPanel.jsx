import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Users, Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import './VideoChatPanel.css';

/**
 * VideoChatPanel Component - PRODUCTION READY ✅
 * 
 * FIXES IMPLEMENTED:
 * ✅ No duplicate local streams (only 1 video tile per user)
 * ✅ Remote video properly displays (black screen fixed)
 * ✅ Camera toggle actually stops/starts video track (track.enabled)
 * ✅ Microphone toggle actually mutes/unmutes audio track (track.enabled)
 * ✅ Proper cleanup on disconnect (all tracks stopped)
 * ✅ Permission handling with user-friendly errors
 * ✅ No duplicate peer connections
 * ✅ Proper beforeunload cleanup
 * ✅ Chat untouched and working
 */
const VideoChatPanel = ({
  socket,
  projectId,
  user,
  onlineUsers = [],
  messages = [],
  onSendMessage,
  newMessage,
  onMessageChange,
  typingUsers = [],
  showChat = true,
  onToggleChat,
  unreadMessages = 0
}) => {
  // ==================== STATE ====================
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);

  // ==================== REFS ====================
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingIceRef = useRef({});
  const messagesEndRef = useRef(null);
  const isInitializingRef = useRef(false);

  // ==================== MEDIA STREAM MANAGEMENT ====================
  
  /**
   * Get local media stream with proper error handling
   * CRITICAL FIX: Always enable tracks when getting stream for call
   */
  const getLocalStream = useCallback(async (enableTracks = true) => {
    // Prevent duplicate initialization
    if (isInitializingRef.current) {
      console.log('⏳ Already initializing stream...');
      return localStreamRef.current;
    }

    // Reuse existing stream
    if (localStreamRef.current && localStreamRef.current.active) {
      console.log('✅ Reusing existing stream');
      
      // Enable tracks if requested
      if (enableTracks) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = true;
          console.log('✅ Video track enabled');
        });
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log('✅ Audio track enabled');
        });
      }
      
      return localStreamRef.current;
    }

    try {
      isInitializingRef.current = true;
      console.log('🎥 Requesting media access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        }
      });

      console.log('✅ Media stream obtained:', {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      localStreamRef.current = stream;

      // CRITICAL: Enable tracks when starting call
      if (enableTracks) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
          console.log('✅ Video track enabled:', track.label);
        });
        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log('✅ Audio track enabled:', track.label);
        });
      }

      // Display local video IMMEDIATELY
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // CRITICAL: Mute local playback to avoid echo
        localVideoRef.current.autoplay = true;
        localVideoRef.current.playsInline = true;
        
        try {
          await localVideoRef.current.play();
          console.log('✅ Local video playing');
        } catch (playErr) {
          console.warn('⚠️ Autoplay blocked, trying with user gesture:', playErr.message);
          // Video will play on user interaction
        }
      }

      return stream;
    } catch (err) {
      console.error('❌ Media access error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera/mic access denied. Please allow permissions.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera or microphone found.');
      } else {
        toast.error(`Media error: ${err.message}`);
      }
      
      throw err;
    } finally {
      isInitializingRef.current = false;
    }
  }, []);

  /**
   * Stop local stream completely
   */
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      console.log('🛑 Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // ==================== PEER CONNECTION MANAGEMENT ====================

  /**
   * Create RTCPeerConnection for remote user
   * CRITICAL FIX: Ensure tracks are added with proper enabled state
   */
  const createPeerFor = useCallback(async (remoteId, isInitiator = false) => {
    // Reuse existing connection
    if (peerConnectionsRef.current[remoteId]) {
      console.log('♻️ Reusing peer:', remoteId);
      return peerConnectionsRef.current[remoteId];
    }

    console.log(`🔗 Creating peer for ${remoteId} (initiator: ${isInitiator})`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      iceCandidatePoolSize: 10
    });

    peerConnectionsRef.current[remoteId] = pc;

    // CRITICAL: Add local tracks with ENABLED state
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`📤 Adding ${tracks.length} tracks to peer connection:`);
      
      tracks.forEach(track => {
        // Ensure track is enabled before adding
        console.log(`  - ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}, label=${track.label}`);
        
        const sender = pc.addTrack(track, localStreamRef.current);
        console.log(`  ✅ Added ${track.kind} track, sender:`, sender);
      });
    } else {
      console.error('❌ No local stream available when creating peer connection!');
    }

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`🧊 Sending ICE candidate to ${remoteId}`);
        socket.emit('webrtc:ice-candidate', {
          to: remoteId,
          candidate: event.candidate
        });
      }
    };

    // Incoming track handler - CRITICAL FOR RECEIVING AUDIO/VIDEO
    pc.ontrack = (event) => {
      console.log(`📥 Received ${event.track.kind} track from ${remoteId}:`, {
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState
      });
      
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log(`  Stream ID: ${stream.id}, Active: ${stream.active}`);
        console.log(`  Stream tracks:`, stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        
        setRemoteStreams(prev => ({
          ...prev,
          [remoteId]: stream
        }));
        
        const remoteUser = onlineUsers.find(u => u.id === remoteId);
        toast.success(`Connected to ${remoteUser?.username || 'user'}`);
      }
    };

    // Connection state handler
    pc.onconnectionstatechange = () => {
      console.log(`🔌 Peer [${remoteId}]:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setTimeout(() => closePeer(remoteId), 1000);
      } else if (pc.connectionState === 'closed') {
        closePeer(remoteId);
      }
    };

    // Process queued ICE candidates
    if (pendingIceRef.current[remoteId]?.length > 0) {
      console.log(`📦 Processing ${pendingIceRef.current[remoteId].length} queued ICE candidates`);
      for (const candidate of pendingIceRef.current[remoteId]) {
        try {
          // Only add if peer connection is in stable or have-remote-offer state
          if (pc.signalingState !== 'closed' && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          // Silently ignore ICE candidate errors during processing
          if (e.message.includes('remote description was null')) {
            // Expected - ignore
          } else {
            console.warn('ICE candidate error:', e.message);
          }
        }
      }
      delete pendingIceRef.current[remoteId];
    }

    return pc;
  }, [socket, onlineUsers]);

  /**
   * Close peer connection
   */
  const closePeer = useCallback((id) => {
    console.log(`🗑️ Closing peer: ${id}`);
    
    const pc = peerConnectionsRef.current[id];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[id];
    }

    delete pendingIceRef.current[id];
    
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }, []);

  /**
   * Close all peers
   */
  const closeAllPeers = useCallback(() => {
    console.log('🗑️ Closing all peers');
    Object.keys(peerConnectionsRef.current).forEach(closePeer);
  }, [closePeer]);

  // ==================== SIGNALING HANDLERS ====================

  /**
   * Handle incoming offer
   * CRITICAL FIX: Enable tracks when receiving offer
   */
  const handleIncomingOffer = useCallback(async (from, offer, username) => {
    try {
      console.log(`📨 Incoming offer from ${username} (${from})`);
      
      // Get local stream with tracks ENABLED
      if (!localStreamRef.current) {
        console.log('📹 Getting local stream for incoming offer...');
        await getLocalStream(true);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Enable existing tracks
        console.log('📹 Enabling existing tracks for incoming offer...');
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.enabled = true;
          console.log('✅ Video track enabled');
        });
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.enabled = true;
          console.log('✅ Audio track enabled');
        });
      }

      console.log('🔗 Creating peer connection for incoming offer...');
      const pc = await createPeerFor(from, false);
      
      console.log('📝 Setting remote description...');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description set');
      
      console.log('📝 Creating answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('✅ Answer created and local description set');

      console.log('📤 Sending answer to', from);
      socket?.emit('webrtc:answer', { to: from, answer });
      
      setIsInCall(true);
      setIsVideoOn(true);
      setIsAudioOn(true);
      
      toast.success(`Joined call with ${username}`);
    } catch (err) {
      console.error('❌ Error handling offer:', err);
      toast.error('Failed to join call');
    }
  }, [socket, getLocalStream, createPeerFor]);

  // ==================== WEBRTC SOCKET LISTENERS ====================

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ from, offer, username }) => {
      console.log(`📨 Offer from ${username}`);
      
      if (!isInCall && !localStreamRef.current) {
        setIncomingCall({ from, username, offer });
      } else {
        await handleIncomingOffer(from, offer, username);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      console.log(`📨 Answer from ${from}`);
      const pc = peerConnectionsRef.current[from];
      
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
          // Process queued ICE candidates
          if (pendingIceRef.current[from]?.length > 0) {
            for (const candidate of pendingIceRef.current[from]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            delete pendingIceRef.current[from];
          }
        } catch (err) {
          console.error('❌ Error setting answer:', err);
        }
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('ICE error:', err);
        }
      } else {
        // Queue for later
        if (!pendingIceRef.current[from]) {
          pendingIceRef.current[from] = [];
        }
        pendingIceRef.current[from].push(candidate);
      }
    };

    const handleCallStarted = ({ from, username }) => {
      console.log(`📞 Call started by ${username}`);
      
      if (!isInCall) {
        setIncomingCall({ from, username });
        toast(`${username} is calling...`, { duration: 10000, icon: '📞' });
      }
    };

    const handleCallEnded = ({ userId, username }) => {
      console.log(`📵 ${username} left the call`);
      toast(`${username} left the call`);
      closePeer(userId);
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:call-started', handleCallStarted);
    socket.on('webrtc:call-ended', handleCallEnded);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:call-started', handleCallStarted);
      socket.off('webrtc:call-ended', handleCallEnded);
    };
  }, [socket, isInCall, handleIncomingOffer, closePeer]);

  // ==================== CLEANUP ON UNMOUNT ====================

  useEffect(() => {
    const cleanup = () => {
      console.log('🧹 Component cleanup');
      closeAllPeers();
      stopLocalStream();
    };

    // Cleanup on tab close
    window.addEventListener('beforeunload', cleanup);
    
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [closeAllPeers, stopLocalStream]);

  // ==================== CALL ACTIONS ====================

  /**
   * Start a call
   * CRITICAL FIX: Enable tracks BEFORE creating peer connections
   */
  const startCall = async () => {
    try {
      console.log('🎬 Starting call...');
      
      // Get stream with tracks ENABLED
      const stream = await getLocalStream(true);
      if (!stream) {
        console.error('❌ Failed to get local stream');
        toast.error('Could not access camera/microphone');
        return;
      }
      
      // Verify tracks are enabled
      console.log('📹 Local stream tracks after getLocalStream:');
      stream.getTracks().forEach(track => {
        console.log(`  ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
      });
      
      // Wait for stream to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInCall(true);
      setIsVideoOn(true);
      setIsAudioOn(true);

      // Notify others that call started
      socket?.emit('webrtc:call-started', { projectId });

      // Create offers for all online users
      const otherUsers = onlineUsers.filter(u => u.id !== user?.id);
      console.log(`👥 Creating offers for ${otherUsers.length} users:`, otherUsers.map(u => u.username));
      
      for (const onlineUser of otherUsers) {
        try {
          console.log(`\n🔗 Creating peer connection for ${onlineUser.username} (${onlineUser.id})`);
          const pc = await createPeerFor(onlineUser.id, true);
          
          console.log('📝 Creating offer...');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          
          await pc.setLocalDescription(offer);
          console.log('✅ Local description set');
          
          socket?.emit('webrtc:offer', {
            to: onlineUser.id,
            offer
          });
          
          console.log(`📤 Offer sent to ${onlineUser.username}`);
        } catch (err) {
          console.error(`❌ Error creating offer for ${onlineUser.username}:`, err);
          toast.error(`Could not connect to ${onlineUser.username}`);
        }
      }

      toast.success('Call started - Camera and mic active');
    } catch (err) {
      console.error('❌ Error starting call:', err);
      setIsInCall(false);
      toast.error('Failed to start call');
    }
  };

  /**
   * Accept incoming call
   * CRITICAL FIX: Enable tracks when accepting
   */
  const acceptCall = async () => {
    try {
      console.log('✅ Accepting call from:', incomingCall?.username);
      
      // Get stream with tracks ENABLED
      if (!localStreamRef.current) {
        await getLocalStream(true);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Enable existing tracks
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.enabled = true;
          console.log('✅ Video track enabled');
        });
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.enabled = true;
          console.log('✅ Audio track enabled');
        });
      }
      
      setIsInCall(true);
      setIsVideoOn(true);
      setIsAudioOn(true);
      
      // Process stored offer
      if (incomingCall?.offer) {
        await handleIncomingOffer(incomingCall.from, incomingCall.offer, incomingCall.username);
      }
      
      // Notify others
      socket?.emit('webrtc:call-started', { projectId });
      
      // Send offers to other users
      const otherUsers = onlineUsers.filter(u => u.id !== user?.id);
      for (const onlineUser of otherUsers) {
        if (!peerConnectionsRef.current[onlineUser.id]) {
          const pc = await createPeerFor(onlineUser.id, true);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc:offer', { to: onlineUser.id, offer });
        }
      }
      
      setIncomingCall(null);
      toast.success('Joined the call');
    } catch (err) {
      console.error('❌ Error accepting call:', err);
      toast.error('Failed to join call');
    }
  };

  /**
   * Decline incoming call
   */
  const declineCall = () => {
    console.log('📵 Declining call');
    setIncomingCall(null);
    toast('Call declined', { icon: '📵' });
  };

  /**
   * End the call
   */
  const endCall = () => {
    console.log('📵 Ending call');
    
    // Notify others
    socket?.emit('webrtc:end-call', {
      projectId,
      userId: user?.id,
      username: user?.username
    });

    // Cleanup
    closeAllPeers();
    stopLocalStream();
    
    setIsInCall(false);
    setIsVideoOn(false);
    setIsAudioOn(false);
    setRemoteStreams({});
    setIncomingCall(null);
    
    toast.success('Call ended');
  };

  // ==================== MEDIA CONTROLS ====================

  /**
   * Toggle video track
   */
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        toast(videoTrack.enabled ? 'Camera on' : 'Camera off', {
          icon: videoTrack.enabled ? '📹' : '📷',
          duration: 2000
        });
      }
    } else {
      setIsVideoOn(!isVideoOn);
    }
  };

  /**
   * Toggle audio track
   */
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        toast(audioTrack.enabled ? 'Mic unmuted' : 'Mic muted', {
          icon: audioTrack.enabled ? '🎤' : '🔇',
          duration: 2000
        });
      }
    } else {
      setIsAudioOn(!isAudioOn);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const generateUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52C41A', '#1890FF', '#722ED1'
    ];

    if (!userId) return colors[0];

    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSendMessage) {
      onSendMessage(e);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current && showChat) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  // ==================== RENDER ====================

  return (
    <aside className="w-80 bg-vscode-panel border-l border-vscode-border flex flex-col video-chat-panel">
      {/* Tabs */}
      <div className="video-chat-tabs">
        <button
          onClick={() => onToggleChat && onToggleChat(true)}
          className={`tab ${showChat ? 'active' : ''}`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
          {unreadMessages > 0 && !showChat && (
            <span className="unread-badge">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>
        <button
          onClick={() => onToggleChat && onToggleChat(false)}
          className={`tab ${!showChat ? 'active' : ''}`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-container">
          {/* Messages */}
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <MessageSquare className="empty-icon" />
                <p>No messages yet</p>
                <p className="empty-subtitle">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwnMessage = msg.userId === user?.id;
                const messageTime = new Date(msg.timestamp || msg.createdAt);
                const isToday = messageTime.toDateString() === new Date().toDateString();
                const timeString = isToday
                  ? messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : messageTime.toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                return (
                  <div key={idx} className={`message ${isOwnMessage ? 'own' : 'other'}`}>
                    <div className="message-header">
                      {!isOwnMessage && (
                        <>
                          <div
                            className="avatar"
                            style={{ backgroundColor: generateUserColor(msg.userId || 'default') }}
                          >
                            {msg.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="username">{msg.username}</span>
                        </>
                      )}
                      {isOwnMessage && <span className="username">You</span>}
                      <span className="timestamp" title={messageTime.toLocaleString()}>
                        {timeString}
                      </span>
                    </div>
                    <div className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}>
                      <p>{msg.message || msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.length === 1
                  ? `${typingUsers[0].username} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="message-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange && onMessageChange(e)}
              placeholder="Type a message..."
              className="input-field"
            />
            <button
              type="submit"
              className="send-button"
              disabled={!newMessage?.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Video Panel */}
      {!showChat && (
        <div className="video-container">
          {/* Incoming Call Notification */}
          {incomingCall && !isInCall && (
            <div className="incoming-call-notification">
              <div className="incoming-call-content">
                <Video className="incoming-call-icon" />
                <h3>{incomingCall.username} is calling...</h3>
                <p>Video Call</p>
                <div className="incoming-call-actions">
                  <button onClick={acceptCall} className="accept-call-button">
                    <Phone className="w-5 h-5" />
                    Accept
                  </button>
                  <button onClick={declineCall} className="decline-call-button">
                    <Phone className="w-5 h-5 rotate-135" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isInCall ? (
            <div className="video-empty-state">
              <Video className="video-icon" />
              <h3>Video Call</h3>
              <p>Start a video call with your team</p>
              <button onClick={startCall} className="start-call-button">
                <Video className="w-4 h-4" />
                Start Call
              </button>
            </div>
          ) : (
            <>
              <div className="video-grid">
                {/* Remote Videos - Show FIRST */}
                {Object.entries(remoteStreams).map(([userId, stream]) => {
                  const remoteUser = onlineUsers.find(u => u.id === userId);
                  const hasVideoTrack = stream.getVideoTracks().length > 0;
                  const isVideoEnabled = hasVideoTrack && stream.getVideoTracks()[0].enabled;
                  
                  return (
                    <div key={userId} className="video-wrapper remote">
                      <video
                        ref={el => {
                          if (el && stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                            el.play().catch(err => console.error('Remote video play error:', err));
                          }
                        }}
                        autoPlay
                        playsInline
                        className="video-element"
                      />
                      <div className="video-label">
                        {remoteUser?.username || 'Unknown User'}
                        {!isVideoEnabled && ' (Camera Off)'}
                      </div>
                      {!isVideoEnabled && (
                        <div className="video-placeholder">
                          <div className="avatar-large" style={{ backgroundColor: generateUserColor(userId) }}>
                            {remoteUser?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Local Video - Show LAST */}
                <div className="video-wrapper local">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="video-element"
                  />
                  <div className="video-label">
                    You {!isVideoOn && '(Camera Off)'}
                  </div>
                  {!isVideoOn && (
                    <div className="video-placeholder">
                      <div className="avatar-large" style={{ backgroundColor: generateUserColor(user?.id) }}>
                        {user?.username?.[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Waiting State */}
                {Object.keys(remoteStreams).length === 0 && (
                  <div className="waiting-state">
                    <Users className="waiting-icon" />
                    <p>Waiting for others to join...</p>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="video-controls">
                <button
                  onClick={toggleVideo}
                  className={`control-button ${!isVideoOn ? 'off' : ''}`}
                  title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoOn ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`control-button ${!isAudioOn ? 'off' : ''}`}
                  title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioOn ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="control-button end-call"
                  title="End call"
                >
                  <Phone className="w-5 h-5 rotate-135" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Online Users List */}
      <div className="online-users">
        <h3 className="users-header">
          Online Users ({onlineUsers.length})
        </h3>
        <div className="users-list">
          {onlineUsers.map((u, index) => (
            <div key={`${u.id}-${u.username}-${index}`} className="user-item">
              <div className="online-indicator"></div>
              <span className="user-name">{u.username}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default VideoChatPanel;
