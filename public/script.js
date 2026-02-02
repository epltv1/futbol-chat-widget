// CHANGE THIS TO YOUR EXACT RAILWAY DOMAIN (from browser URL or Railway > Settings > Networking > Generated Domain)
// Example: if it's futbol-chat-widget-production.up.railway.app, use that
const SOCKET_URL = 'https://futbol-chat-widget-production.up.railway.app';  // ← UPDATE THIS LINE!

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 30000,
  transports: ['polling'],          // FORCE polling only – this often fixes Railway proxy issues
  forceNew: true,
  upgrade: false                    // Disable any WS upgrade attempt
});

console.log('Socket.IO client initialized – using polling-only to:', SOCKET_URL);

socket.on('connect', () => {
  console.log('CONNECTED SUCCESSFULLY via polling! Socket ID:', socket.id);
  alert('Connected to chat server (polling mode)! Now you can join with a username.');
});

socket.on('connect_error', (err) => {
  console.error('Connection error details:', err);
  alert('Connection failed: ' + (err.message || 'Unknown error') + '\nCheck browser console (F12) for more info.');
});

socket.on('error', (err) => {
  console.error('Server error:', err);
  alert('Server error: ' + err);
});

// Join / send logic
const messagesDiv = document.getElementById('messages');
const joinSection = document.getElementById('join-section');
const inputSection = document.getElementById('input-section');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message');
const joinBtn = document.getElementById('join-btn');
const sendBtn = document.getElementById('send-btn');
const onlineCount = document.getElementById('online-count');

function joinChat() {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Enter a username!');
    return;
  }
  console.log('Join attempt:', username);
  socket.emit('join', { username });
}

joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinChat();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    console.log('Sending:', text);
    socket.emit('chatMessage', { text });
    messageInput.value = '';
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

socket.on('join_success', () => {
  console.log('Join successful – showing chat input');
  joinSection.style.display = 'none';
  inputSection.style.display = 'flex';
});

socket.on('message', (msg) => {
  const div = document.createElement('div');
  div.classList.add('message');
  if (msg.isPinned) div.classList.add('pinned');

  const userSpan = document.createElement('span');
  userSpan.classList.add('username');
  userSpan.style.color = msg.color;
  userSpan.textContent = msg.user;
  if (msg.isOwner) userSpan.classList.add('owner-badge');

  div.appendChild(userSpan);
  div.innerHTML += `: ${msg.text} <span class="time">(${msg.time})</span>`;
  messagesDiv.appendChild(div);
  twemoji.parse(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('messages', (allMsgs) => {
  messagesDiv.innerHTML = '';
  allMsgs.forEach(m => socket.emit('message', m));
});

socket.on('systemMessage', (text) => {
  const div = document.createElement('div');
  div.classList.add('system');
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('onlineCount', (count) => {
  onlineCount.textContent = `Online: ${count}`;
});

socket.on('banned', () => {
  alert('You have been banned!');
  location.reload();
});
