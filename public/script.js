const socket = io(); // Connect to server (use your Railway URL in production)
const messagesDiv = document.getElementById('messages');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message');
const sendBtn = document.querySelector('button[onclick="sendMessage()"]');
const joinBtn = document.querySelector('button[onclick="joinChat()"]');
const onlineCount = document.getElementById('online-count');

function joinChat() {
  const username = usernameInput.value.trim();
  if (username) {
    socket.emit('join', { username });
    usernameInput.style.display = 'none';
    joinBtn.style.display = 'none';
    messageInput.style.display = 'block';
    sendBtn.style.display = 'block';
  }
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit('chatMessage', { text });
    messageInput.value = '';
  }
}

socket.on('message', (msg) => {
  const p = document.createElement('p');
  p.classList.add('message');
  if (msg.isPinned) p.classList.add('pinned');
  const userSpan = document.createElement('span');
  userSpan.classList.add('username');
  userSpan.style.color = msg.color;
  userSpan.textContent = msg.user;
  if (msg.isOwner) userSpan.classList.add('owner-badge');
  p.appendChild(userSpan);
  p.innerHTML += `: ${msg.text} <small>(${msg.time})</small>`;
  messagesDiv.appendChild(p);
  twemoji.parse(p); // Render emojis like Discord
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('messages', (allMsgs) => {
  messagesDiv.innerHTML = '';
  allMsgs.forEach(msg => socket.emit('message', msg)); // Re-render
});

socket.on('systemMessage', (text) => {
  const p = document.createElement('p');
  p.textContent = `System: ${text}`;
  p.style.color = 'gray';
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('onlineCount', (count) => {
  onlineCount.textContent = `Online: ${count}`;
});

socket.on('error', (err) => alert(err));
socket.on('banned', () => alert('You are banned!'));
// For owner: Add buttons/forms for pin/mute/ban/delete in HTML if needed, then socket.emit('pinMessage', id); etc.
