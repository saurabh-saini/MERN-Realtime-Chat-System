import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

/* =====================================================
   ACCESS / CREATE ONE-TO-ONE CHAT
   + reset unread for current user
===================================================== */
export const accessChat = async (req, res) => {
  const { userId } = req.body;

  let chat = await Chat.findOne({
    users: { $all: [req.user._id, userId] },
  })
    .populate("users", "name avatar lastSeen")
    .populate("lastMessage");

  // 🔥 create chat if not exists
  if (!chat) {
    chat = await Chat.create({
      users: [req.user._id, userId],
      unreadCounts: new Map(),
    });
  }

  // 🔥 safety
  chat.unreadCounts = chat.unreadCounts || new Map();

  // 🔥 reset unread for current user
  chat.unreadCounts.set(req.user._id.toString(), 0);
  await chat.save();

  // 🔥 re-populate after save
  chat = await Chat.findById(chat._id)
    .populate("users", "name avatar lastSeen")
    .populate("lastMessage");

  res.json(chat);
};

/* =====================================================
   SEND MESSAGE
   + increment unread for other users
===================================================== */
export const sendMessage = async (req, res) => {
  const { chatId, text } = req.body;

  const message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    text,
  });

  const chat = await Chat.findById(chatId);
  if (!chat) return res.sendStatus(404);

  chat.unreadCounts = chat.unreadCounts || new Map();

  // 🔥 increment unread for OTHER users
  chat.users.forEach((userId) => {
    if (userId.toString() !== req.user._id.toString()) {
      const prev = chat.unreadCounts.get(userId.toString()) || 0;
      chat.unreadCounts.set(userId.toString(), prev + 1);
    }
  });

  chat.lastMessage = message._id;
  await chat.save();

  const fullMessage = await Message.findById(message._id).populate(
    "sender",
    "name avatar"
  );

  res.json(fullMessage);
};

/* =====================================================
   GET ALL MESSAGES OF A CHAT
===================================================== */
export const getMessages = async (req, res) => {
  const messages = await Message.find({
    chat: req.params.chatId,
  }).populate("sender", "name avatar");

  res.json(messages);
};

/* =====================================================
   GET MY CHATS (SIDEBAR)
   sorted by last activity
===================================================== */
export const getMyChats = async (req, res) => {
  const chats = await Chat.find({
    users: { $in: [req.user._id] },
  })
    .populate("users", "name avatar lastSeen")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

  res.json(chats);
};

/* =====================================================
   MARK CHAT AS READ
   (used when chat is opened / message seen)
===================================================== */
export const markChatRead = async (req, res) => {
  const { chatId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return res.sendStatus(404);

  chat.unreadCounts = chat.unreadCounts || new Map();

  // 🔥 reset unread for current user
  chat.unreadCounts.set(req.user._id.toString(), 0);
  await chat.save();

  res.sendStatus(200);
};
