import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  onValue,
  ref,
  runTransaction,
  set,
  update,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const roomCodeEl = document.getElementById("roomCode");
const playerRoleEl = document.getElementById("playerRole");
const connectionStateEl = document.getElementById("connectionState");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const resetBtn = document.getElementById("resetBtn");
const leaveBtn = document.getElementById("leaveBtn");

const CELLS = 9;
const initialBoard = Array(CELLS).fill("");

let db = null;
let currentRoom = null;
let role = null;
let roomUnsubscribe = null;

for (let i = 0; i < CELLS; i += 1) {
  const btn = document.createElement("button");
  btn.className = "cell";
  btn.dataset.idx = String(i);
  btn.addEventListener("click", () => placeMove(i));
  boardEl.appendChild(btn);
}

function drawBoard(board = initialBoard, isMyTurn = false, isGameOver = false) {
  [...boardEl.children].forEach((cell, idx) => {
    cell.textContent = board[idx] || "";
    cell.disabled = !isMyTurn || Boolean(board[idx]) || isGameOver;
  });
}

function checkWinner(board) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return board.every(Boolean) ? "draw" : null;
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function updateButtons(inRoom) {
  resetBtn.disabled = !inRoom;
  leaveBtn.disabled = !inRoom;
}

function setConnection(text) {
  connectionStateEl.textContent = text;
}

function initFirebase() {
  if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey?.includes("YOUR_")) {
    setConnection("Online mode unavailable: add Firebase config.");
    return;
  }

  const app = initializeApp(window.FIREBASE_CONFIG);
  db = getDatabase(app);
  setConnection("Connected to realtime backend.");
}

async function createRoom() {
  if (!db) return;
  const code = randomCode();
  const roomRef = ref(db, `rooms/${code}`);
  await set(roomRef, {
    board: initialBoard,
    turn: "X",
    winner: null,
    players: { X: true, O: false },
    updatedAt: Date.now()
  });
  await joinRoom(code, "X");
}

async function joinRoom(code, preferredRole = null) {
  if (!db) return;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;

  const roomRef = ref(db, `rooms/${normalized}`);

  let assignedRole = preferredRole;
  if (!assignedRole) {
    const slot = await runTransaction(ref(db, `rooms/${normalized}/players/O`), current => {
      if (current === false) return true;
      return current;
    });

    assignedRole = slot.committed && slot.snapshot.val() === true ? "O" : null;
  }

  if (!assignedRole) {
    statusEl.textContent = "Room full or unavailable.";
    return;
  }

  currentRoom = normalized;
  role = assignedRole;
  roomCodeEl.textContent = normalized;
  playerRoleEl.textContent = role;
  updateButtons(true);

  onDisconnect(ref(db, `rooms/${normalized}/players/${role}`)).set(false);

  if (roomUnsubscribe) roomUnsubscribe();
  roomUnsubscribe = onValue(roomRef, snap => {
    const room = snap.val();
    if (!room) {
      statusEl.textContent = "Room closed.";
      leaveRoom();
      return;
    }

    const winner = room.winner;
    const myTurn = room.turn === role;
    drawBoard(room.board, myTurn, Boolean(winner));

    if (winner === "draw") statusEl.textContent = "Draw game.";
    else if (winner) statusEl.textContent = `${winner} wins.`;
    else statusEl.textContent = myTurn ? "Your turn." : "Opponent's turn.";
  });
}

async function placeMove(idx) {
  if (!db || !currentRoom || !role) return;

  const roomRef = ref(db, `rooms/${currentRoom}`);
  await runTransaction(roomRef, room => {
    if (!room || room.winner || room.turn !== role || room.board[idx]) return room;
    room.board[idx] = role;
    room.winner = checkWinner(room.board);
    room.turn = role === "X" ? "O" : "X";
    room.updatedAt = Date.now();
    return room;
  });
}

async function resetGame() {
  if (!db || !currentRoom) return;
  await update(ref(db, `rooms/${currentRoom}`), {
    board: initialBoard,
    turn: "X",
    winner: null,
    updatedAt: Date.now()
  });
}

async function leaveRoom() {
  if (!db || !currentRoom || !role) {
    drawBoard(initialBoard, false, false);
    return;
  }

  await set(ref(db, `rooms/${currentRoom}/players/${role}`), false);
  currentRoom = null;
  role = null;
  roomCodeEl.textContent = "-";
  playerRoleEl.textContent = "-";
  statusEl.textContent = "Create or join a room to start.";
  updateButtons(false);
  if (roomUnsubscribe) roomUnsubscribe();
  drawBoard(initialBoard, false, false);
}

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", () => joinRoom(roomInput.value));
resetBtn.addEventListener("click", resetGame);
leaveBtn.addEventListener("click", leaveRoom);

initFirebase();
drawBoard(initialBoard, false, false);
