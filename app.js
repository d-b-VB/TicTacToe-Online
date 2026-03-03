const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const playerRoleEl = document.getElementById("playerRole");
const connectionStateEl = document.getElementById("connectionState");
const resetBtn = document.getElementById("resetBtn");
const disconnectBtn = document.getElementById("disconnectBtn");

const createOfferBtn = document.getElementById("createOfferBtn");
const connectAnswerBtn = document.getElementById("connectAnswerBtn");
const createAnswerBtn = document.getElementById("createAnswerBtn");
const hostOfferOut = document.getElementById("hostOfferOut");
const hostAnswerIn = document.getElementById("hostAnswerIn");
const guestOfferIn = document.getElementById("guestOfferIn");
const guestAnswerOut = document.getElementById("guestAnswerOut");

const CELLS = 9;
const initialState = {
  board: Array(CELLS).fill(""),
  turn: "X",
  winner: null
};

let peer = null;
let channel = null;
let role = null;
let state = structuredClone(initialState);

for (let i = 0; i < CELLS; i += 1) {
  const btn = document.createElement("button");
  btn.className = "cell";
  btn.dataset.idx = String(i);
  btn.addEventListener("click", () => placeMove(i));
  boardEl.appendChild(btn);
}

function setConnection(text) {
  connectionStateEl.textContent = text;
}

function encode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decode(text) {
  return JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
}

function drawBoard() {
  const myTurn = state.turn === role;
  const gameOver = Boolean(state.winner);
  [...boardEl.children].forEach((cell, idx) => {
    cell.textContent = state.board[idx];
    cell.disabled = !channel || channel.readyState !== "open" || !myTurn || Boolean(state.board[idx]) || gameOver;
  });

  if (!channel || channel.readyState !== "open") {
    statusEl.textContent = "Connect both players to start.";
  } else if (state.winner === "draw") {
    statusEl.textContent = "Draw game.";
  } else if (state.winner) {
    statusEl.textContent = `${state.winner} wins.`;
  } else {
    statusEl.textContent = myTurn ? "Your turn." : "Opponent's turn.";
  }
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

function createPeer(asHost) {
  if (peer) peer.close();

  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  peer.onconnectionstatechange = () => {
    setConnection(`WebRTC: ${peer.connectionState}`);
    if (peer.connectionState === "connected") {
      resetBtn.disabled = false;
      disconnectBtn.disabled = false;
    }
    if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
      resetBtn.disabled = true;
      disconnectBtn.disabled = true;
    }
    drawBoard();
  };

  if (asHost) {
    channel = peer.createDataChannel("tictactoe");
    wireChannel();
  } else {
    peer.ondatachannel = event => {
      channel = event.channel;
      wireChannel();
    };
  }
}

function send(payload) {
  if (channel && channel.readyState === "open") {
    channel.send(JSON.stringify(payload));
  }
}

function wireChannel() {
  channel.onopen = () => {
    setConnection("Connected. You can play now.");
    drawBoard();
    if (role === "X") send({ type: "state", state });
  };
  channel.onclose = () => {
    setConnection("Disconnected.");
    drawBoard();
  };
  channel.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.type === "state") {
      state = msg.state;
      drawBoard();
      return;
    }

    if (msg.type === "move" && role === "X") {
      applyMove(msg.idx, "O");
    }

    if (msg.type === "reset" && role === "X") {
      state = structuredClone(initialState);
      send({ type: "state", state });
      drawBoard();
    }
  };
}

function applyMove(idx, player) {
  if (state.winner || state.turn !== player || state.board[idx]) return;
  state.board[idx] = player;
  state.winner = checkWinner(state.board);
  state.turn = player === "X" ? "O" : "X";
  send({ type: "state", state });
  drawBoard();
}

function placeMove(idx) {
  if (!channel || channel.readyState !== "open") return;

  if (role === "X") {
    applyMove(idx, "X");
  } else if (role === "O") {
    send({ type: "move", idx });
  }
}

async function waitIceComplete(pc) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise(resolve => {
    const onState = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", onState);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onState);
  });
}

createOfferBtn.addEventListener("click", async () => {
  role = "X";
  playerRoleEl.textContent = role;
  state = structuredClone(initialState);
  createPeer(true);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await waitIceComplete(peer);

  hostOfferOut.value = encode(peer.localDescription.toJSON());
  setConnection("Offer created. Share it with guest.");
  drawBoard();
});

createAnswerBtn.addEventListener("click", async () => {
  const offerText = guestOfferIn.value.trim();
  if (!offerText) return;

  role = "O";
  playerRoleEl.textContent = role;
  state = structuredClone(initialState);
  createPeer(false);

  const offer = decode(offerText);
  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  await waitIceComplete(peer);

  guestAnswerOut.value = encode(peer.localDescription.toJSON());
  setConnection("Answer created. Send it back to host.");
  drawBoard();
});

connectAnswerBtn.addEventListener("click", async () => {
  const answerText = hostAnswerIn.value.trim();
  if (!answerText || !peer) return;
  await peer.setRemoteDescription(decode(answerText));
  setConnection("Answer connected. Waiting for guest...");
  drawBoard();
});

resetBtn.addEventListener("click", () => {
  if (!channel || channel.readyState !== "open") return;

  state = structuredClone(initialState);
  drawBoard();
  if (role === "X") send({ type: "state", state });
  else send({ type: "reset" });
});

disconnectBtn.addEventListener("click", () => {
  if (channel) channel.close();
  if (peer) peer.close();
  channel = null;
  peer = null;
  role = null;
  state = structuredClone(initialState);
  playerRoleEl.textContent = "-";
  resetBtn.disabled = true;
  disconnectBtn.disabled = true;
  setConnection("Not connected.");
  drawBoard();
});

drawBoard();
