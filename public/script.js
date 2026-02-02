// Use this exact URL - replace if your domain is different (check Railway dashboard > service > Settings > Networking > Generated Domain)
const SOCKET_URL = 'https://dget-production.up.railway.app';  // ← DOUBLE-CHECK THIS!

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']  // Try websocket first, fallback to polling
});

console.log('Attempting Socket.IO connection to:', SOCKET_URL);  // Debug log

const messagesDiv = document.getElementById('messages');
const joinSection = document.getElementById('join-section');
const inputSection = document.getElementById('input-section');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message');
const joinBtn = document.getElementById('join-btn');
const sendBtn = document.getElementById('send-btn');
const onlineCount = document.getElementById('online-count');

// Debug: Log when elements are found
console.log('joinBtn found:', !!joinBtn);
console.log('usernameInput found:', !!usernameInput);

function joinChat() {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter a username!');
    return;
  }
  console.log('Join attempt with username:', username);  // Debug
  socket.emit('join', { username });
}

if (joinBtn) joinBtn.addEventListener('click', joinChat);
if (usernameInput) usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinChat();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    console.log('Sending message:', text);
    socket.emit('chatMessage', { text });
    messageInput.value = '';
  }
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (messageInput) messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Connection feedback
socket.on('connect', () => {
  console.log('Socket connected successfully!');
  // Optional: alert('Connected to chat server!');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  alert('Connection failed: ' + err.message + '\nCheck console for details.');
});

socket.on('error', (err) => {
  console.error('Server error:', err);
  alert('Error: ' + err);
});

socket.on('join_success', () => {  // If server emits this (we'll add below)
  console.log('Join successful');
  joinSection.style.display = 'none';
  inputSection.style.display = 'flex';
});

socket.on('message', (msg) => { /* unchanged from before */ 
  // ... your message rendering code ...
});

socket.on('messages', (allMsgs) => { /* unchanged */ });
socket.on('systemMessage', (text) => { /* unchanged */ });
socket.on('onlineCount', (count) => { /* unchanged */ });
socket.on('banned', () => { /* unchanged */ });
