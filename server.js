const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",                      // Wildcard TEMP for debug – change to ["https://futbol-x.site", "https://your-railway-domain.up.railway.app"] later
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Allow both, client forces polling
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000
});

app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => res.send('Futbol Chat Server ⚽'));

const users = {};
const messages = [];
const onlineUsers = new Set();
const ownerUsername = 'Finest';
const nameColors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF3', '#FF8C00', '#8A2BE2'];

io.on('connection', (socket) => {
  console.log('New connection (transport: ' + socket.conn.transport.name + '): ' + socket.id);

  io.emit('onlineCount', onlineUsers.size);

  socket.on('join', ({ username }) => {
    if (!username) return socket.emit('error', 'Username is required');

    if (Object.values(users).some(u => u.username === username)) {
      return socket.emit('error', 'Username is already taken');
    }

    const color = nameColors[Math.floor(Math.random() * nameColors.length)];
    const isOwner = username === ownerUsername;

    users[socket.id] = { username, color, isOwner, isMuted: false, isBanned: false };
    onlineUsers.add(username);

    console.log(`User joined: ${username} (socket: ${socket.id}, transport: ${socket.conn.transport.name})`);

    socket.emit('messages', messages);
    socket.emit('join_success');
    io.emit('onlineCount', onlineUsers.size);
    io.emit('systemMessage', `${username} joined the chat ⚽`);
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

  socket.on('pinMessage', (msgId) => {
    const user = users[socket.id];
    if (!user?.isOwner) return;
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.isPinned = true;
      io.emit('messages', messages);
    }
  });

  socket.on('muteUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user?.isOwner) return;
    const target = Object.values(users).find(u => u.username === targetUsername);
    if (target) {
      target.isMuted = true;
      io.emit('systemMessage', `${targetUsername} has been muted`);
    }
  });

  socket.on('banUser', (targetUsername) => {
    const user = users[socket.id];
    if (!user?.isOwner) return;
    const targetSocketId = Object.keys(users).find(id => users[id].username === targetUsername);
    if (targetSocketId) {
      users[targetSocketId].isBanned = true;
      io.to(targetSocketId).emit('banned');
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      io.emit('systemMessage', `${targetUsername} has been banned`);
    }
  });

  socket.on('deleteMessage', (msgId) => {
    const user = users[socket.id];
    if (!user?.isOwner) return;
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
      io.emit('systemMessage', `${user.username} left the chat`);
      delete users[socket.id];
    }
    console.log('Disconnected: ' + socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
