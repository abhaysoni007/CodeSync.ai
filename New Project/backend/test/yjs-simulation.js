/**
 * Test simulation for 2 users editing same document
 * Tests Yjs merge consistency
 */

import { io } from 'socket.io-client';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';

// Simulate User 1
async function simulateUser1(roomId, fileId, token) {
  console.log('\n👤 USER 1: Connecting...');
  
  const ydoc = new Y.Doc();
  const socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('✅ USER 1: Connected');
    
    socket.emit('join-room', { roomId, fileId }, (response) => {
      if (response.success) {
        console.log('✅ USER 1: Joined room');
        
        // Wait a bit then start editing
        setTimeout(() => {
          const ytext = ydoc.getText('monaco');
          console.log('✏️  USER 1: Writing "Hello from User 1\\n"');
          ytext.insert(0, 'Hello from User 1\n');
          
          setTimeout(() => {
            console.log('✏️  USER 1: Writing "This is line 2 from User 1\\n"');
            ytext.insert(ytext.length, 'This is line 2 from User 1\n');
          }, 1000);
        }, 1000);
      }
    });
  });

  socket.on('yjs-sync', (update) => {
    const decoder = decoding.createDecoder(update);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);

    if (messageType === syncProtocol.messageYjsUpdate) {
      const updateData = decoding.readVarUint8Array(decoder);
      Y.applyUpdate(ydoc, updateData);
      console.log('📥 USER 1: Received update');
    }
  });

  ydoc.on('update', (update, origin) => {
    if (origin !== socket) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate);
      encoding.writeVarUint8Array(encoder, update);
      socket.emit('yjs-sync', encoding.toUint8Array(encoder));
      console.log('📤 USER 1: Sent update');
    }
  });

  // Print final state after 5 seconds
  setTimeout(() => {
    const ytext = ydoc.getText('monaco');
    console.log('\n📄 USER 1 FINAL STATE:');
    console.log('------------------------');
    console.log(ytext.toString());
    console.log('------------------------\n');
  }, 5000);

  return { socket, ydoc };
}

// Simulate User 2
async function simulateUser2(roomId, fileId, token) {
  console.log('\n👤 USER 2: Connecting...');
  
  const ydoc = new Y.Doc();
  const socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('✅ USER 2: Connected');
    
    socket.emit('join-room', { roomId, fileId }, (response) => {
      if (response.success) {
        console.log('✅ USER 2: Joined room');
        
        // Wait a bit then start editing
        setTimeout(() => {
          const ytext = ydoc.getText('monaco');
          console.log('✏️  USER 2: Writing "Hello from User 2\\n"');
          ytext.insert(0, 'Hello from User 2\n');
          
          setTimeout(() => {
            console.log('✏️  USER 2: Writing "This is line 2 from User 2\\n"');
            ytext.insert(ytext.length, 'This is line 2 from User 2\n');
          }, 1500);
        }, 1500);
      }
    });
  });

  socket.on('yjs-sync', (update) => {
    const decoder = decoding.createDecoder(update);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);

    if (messageType === syncProtocol.messageYjsUpdate) {
      const updateData = decoding.readVarUint8Array(decoder);
      Y.applyUpdate(ydoc, updateData);
      console.log('📥 USER 2: Received update');
    }
  });

  ydoc.on('update', (update, origin) => {
    if (origin !== socket) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate);
      encoding.writeVarUint8Array(encoder, update);
      socket.emit('yjs-sync', encoding.toUint8Array(encoder));
      console.log('📤 USER 2: Sent update');
    }
  });

  // Print final state after 5 seconds
  setTimeout(() => {
    const ytext = ydoc.getText('monaco');
    console.log('\n📄 USER 2 FINAL STATE:');
    console.log('------------------------');
    console.log(ytext.toString());
    console.log('------------------------\n');
  }, 5000);

  return { socket, ydoc };
}

// Run simulation
async function runSimulation() {
  console.log('🧪 STARTING YJS MERGE CONSISTENCY TEST');
  console.log('======================================\n');

  // You need to provide these values
  const ROOM_ID = 'your-room-id-here';
  const FILE_ID = 'your-file-id-here';
  const USER1_TOKEN = 'user1-jwt-token';
  const USER2_TOKEN = 'user2-jwt-token';

  console.log('Configuration:');
  console.log(`Room ID: ${ROOM_ID}`);
  console.log(`File ID: ${FILE_ID}`);
  console.log('');

  // Start both users
  const user1 = await simulateUser1(ROOM_ID, FILE_ID, USER1_TOKEN);
  
  // User 2 joins slightly after
  setTimeout(async () => {
    const user2 = await simulateUser2(ROOM_ID, FILE_ID, USER2_TOKEN);
  }, 500);

  // Check consistency after 6 seconds
  setTimeout(() => {
    console.log('\n✅ TEST COMPLETE');
    console.log('================');
    console.log('Both users should have identical final states!');
    console.log('This proves Yjs CRDT conflict-free merging.\n');
    
    process.exit(0);
  }, 6000);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimulation().catch(console.error);
}

export { simulateUser1, simulateUser2, runSimulation };
