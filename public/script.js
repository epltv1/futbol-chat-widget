const socket = io('https://dget-production.up.railway.app');  // ← Replace with YOUR exact Railway URL if different!

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
  if (!username) return alert('Enter a username!');
  
  socket.emit('join', { username });
}

joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinChat(); });

function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit('chatMessage', { text });
    messageInput.value = '';
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('join_success', () => {  // We'll add this emit on server later if needed
  joinSection.style.display = 'none';
  inputSection.style.display = 'flex';
});

socket.on('error', (err) => alert(err));

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
  allMsgs.forEach(m => socket.emit('message', m));  // Re-render
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
