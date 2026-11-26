const $ = (selector) => document.querySelector(selector);
const messagesEl = $("#messages");
const welcomeEl = $("#welcome");
const inputEl = $("#messageInput");
const sendButton = $("#sendButton");
const historyList = $("#historyList");
const toastEl = $("#toast");

let chats = loadChats();
let activeChatId = chats[0]?.id || null;
let isSending = false;

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem("omnigpt_chats") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
function saveChats() {
  localStorage.setItem("omnigpt_chats", JSON.stringify(chats));
}
function activeChat() {
  return chats.find(chat => chat.id === activeChatId) || null;
}
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2400);
}
function newChat() {
  const chat = { id: makeId(), title: "New chat", messages: [] };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  render();
  inputEl.focus();
  closeSidebar();
}
function renderHistory() {
  historyList.replaceChildren();
  chats.forEach(chat => {
    const button = document.createElement("button");
    button.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
    button.textContent = chat.title || "New chat";
    button.title = chat.title || "New chat";
    button.addEventListener("click", () => {
      activeChatId = chat.id;
      render();
      closeSidebar();
    });
    historyList.append(button);
  });
}
function addMessage(role, content) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "assistant" ? "O" : "Y";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  if (role === "user") row.append(bubble, avatar);
  else row.append(avatar, bubble);
  messagesEl.append(row);
  return row;
}
function render() {
  renderHistory();
  messagesEl.replaceChildren();
  const chat = activeChat();
  const hasMessages = Boolean(chat?.messages?.length);
  welcomeEl.hidden = hasMessages;
  if (chat) chat.messages.forEach(message => addMessage(message.role, message.content));
  scrollToBottom();
}
function scrollToBottom() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
}
function setSending(value) {
  isSending = value;
  sendButton.disabled = value;
  sendButton.textContent = value ? "…" : "↑";
}
async function sendMessage(text) {
  const content = text.trim();
  if (!content || isSending) return;
  if (!activeChat()) newChat();
  const chat = activeChat();
  chat.messages.push({ role: "user", content });
  if (chat.title === "New chat") chat.title = content.slice(0, 34) + (content.length > 34 ? "…" : "");
  saveChats();
  render();
  inputEl.value = "";
  inputEl.style.height = "auto";
  setSending(true);

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "OmniGPT is thinking…";
  messagesEl.append(typing);
  scrollToBottom();

  try {
    const recentMessages = chat.messages.slice(-20).map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: recentMessages })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("The AI returned an empty answer.");
    chat.messages.push({ role: "assistant", content: data.answer.trim() });
    saveChats();
  } catch (error) {
    const message = error.message || "Something went wrong.";
    chat.messages.push({ role: "assistant", content: `Sorry, I couldn't answer that. ${message}` });
    saveChats();
  } finally {
    typing.remove();
    setSending(false);
    render();
    inputEl.focus();
  }
}

$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(inputEl.value);
});
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 180)}px`;
});
inputEl.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("#chatForm").requestSubmit();
  }
});
$("#newChat").addEventListener("click", newChat);
$("#clearChats").addEventListener("click", () => {
  if (!chats.length) return showToast("There are no chats to clear.");
  if (!confirm("Delete all saved OmniGPT chats from this browser?")) return;
  chats = [];
  activeChatId = null;
  saveChats();
  render();
  showToast("All chats cleared.");
});
document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt || ""));
});
$("#openSidebar").addEventListener("click", () => $("#sidebar").classList.add("open"));
$("#closeSidebar").addEventListener("click", closeSidebar);
function closeSidebar() { $("#sidebar").classList.remove("open"); }

if (!activeChatId) {
  const starter = { id: makeId(), title: "New chat", messages: [] };
  chats.push(starter);
  activeChatId = starter.id;
  saveChats();
}
render();