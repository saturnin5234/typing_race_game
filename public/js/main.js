const socket = io();

const views = {
  landing: document.getElementById("view-landing"),
  lobby: document.getElementById("view-lobby"),
  race: document.getElementById("view-race"),
  results: document.getElementById("view-results"),
};

const nameInput = document.getElementById("name-input");
const createBtn = document.getElementById("create-btn");
const codeInput = document.getElementById("code-input");
const joinBtn = document.getElementById("join-btn");
const landingError = document.getElementById("landing-error");

const roomCodeDisplay = document.getElementById("room-code-display");
const playerList = document.getElementById("player-list");
const startBtn = document.getElementById("start-btn");
const lobbyHint = document.getElementById("lobby-hint");

const countdownEl = document.getElementById("countdown");
const trackEl = document.getElementById("track");
const phraseDisplay = document.getElementById("phrase-display");
const typingInput = document.getElementById("typing-input");
const raceHint = document.getElementById("race-hint");

const resultsList = document.getElementById("results-list");
const rematchBtn = document.getElementById("rematch-btn");
const resultsHint = document.getElementById("results-hint");

let selfId = null;
let currentState = null;
let targetPhrase = "";
let lastValidTyped = "";
let inputLocked = false;

function showView(name) {
  for (const key of Object.keys(views)) {
    views[key].hidden = key !== name;
  }
}

function getName() {
  return nameInput.value.trim() || "Player";
}

socket.on("connect", () => {
  selfId = socket.id;
});

createBtn.addEventListener("click", () => {
  landingError.textContent = "";
  socket.emit("room:create", { name: getName() });
});

joinBtn.addEventListener("click", () => {
  landingError.textContent = "";
  const code = codeInput.value.trim().toUpperCase();
  if (!code) {
    landingError.textContent = "Enter a room code first.";
    return;
  }
  socket.emit("room:join", { code, name: getName() });
});

startBtn.addEventListener("click", () => {
  socket.emit("game:start");
});

rematchBtn.addEventListener("click", () => {
  socket.emit("game:rematch");
});

socket.on("room:error", (message) => {
  landingError.textContent = message;
});

socket.on("game:go", ({ phrase, startTime }) => {
  targetPhrase = phrase;
  lastValidTyped = "";
  inputLocked = false;
  typingInput.value = "";
  typingInput.disabled = true;
  raceHint.textContent = "";
  showView("race");
  renderPhrase("");
  runCountdown();
});

socket.on("room:state", (state) => {
  currentState = state;
  render();
});

function render() {
  if (!currentState) return;
  if (currentState.state === "lobby") {
    renderLobby();
  } else if (currentState.state === "racing") {
    renderRace();
  } else if (currentState.state === "finished") {
    renderResults();
  }
}

function renderLobby() {
  showView("lobby");
  roomCodeDisplay.textContent = currentState.code;
  playerList.innerHTML = "";
  for (const player of currentState.players) {
    const li = document.createElement("li");
    const isHost = player.id === currentState.hostId;
    li.innerHTML = `<span class="icon">${player.emoji}</span><span>${escapeHtml(player.name)}</span>${
      isHost ? '<span class="host-tag">HOST</span>' : ""
    }`;
    playerList.appendChild(li);
  }
  const isHost = currentState.hostId === selfId;
  startBtn.hidden = !isHost;
  lobbyHint.textContent = isHost
    ? "Start whenever your friends are ready."
    : "Waiting for the host to start the race...";
}

function renderRace() {
  showView("race");
  trackEl.innerHTML = "";
  for (const player of currentState.players) {
    const lane = document.createElement("div");
    lane.className = "lane" + (player.finished ? " finished" : "");
    lane.innerHTML = `
      <div class="lane-name">${escapeHtml(player.name)}</div>
      <div class="lane-track">
        <div class="lane-racer" style="left: ${player.progress}%">${player.emoji}</div>
        <div class="lane-flag">\u{1F3C1}</div>
      </div>
    `;
    trackEl.appendChild(lane);
  }

  const self = currentState.players.find((p) => p.id === selfId);
  if (self && self.finished) {
    typingInput.disabled = true;
    raceHint.textContent = `You finished ${ordinal(self.placement)}! Waiting for the other racers...`;
  }
}

function renderResults() {
  showView("results");
  resultsList.innerHTML = "";
  const sorted = [...currentState.players].sort((a, b) => (a.placement || 99) - (b.placement || 99));
  for (const player of sorted) {
    const li = document.createElement("li");
    li.textContent = `${ordinal(player.placement)} - ${player.emoji} ${player.name}`;
    resultsList.appendChild(li);
  }
  const isHost = currentState.hostId === selfId;
  rematchBtn.hidden = !isHost;
  resultsHint.textContent = isHost ? "" : "Waiting for the host to start a rematch...";
}

function runCountdown() {
  const steps = ["3", "2", "1", "GO!"];
  let i = 0;
  countdownEl.textContent = steps[i];
  const interval = setInterval(() => {
    i++;
    if (i >= steps.length) {
      clearInterval(interval);
      countdownEl.textContent = "";
      typingInput.disabled = false;
      typingInput.focus();
      return;
    }
    countdownEl.textContent = steps[i];
  }, 700);
}

typingInput.addEventListener("input", () => {
  if (inputLocked) {
    typingInput.value = lastValidTyped;
    return;
  }
  const value = typingInput.value;
  if (targetPhrase.startsWith(value)) {
    lastValidTyped = value;
    renderPhrase(value);
    const progress = Math.round((value.length / targetPhrase.length) * 100);
    socket.emit("game:progress", { progress });
    if (value === targetPhrase) {
      typingInput.disabled = true;
      socket.emit("game:finish");
    }
  } else {
    typingInput.classList.add("error-flash");
    inputLocked = true;
    typingInput.value = lastValidTyped;
    setTimeout(() => {
      inputLocked = false;
      typingInput.classList.remove("error-flash");
    }, 300);
  }
});

function renderPhrase(typed) {
  const typedPart = targetPhrase.slice(0, typed.length);
  const currentChar = targetPhrase[typed.length] || "";
  const restPart = targetPhrase.slice(typed.length + 1);
  phraseDisplay.innerHTML =
    `<span class="typed">${escapeHtml(typedPart)}</span>` +
    `<span class="current">${escapeHtml(currentChar)}</span>` +
    `<span class="untyped">${escapeHtml(restPart)}</span>`;
}

function ordinal(n) {
  if (!n) return "-";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
