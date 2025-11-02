# 🔍 Video Call Debugging Guide

## ✅ Fixes Applied

### 1. Local Video Black Screen
**Problem:** Camera permission granted but video shows black screen

**Fixes:**
- ✅ Added `facingMode: 'user'` to video constraints
- ✅ Explicitly call `video.play()` after setting srcObject
- ✅ Added delay (500ms) after getting stream to ensure it's ready
- ✅ Better logging of track states and readyState

### 2. Remote Videos Not Showing
**Problem:** Other users' videos not appearing

**Fixes:**
- ✅ Ensure local stream is ready BEFORE creating peer connections
- ✅ Add tracks to peer connection BEFORE setting up event handlers
- ✅ Better logging in `ontrack` event handler
- ✅ Log stream active state and track details
- ✅ Add ICE connection state logging

### 3. Peer Connection Issues
**Fixes:**
- ✅ Added `offerToReceiveAudio: true, offerToReceiveVideo: true` to createOffer
- ✅ Added delay before sending offers to ensure stream is ready
- ✅ Better error handling with emoji logging (🎥 📤 ✅ ❌)
- ✅ Added ICE gathering complete detection

## 🧪 Debug Console Output

### When Call Starts (Caller)
```
🎬 Starting call...
Getting local media stream with video: true audio: true
Local video playing
Video track enabled: true readyState: live
Audio track enabled: true readyState: live
Local stream obtained: video:true,audio:true
Stream active: true id: {stream-id}
✅ Local stream ready: {stream-id}
📢 Notified others about call start
👥 Creating offers for users: ['User2', 'User3']
Creating peer for: User2
Creating peer connection for: user2-id isInitiator: true
Adding local tracks to peer: video:true,audio:true
Track added: video sender: RTCRtpSender
Track added: audio sender: RTCRtpSender
Creating offer for: User2
✅ Local description set for: User2
📤 Sent offer to: User2 user2-id
```

### When Call Received (Receiver)
```
📨 Handling incoming offer from: User1 user1-id
Getting local stream before handling offer...
Getting local media stream with video: true audio: true
Local video playing
✅ Local stream ready: {stream-id}
Creating peer connection for: user1-id isInitiator: false
Adding local tracks to peer: video:true,audio:true
Setting remote description...
✅ Remote description set for incoming offer
Creating answer...
✅ Created and set local answer
📤 Sent answer to: user1-id
```

### When Remote Track Received
```
🎥 Received remote track from: user1-id
Track details: {
  kind: 'video',
  enabled: true,
  muted: false,
  readyState: 'live'
}
Streams: 1 [MediaStream]
Setting remote stream: {stream-id} active: true
Stream tracks: video:true,audio:true
```

### Connection States
```
ICE connection state for user2-id: checking
ICE connection state for user2-id: connected
Connection state for user2-id: connecting
Connection state for user2-id: connected
✅ Peer connection established with: user2-id
```

## 🐛 Troubleshooting

### Black Screen Issues

#### Check 1: Camera Permissions
```javascript
// In browser console
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ Camera access:', stream.getVideoTracks()[0].readyState);
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('❌ Camera error:', err));
```

#### Check 2: Video Element
Look for these logs:
- ✅ `Local video playing` - Video element started
- ✅ `Video track enabled: true readyState: live` - Track is active
- ❌ If missing, check browser autoplay policies

#### Check 3: Track State
```javascript
// Should see in console:
Stream active: true
Video track enabled: true readyState: live
```

### Remote Video Issues

#### Check 1: Peer Connection State
Look for:
- ✅ `✅ Peer connection established with: [userId]`
- ✅ `ICE connection state: connected`
- ❌ If stuck on "checking", may be firewall/NAT issue

#### Check 2: Track Reception
Look for:
- ✅ `🎥 Received remote track from: [userId]`
- ✅ `Track details: { kind: 'video', enabled: true, readyState: 'live' }`
- ❌ If not received, offer/answer exchange failed

#### Check 3: Stream Setting
Look for:
- ✅ `Setting remote stream: [stream-id] active: true`
- ✅ `Stream tracks: video:true,audio:true`

### ICE Connection Issues

#### Check STUN Servers
```javascript
// In createPeerFor, check:
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

#### Check Network
- Both users on same network? Should work directly
- Different networks? May need TURN server
- Corporate firewall? May block WebRTC

## 📋 Testing Checklist

### Local Video Test
1. Click "Start Call"
2. **Check Console:** Should see "🎬 Starting call..."
3. Allow camera/mic permissions
4. **Check Console:** Should see "✅ Local stream ready"
5. **Check UI:** Your video should appear (not black)
6. Toggle video off
7. **Check UI:** Should show avatar
8. Toggle video on
9. **Check UI:** Video should reappear

### Remote Video Test (2 Users)
**User 1:**
1. Start call
2. **Check Console:** See "📤 Sent offer to: User2"

**User 2:**
3. **Check UI:** See incoming call notification
4. Click Accept
5. **Check Console:** See "📨 Handling incoming offer"
6. **Check Console:** See "✅ Peer connection established"
7. **Check UI:** Should see both videos (yours + User1's)

**User 1:**
8. **Check Console:** See "🎥 Received remote track from: user2-id"
9. **Check UI:** Should see both videos (yours + User2's)

### Multi-User Test (3+ Users)
1. User 1 starts call
2. User 2 accepts → Both see each other
3. User 3 accepts → All three see each other
4. **Check:** Each user sees N-1 remote videos (where N = total users)

## 🔧 Common Issues & Solutions

### Issue: Black screen despite permissions
**Solution:** 
- Check if `autoPlay` attribute is on video element ✅
- Check if `playsInline` attribute is set ✅
- Check browser console for autoplay policy errors
- Try: `video.play().catch(e => console.log(e))`

### Issue: No remote videos
**Solution:**
- Check "🎥 Received remote track" in console
- If missing, check offer/answer exchange
- Verify both users are in same project room
- Check socket connection status

### Issue: Only audio, no video
**Solution:**
- Check `Track details: { kind: 'video' }` in console
- Verify `videoTrack.enabled = true`
- Check if remote user has camera off
- Verify `offerToReceiveVideo: true` in offer

### Issue: Connection stuck on "checking"
**Solution:**
- Check firewall settings
- Try different network (mobile hotspot)
- May need TURN server for NAT traversal
- Check browser console for ICE errors

## 📊 Expected Console Flow

### Perfect Call Flow
```
Caller:
🎬 Starting call...
✅ Local stream ready
📢 Notified others
📤 Sent offer to: Receiver
Connection state: connecting
Connection state: connected
✅ Peer connection established
🎥 Received remote track from: Receiver

Receiver:
📨 Handling incoming offer
✅ Local stream ready
✅ Remote description set
📤 Sent answer
Connection state: connecting
Connection state: connected
✅ Peer connection established
🎥 Received remote track from: Caller
```

## 🎯 Key Success Indicators

1. ✅ Local video appears (not black)
2. ✅ Console shows "✅ Local stream ready"
3. ✅ Console shows "✅ Peer connection established"
4. ✅ Console shows "🎥 Received remote track"
5. ✅ Remote video appears in UI
6. ✅ ICE state reaches "connected"
7. ✅ Both users can see and hear each other

---

**Last Updated:** November 2, 2025
**Status:** Enhanced Debugging
**Purpose:** Troubleshoot video call issues
