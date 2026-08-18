import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Users, Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { Room, RoomEvent, ParticipantEvent } from 'livekit-client';
import { api } from '../utils/api';
import './VideoChatPanel.css';

/**
 * Generate consistent color for user based on ID
 */
function generateUserColor(userId) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52C41A', '#1890FF', '#722ED1'
  ];
  if (!userId) return colors[0];
  const hash = String(userId).split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Renders a single participant's video and audio using livekit-client.
 */
const ParticipantTile = ({ participant, isLocal, userMapping }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    const attachTracks = () => {
      let videoTrack = null;
      let audioTrack = null;

      participant.videoTrackPublications.forEach((pub) => {
        if (pub.track) videoTrack = pub.track;
      });
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.track) audioTrack = pub.track;
      });

      setHasVideo(!!videoTrack && !videoTrack.isMuted);
      setHasAudio(!!audioTrack && !audioTrack.isMuted);

      if (videoTrack && videoRef.current) {
        videoTrack.attach(videoRef.current);
      }
      if (audioTrack && audioRef.current && !isLocal) {
        audioTrack.attach(audioRef.current);
      }
    };

    const handleSpeaking = (speaking) => setIsSpeaking(speaking);

    // Initial attach
    attachTracks();

    // Listeners
    participant.on(ParticipantEvent.TrackSubscribed, attachTracks);
    participant.on(ParticipantEvent.TrackUnsubscribed, attachTracks);
    participant.on(ParticipantEvent.LocalTrackPublished, attachTracks);
    participant.on(ParticipantEvent.LocalTrackUnpublished, attachTracks);
    participant.on(ParticipantEvent.TrackMuted, attachTracks);
    participant.on(ParticipantEvent.TrackUnmuted, attachTracks);
    participant.on(ParticipantEvent.IsSpeakingChanged, handleSpeaking);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, attachTracks);
      participant.off(ParticipantEvent.TrackUnsubscribed, attachTracks);
      participant.off(ParticipantEvent.LocalTrackPublished, attachTracks);
      participant.off(ParticipantEvent.LocalTrackUnpublished, attachTracks);
      participant.off(ParticipantEvent.TrackMuted, attachTracks);
      participant.off(ParticipantEvent.TrackUnmuted, attachTracks);
      participant.off(ParticipantEvent.IsSpeakingChanged, handleSpeaking);

      if (videoRef.current) {
        participant.videoTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.detach(videoRef.current);
        });
      }
      if (audioRef.current && !isLocal) {
        participant.audioTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.detach(audioRef.current);
        });
      }
    };
  }, [participant, isLocal]);

  const userId = participant.identity;
  const username = userMapping[userId] || participant.name || 'User';

  return (
    <div className={`video-wrapper ${isLocal ? 'local' : 'remote'} ${isSpeaking ? 'speaking' : ''}`}>
      <video ref={videoRef} className="video-element" autoPlay playsInline muted={isLocal} />
      {!isLocal && <audio ref={audioRef} autoPlay />}

      <div className="video-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{username} {isLocal && '(You)'}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {!hasVideo ? <VideoOff style={{ width: '12px', height: '12px', color: '#ff4d4f' }} /> : <Video style={{ width: '12px', height: '12px', color: '#52c41a' }} />}
          {!hasAudio ? <MicOff style={{ width: '12px', height: '12px', color: '#ff4d4f' }} /> : <Mic style={{ width: '12px', height: '12px', color: '#52c41a' }} />}
        </div>
      </div>

      {!hasVideo && (
        <div className="video-placeholder">
          <div className="avatar-large" style={{ backgroundColor: generateUserColor(userId) }}>
            {username[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [isConnecting, setIsConnecting] = useState(false);

  // LiveKit State
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  // ==================== AUTHORITATIVE CALL STATE ====================
  const [callState, setCallState] = useState({ active: false, participants: [] });
  const isParticipant = callState.participants.some(p => p.userId === user?.id);

  // ==================== REFS ====================
  const messagesEndRef = useRef(null);
  const roomRef = useRef(null);
  const socketRef = useRef(socket);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    roomRef.current = room;
    socketRef.current = socket;
    projectIdRef.current = projectId;
  }, [room, socket, projectId]);

  // Helper map for UI labels
  const userMapping = {};
  onlineUsers.forEach(u => {
    userMapping[u.id] = u.username;
  });
  callState.participants.forEach(p => {
    userMapping[p.userId] = p.username;
  });
  if (user) userMapping[user.id] = user.username;

  // ==================== LIVEKIT CONNECTION ====================

  const updateParticipants = useCallback((currentRoom) => {
    if (!currentRoom) return;
    const remotes = Array.from(currentRoom.remoteParticipants.values());
    setParticipants(remotes);
  }, []);

  const cleanupLiveKit = useCallback((specificRoom = roomRef.current) => {
    if (specificRoom) {
      console.log('🧹 Disconnecting LiveKit room');
      specificRoom.disconnect();
    }
    setRoom(null);
    setParticipants([]);
    setIsInCall(false);
    setIsVideoOn(false);
    setIsAudioOn(false);
    setActiveSpeakerId(null);
  }, []);

  const connectToLiveKit = async () => {
    if (isConnecting || room) return;
    try {
      setIsConnecting(true);
      console.log('🎬 Requesting LiveKit token for project', projectId);
      const response = await api.createProjectCallToken(projectId);
      const { token, url } = response.data.data;

      const newRoom = new Room();

      // Setup Room Listeners
      newRoom.on(RoomEvent.ParticipantConnected, () => {
        updateParticipants(newRoom);
      });
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        updateParticipants(newRoom);
        toast(`${participant.name || 'A user'} left the call`);
      });
      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers && speakers.length > 0) {
          setActiveSpeakerId(speakers[0].identity);
        } else {
          setActiveSpeakerId(null);
        }
      });
      newRoom.on(RoomEvent.Disconnected, () => {
        cleanupLiveKit(newRoom);
        toast.error('Disconnected from call');
      });

      // Force UI re-render when participants toggle media so sorting updates dynamically
      const forceUpdate = () => updateParticipants(newRoom);
      newRoom.on(RoomEvent.TrackMuted, forceUpdate);
      newRoom.on(RoomEvent.TrackUnmuted, forceUpdate);
      newRoom.on(RoomEvent.TrackPublished, forceUpdate);
      newRoom.on(RoomEvent.TrackUnpublished, forceUpdate);
      newRoom.on(RoomEvent.LocalTrackPublished, forceUpdate);
      newRoom.on(RoomEvent.LocalTrackUnpublished, forceUpdate);

      console.log('🔗 Connecting to LiveKit...', url);
      await newRoom.connect(url, token);
      console.log('✅ Connected to LiveKit Room:', newRoom.name);

      setRoom(newRoom);
      setIsInCall(true);

      // Attempt to enable camera and mic gracefully
      let cameraEnabled = false;
      let micEnabled = false;

      try {
        await newRoom.localParticipant.setCameraEnabled(true);
        cameraEnabled = true;
      } catch (err) {
        console.warn('Camera failed:', err);
        toast.error(`Camera failed: ${err.message || 'Unavailable'}`);
      }

      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
        micEnabled = true;
      } catch (err) {
        console.warn('Mic failed:', err);
        toast.error(`Microphone failed: ${err.message || 'Unavailable'}`);
      }

      setIsVideoOn(cameraEnabled);
      setIsAudioOn(micEnabled);
      updateParticipants(newRoom);

      toast.success('Joined the call');
    } catch (error) {
      console.error('❌ LiveKit Connection Error:', error);
      toast.error('Failed to connect to video call');
      cleanupLiveKit();
    } finally {
      setIsConnecting(false);
    }
  };

  // ==================== AUTHORITATIVE CALL LISTENER ====================

  useEffect(() => {
    if (!socket) return;

    const handleCallState = (state) => {
      console.log('📡 Call state updated:', state);
      setCallState(state);

      // Auto-cleanup if server says call is inactive but we think we are in it
      if (!state.active && roomRef.current) {
        cleanupLiveKit(roomRef.current);
      }
    };

    socket.on('video:call-state', handleCallState);
    socket.emit('video:call-state-request', { projectId });

    return () => {
      socket.off('video:call-state', handleCallState);
    };
  }, [socket, projectId, cleanupLiveKit]);

  // ==================== CLEANUP ON UNMOUNT ====================

  useEffect(() => {
    const handleUnload = () => {
      if (roomRef.current) {
        socketRef.current?.emit('video:call-leave', { projectId: projectIdRef.current });
        roomRef.current.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, []);

  // ==================== CALL ACTIONS ====================

  const startCall = async () => {
    socket?.emit('video:call-start', { projectId });
    await connectToLiveKit();
  };

  const acceptCall = async () => {
    socket?.emit('video:call-join', { projectId });
    await connectToLiveKit();
  };

  const endCall = () => {
    console.log('📵 Ending call');
    socket?.emit('video:call-leave', { projectId });
    cleanupLiveKit();
    toast.success('Call ended');
  };

  // ==================== MEDIA CONTROLS ====================

  const toggleVideo = async () => {
    if (!room) return;
    try {
      const newState = !isVideoOn;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoOn(newState);
      toast(newState ? 'Camera on' : 'Camera off', { icon: newState ? '📹' : '📷', duration: 2000 });
    } catch (err) {
      console.error('Toggle video error:', err);
      toast.error(`Camera error: ${err.message || 'Could not access camera'}`);
    }
  };

  const toggleAudio = async () => {
    if (!room) return;
    try {
      const newState = !isAudioOn;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioOn(newState);
      toast(newState ? 'Mic unmuted' : 'Mic muted', { icon: newState ? '🎤' : '🔇', duration: 2000 });
    } catch (err) {
      console.error('Toggle audio error:', err);
      toast.error('Could not access microphone');
    }
  };

  // ==================== HELPER FUNCTIONS ====================

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

  // ==================== RENDER LAYOUT ====================

  // Feed layout logic (Instagram style)
  let allParticipants = [];
  if (room) {
    allParticipants = [room.localParticipant, ...participants];
    
    // Sort participants: speaking first, then active media, then local user, then others
    allParticipants.sort((a, b) => {
      // 1. Speaking
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      
      // 2. Has Camera or Mic enabled
      const aActive = a.isCameraEnabled || a.isMicrophoneEnabled;
      const bActive = b.isCameraEnabled || b.isMicrophoneEnabled;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // 3. Local participant preferred
      if (a === room.localParticipant) return -1;
      if (b === room.localParticipant) return 1;
      
      return 0;
    });
  }

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
          {!callState.active ? (
            <div className="video-empty-state">
              <Video className="video-icon" />
              <h3>Video Call</h3>
              <p>Start a video call with your team</p>
              <button onClick={startCall} disabled={isConnecting} className="start-call-button">
                <Video className="w-4 h-4" />
                {isConnecting ? 'Starting...' : 'Start Call'}
              </button>
            </div>
          ) : !isParticipant && !isInCall ? (
            <div className="video-empty-state">
              <Video className="video-icon" />
              <h3>Active Video Call</h3>
              <p>{callState.participants.length} {callState.participants.length === 1 ? 'person is' : 'people are'} in the call</p>
              <button onClick={acceptCall} disabled={isConnecting} className="start-call-button">
                <Phone className="w-4 h-4" />
                {isConnecting ? 'Joining...' : 'Join Call'}
              </button>
            </div>
          ) : (
            <>
              <div className="video-grid sf-grid-feed">
                {allParticipants.map(p => (
                  <ParticipantTile 
                    key={p.identity} 
                    participant={p} 
                    isLocal={p === room?.localParticipant} 
                    userMapping={userMapping} 
                  />
                ))}

                {/* Waiting State if alone */}
                {participants.length === 0 && (
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
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`control-button ${!isAudioOn ? 'off' : ''}`}
                  title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
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
