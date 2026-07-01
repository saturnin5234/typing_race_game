const { randomPhrase } = require("./phrases");

const MAX_PLAYERS = 4;
const RACER_ICONS = [
  { id: "snail", emoji: "\u{1F40C}" }, // 🐌
  { id: "slug", emoji: "\u{1FAB1}" }, // 🪱 (no dedicated slug emoji exists, worm is the closest)
  { id: "tortoise", emoji: "\u{1F422}" }, // 🐢
  { id: "sloth", emoji: "\u{1F9A5}" }, // 🦥
];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.state = "lobby"; // lobby -> countdown -> racing -> finished
    this.players = new Map(); // socketId -> player
    this.phrase = null;
    this.startTime = null;
    this.nextPlacement = 1;
  }

  addPlayer(id, name) {
    if (this.players.size >= MAX_PLAYERS) return { error: "Room is full" };
    if (this.state !== "lobby") return { error: "Race already in progress" };
    const icon = RACER_ICONS[this.players.size];
    const player = {
      id,
      name: name.slice(0, 16) || "Player",
      icon: icon.id,
      emoji: icon.emoji,
      progress: 0,
      finished: false,
      placement: null,
    };
    this.players.set(id, player);
    return { player };
  }

  removePlayer(id) {
    this.players.delete(id);
    if (id === this.hostId) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
  }

  isEmpty() {
    return this.players.size === 0;
  }

  startRace() {
    this.phrase = randomPhrase();
    this.state = "racing";
    this.startTime = Date.now();
    this.nextPlacement = 1;
    for (const player of this.players.values()) {
      player.progress = 0;
      player.finished = false;
      player.placement = null;
    }
  }

  setProgress(id, progress) {
    const player = this.players.get(id);
    if (!player || this.state !== "racing") return;
    player.progress = Math.max(player.progress, Math.min(100, progress));
  }

  finishPlayer(id) {
    const player = this.players.get(id);
    if (!player || this.state !== "racing" || player.finished) return null;
    player.finished = true;
    player.progress = 100;
    player.placement = this.nextPlacement++;
    if ([...this.players.values()].every((p) => p.finished)) {
      this.state = "finished";
    }
    return player.placement;
  }

  forceFinish() {
    if (this.state !== "racing") return;
    const stragglers = [...this.players.values()]
      .filter((p) => !p.finished)
      .sort((a, b) => b.progress - a.progress);
    for (const player of stragglers) {
      player.finished = true;
      player.placement = this.nextPlacement++;
    }
    this.state = "finished";
  }

  resetToLobby() {
    this.state = "lobby";
    this.phrase = null;
    this.startTime = null;
    for (const player of this.players.values()) {
      player.progress = 0;
      player.finished = false;
      player.placement = null;
    }
  }

  toJSON() {
    return {
      code: this.code,
      state: this.state,
      hostId: this.hostId,
      phrase: this.state === "racing" || this.state === "finished" ? this.phrase : null,
      players: [...this.players.values()],
    };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId) {
    const code = this.generateCode();
    const room = new Room(code, hostId);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get((code || "").toUpperCase());
  }

  deleteRoom(code) {
    this.rooms.delete(code);
  }
}

module.exports = { RoomManager, MAX_PLAYERS };
