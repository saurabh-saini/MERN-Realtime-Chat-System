import { useEffect, useState, useMemo, useRef } from "react";
import api from "../services/api";
import { socket } from "../socket";
import MessageInput from "./MessageInput";

/* ===============================
   Helpers
================================ */
const getDayLabel = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long" });
};

const formatLastSeen = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let dayText = "";

  if (d.toDateString() === today.toDateString()) {
    dayText = "Today";
  } else if (d.toDateString() === yesterday.toDateString()) {
    dayText = "Yesterday";
  } else {
    dayText = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return `Last seen ${dayText} at ${time}`;
};

export default function ChatWindow({ chat, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const bottomRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  /* ===============================
     Reset unread when chat opens
  ================================ */
  useEffect(() => {
    if (!chat) return;
    api.post("/chats/read", { chatId: chat._id });
  }, [chat]);

  /* ===============================
     Load old messages
  ================================ */
  useEffect(() => {
    if (!chat) return;

    setMessages([]);
    isFirstLoadRef.current = true;

    api.get(`/chats/message/${chat._id}`).then((res) => {
      setMessages(res.data || []);
    });

    socket.emit("joinChat", chat._id);
  }, [chat]);

  /* ===============================
     Realtime messages
  ================================ */
  useEffect(() => {
    if (!chat) return;

    const handleMessage = async (msg) => {
      if (msg.chatId !== chat._id) return;

      setMessages((prev) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
      );

      await api.post("/chats/read", { chatId: chat._id });
    };

    socket.on("messageReceived", handleMessage);
    return () => socket.off("messageReceived", handleMessage);
  }, [chat]);

  /* ===============================
     ONLINE / LAST SEEN (FIXED)
  ================================ */
  useEffect(() => {
    if (!chat) return;

    const otherUser = chat.users.find((u) => u._id !== currentUser._id);

    // default state
    setIsOnline(false);
    setLastSeen(otherUser.lastSeen || null);

    // 🔥 NEW: handle full online users list (on refresh)
    const handleOnlineUsers = (onlineUserIds) => {
      if (onlineUserIds.includes(otherUser._id)) {
        setIsOnline(true);
      }
    };

    const handleOnline = (userId) => {
      if (userId === otherUser._id) {
        setIsOnline(true);
      }
    };

    const handleOffline = ({ userId, lastSeen }) => {
      if (userId === otherUser._id) {
        setIsOnline(false);
        setLastSeen(lastSeen);
      }
    };

    socket.on("online-users", handleOnlineUsers);
    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);

    return () => {
      socket.off("online-users", handleOnlineUsers);
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
    };
  }, [chat, currentUser._id]);

  /* ===============================
     Auto scroll
  ================================ */
  useEffect(() => {
    if (!messages.length) return;

    bottomRef.current?.scrollIntoView({
      behavior: isFirstLoadRef.current ? "auto" : "smooth",
    });

    isFirstLoadRef.current = false;
  }, [messages]);

  /* ===============================
     Send message
  ================================ */
  const sendMessage = async (text) => {
    const res = await api.post("/chats/message", {
      chatId: chat._id,
      text,
    });

    socket.emit("newMessage", res.data);
    onMessageSent?.();
  };

  const rendered = useMemo(() => {
    let lastDay = null;

    return messages.flatMap((m) => {
      const day = getDayLabel(m.createdAt);
      const items = [];

      if (day !== lastDay) {
        items.push({ type: "day", id: `d-${m._id}`, label: day });
        lastDay = day;
      }

      items.push({ type: "msg", id: m._id, data: m });
      return items;
    });
  }, [messages]);

  if (!chat) return <div className="chat-empty">Select a chat</div>;

  const otherUser = chat.users.find((u) => u._id !== currentUser._id);

  return (
    <div className="chat-window">
      {/* HEADER */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="avatar">
            {otherUser.avatar ? (
              <img src={otherUser.avatar} alt={otherUser.name} />
            ) : (
              <div className="avatar-fallback">
                {otherUser.name[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="chat-header-info">
            <div className="chat-title">{otherUser.name}</div>
            <div className="chat-status">
              {isOnline ? "Online" : formatLastSeen(lastSeen)}
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="chat-messages">
        {rendered.map((item) =>
          item.type === "day" ? (
            <div key={item.id} className="day-separator">
              {item.label}
            </div>
          ) : (
            <div
              key={item.id}
              className={`bubble ${
                item.data.sender?._id === currentUser._id
                  ? "outgoing"
                  : "incoming"
              }`}
            >
              {item.data.text}
              <span className="time">
                {new Date(item.data.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput sendMessage={sendMessage} chat={chat} />
    </div>
  );
}
