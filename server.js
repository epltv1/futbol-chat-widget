const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://futbol-x.site", "http://localhost:3000"], // Add your site domains
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public')); // Serve frontend files for testing
app.get('/', (req, res) => res.send('Futbol Chat Server ⚽'));

// In-memory storage
const users = {}; // { socketId: { username, color, isOwner, isMuted, isBanned } }
const messages = []; // [{ id, user, text, time, isPinned }]
const onlineUsers = new Set();
const ownerUsername = 'Finest'; // Your owner username
const nameColors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF3']; // Discord-like colors

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  io.emit('onlineCount', onlineUsers.size); // Broadcast initial count

  socket.on('join', ({ username }) => {
    if (!username) return socket.emit('error', 'Username required');
    if (Object.values(users).some(u => u.username === username)) return socket.emit('error', 'Username taken');

    const color = nameColors[Math.floor(Math.random() * nameColors.length)];
    const isOwner = username === ownerUsername;
    users[socket.id] = { username, color, isOwner, isMuted: false, isBanned: false };
    onlineUsers.add(username);
    
    socket.emit('messages', messages); // Send history
    io.emit('onlineCount', onlineUsers.size);
    io.emit('systemMessage', `${username} joined ⚽`);
  });

  socket.on('chatMessage', (data) => {
    const user = users[socket.id];
    if (!user || user.isMuted || user.isBanned) return;

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
  });

  // Owner actions
  socket.on('pinMessage', (msgId) => {
    const user = users[socket.id];
    if (!user.isOwner) return;
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.isPinned = true;
      io.emit('messages', messages); // Refresh all
    }
  });

  socket.on('muteUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user.isOwner) return;
    const target = Object.values(users).find(u => u.username === targetUsername);
    if (target) target.isMuted = true;
    io.emit('systemMessage', `${targetUsername} muted`);
  });

  socket.on('banUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user.isOwner) return;
    const targetSocketId = Object.keys(users).find(id => users[id].username === targetUsername);
    if (targetSocketId) {
      users[targetSocketId].isBanned = true;
      io.to(targetSocketId).emit('banned');
      io.sockets.sockets.get(targetSocketId)?.disconnect();
      io.emit('systemMessage', `${targetUsername} banned`);
    }
  });

  socket.on('deleteMessage', (msgId) => {
    const user = users[socket.id];
    if (!user.isOwner) return;
    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      messages.splice(index, 1);
      io.emit('messages', messages);
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      onlineUsers.delete(user.username);
      io.emit('onlineCount', onlineUsers.size);
      io.emit('systemMessage', `${user.username} left`);
      delete users[socket.id];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
