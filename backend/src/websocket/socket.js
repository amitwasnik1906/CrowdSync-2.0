const { Server } = require("socket.io");

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Join a bus room to receive location updates, entry/exit events
    socket.on("joinBus", (busId) => {
      socket.join(`bus_${busId}`);
      console.log(`[WS] ${socket.id} joined bus_${busId}`);
    });

    // Leave a bus room
    socket.on("leaveBus", (busId) => {
      socket.leave(`bus_${busId}`);
      console.log(`[WS] ${socket.id} left bus_${busId}`);
    });

    // Join a parent room to receive personal notifications
    socket.on("joinParent", (parentId) => {
      socket.join(`parent_${parentId}`);
      console.log(`[WS] ${socket.id} joined parent_${parentId}`);
    });

    // Leave parent room
    socket.on("leaveParent", (parentId) => {
      socket.leave(`parent_${parentId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
