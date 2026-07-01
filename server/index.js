const path = require("path");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { RoomManager } = require("./rooms");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const roomManager = new RoomManager();

app.use(express.static(path.join(__dirname, "..", "public")));

function broadcastRoomState(room) {
  io.to(room.code).emit("room:state", room.toJSON());
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name }) => {
    const room = roomManager.createRoom(socket.id);
    const { error } = room.addPlayer(socket.id, name);
    if (error) {
      socket.emit("room:error", error);
      return;
    }
    socket.join(room.code);
    socket.data.roomCode = room.code;
    broadcastRoomState(room);
  });

  socket.on("room:join", ({ code, name }) => {
    const room = roomManager.getRoom(code);
    if (!room) {
      socket.emit("room:error", "Room not found");
      return;
    }
    const { error } = room.addPlayer(socket.id, name);
    if (error) {
      socket.emit("room:error", error);
      return;
    }
    socket.join(room.code);
    socket.data.roomCode = room.code;
    broadcastRoomState(room);
  });

  socket.on("game:start", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== "lobby") return;
    room.startRace();
    io.to(room.code).emit("game:go", { phrase: room.phrase, startTime: room.startTime });
    broadcastRoomState(room);
  });

  socket.on("game:progress", ({ progress }) => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room) return;
    room.setProgress(socket.id, progress);
    broadcastRoomState(room);
  });

  socket.on("game:finish", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room) return;
    room.finishPlayer(socket.id);
    broadcastRoomState(room);
  });

  socket.on("game:end", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.forceFinish();
    broadcastRoomState(room);
  });

  socket.on("game:rematch", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.resetToLobby();
    broadcastRoomState(room);
  });

  socket.on("disconnect", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room) return;
    room.removePlayer(socket.id);
    if (room.isEmpty()) {
      roomManager.deleteRoom(room.code);
    } else {
      broadcastRoomState(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Typing race server listening on port ${PORT}`);
});
