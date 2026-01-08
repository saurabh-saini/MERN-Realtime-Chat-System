import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  accessChat,
  sendMessage,
  getMessages,
  getMyChats,
  markChatRead, // 🔥 IMPORT
} from "../controllers/chatController.js";

const router = express.Router();

/* 🔥 SIDEBAR CHAT LIST */
router.get("/", protect, getMyChats);

/* CREATE / ACCESS CHAT */
router.post("/", protect, accessChat);

/* SEND MESSAGE */
router.post("/message", protect, sendMessage);

/* GET MESSAGES OF CHAT */
router.get("/message/:chatId", protect, getMessages);

router.post("/read", protect, markChatRead);

export default router;
