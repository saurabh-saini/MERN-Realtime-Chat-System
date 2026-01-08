import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import User from "./models/User.js"; // 🔥 NEW

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// 🔥 ONLINE USERS MAP
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // 🔥 USER ONLINE
  socket.on("setup", (userId) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);

    // 🔥 notify OTHERS that this user is online
    socket.broadcast.emit("user-online", userId);

    // 🔥 send full online users list to THIS client (important for refresh)
    socket.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("newMessage", (message) => {
    io.to(message.chat.toString()).emit("messageReceived", {
      _id: message._id,
      text: message.text,
      chatId: message.chat,
      sender: message.sender,
      createdAt: message.createdAt,
    });
  });

  // 🔥 USER OFFLINE + LAST SEEN
  socket.on("disconnect", async () => {
    const userId = socket.userId;
    if (!userId) return;

    onlineUsers.delete(userId);

    const lastSeen = new Date();
    await User.findByIdAndUpdate(userId, { lastSeen });

    socket.broadcast.emit("user-offline", {
      userId,
      lastSeen,
    });

    console.log("Socket disconnected:", userId);
  });
});

server.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
