const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://futbol-x.site", "http://localhost:3000", "https://dget-production.up.railway.app"], // Add your exact Railway domain here
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.static('public')); // Serve frontend files (index.html, etc.)

app.get('/', (req, res) => res.send('Futbol Chat Server ⚽'));

// In-memory storage (good for free tier, no DB needed yet)
const users = {};          // socket.id → user object
const messages = [];       // array of message objects
const onlineUsers = new Set();
const ownerUsername = 'Finest'; // Your special username
const nameColors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF3', '#FF8C00', '#8A2BE2'];

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Broadcast current online count to everyone
  io.emit('onlineCount', onlineUsers.size);

  socket.on('join', ({ username }) => {
    if (!username) {
      socket.emit('error', 'Username is required');
      return;
    }

    if (Object.values(users).some(u => u.username === username)) {
      socket.emit('error', 'Username is already taken');
      return;
    }

    const color = nameColors[Math.floor(Math.random() * nameColors.length)];
    const isOwner = username === ownerUsername;

    users[socket.id] = {
      username,
      color,
      isOwner,
      isMuted: false,
      isBanned: false
    };

    onlineUsers.add(username);

    console.log(`User joined: ${username} (socket: ${socket.id}, owner: ${isOwner})`);

    // Send chat history to the new user
    socket.emit('messages', messages);

    // Tell the client that join was successful → show message input
    socket.emit('join_success');

    // Update everyone with new online count
    io.emit('onlineCount', onlineUsers.size);

    // Welcome message
    io.emit('systemMessage', `${username} joined the chat ⚽`);
  });

  socket.on('chatMessage', (data) => {
    const user = users[socket.id];
    if (!user) return;
    if (user.isMuted) {
      socket.emit('error', 'You are muted');
      return;
    }
    if (user.isBanned) return;

    const msg = {
      id: uuidv4(),
      user: user.username,
      color: user.color,
      isOwner: user.isOwner,
      text: data.text,
      time: new Date().toLocaleTimeString(),
      isPinned: false
    };

    messages.push(msg);
    io.emit('message', msg);

    console.log(`Message from ${user.username}: ${data.text}`);
  });

  // Owner-only actions
  socket.on('pinMessage', (msgId) => {
    const user = users[socket.id];
    if (!user?.isOwner) return socket.emit('error', 'Only owner can pin');

    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.isPinned = true;
      io.emit('messages', messages); // Refresh all clients
      console.log(`Message pinned by owner: ${msgId}`);
    }
  });

  socket.on('muteUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user?.isOwner) return socket.emit('error', 'Only owner can mute');

    const target = Object.values(users).find(u => u.username === targetUsername);
    if (target) {
      target.isMuted = true;
      io.emit('systemMessage', `${targetUsername} has been muted`);
      console.log(`Muted user: ${targetUsername}`);
    }
  });

  socket.on('banUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user?.isOwner) return socket.emit('error', 'Only owner can ban');

    const targetSocketId = Object.keys(users).find(id => users[id].username === targetUsername);
    if (targetSocketId) {
      users[targetSocketId].isBanned = true;
      io.to(targetSocketId).emit('banned');
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      io.emit('systemMessage', `${targetUsername} has been banned`);
      console.log(`Banned user: ${targetUsername}`);
    }
  });

  socket.on('deleteMessage', (msgId) => {
    const user = users[socket.id];
    if (!user?.isOwner) return socket.emit('error', 'Only owner can delete');

    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      messages.splice(index, 1);
      io.emit('messages', messages);
      console.log(`Message deleted by owner: ${msgId}`);
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      onlineUsers.delete(user.username);
      io.emit('onlineCount', onlineUsers.size);
      io.emit('systemMessage', `${user.username} left the chat`);
      delete users[socket.id];
      console.log(`User disconnected: ${user.username} (${socket.id})`);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
