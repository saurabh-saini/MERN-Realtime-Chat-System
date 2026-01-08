import { useEffect, useState } from "react";
import api from "../services/api";
import { socket } from "../socket";
import { useNavigate } from "react-router-dom";
import { logout } from "../utils/logout";

/* ===============================
   Helpers
================================ */
const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUnreadCount = (chat, userId) => {
  if (!chat?.unreadCounts) return 0;
  return chat.unreadCounts[userId] || 0;
};

const getAvatar = (user) => {
  if (user?.avatar && user.avatar.trim() !== "") {
    return <img src={user.avatar} alt={user.name} className="avatar-img" />;
  }
  return (
    <div className="avatar-fallback">{user?.name?.[0]?.toUpperCase()}</div>
  );
};

export default function Sidebar({
  setChat,
  chat,
  clearSearch,
  setClearSearch,
}) {
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));

  /* ===============================
     LOAD CHATS
  ================================ */
  useEffect(() => {
    api.get("/chats").then((res) => {
      const sorted = res.data.sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt || 0) -
          new Date(a.lastMessage?.createdAt || 0)
      );

      setChats(sorted);

      // join all chat rooms
      sorted.forEach((c) => socket.emit("joinChat", c._id));
    });
  }, []);

  /* ===============================
     LOAD ALL USERS (EXCEPT ME)
  ================================ */
  useEffect(() => {
    api.get("/users").then((res) => {
      setUsers(res.data);
    });
  }, []);

  /* ===============================
     REALTIME SIDEBAR UPDATE
     🔥 THIS FIXES TOP ORDER ISSUE
  ================================ */
  useEffect(() => {
    const handleMessage = (msg) => {
      if (!msg.chatId) return;

      setChats((prev) => {
        let updatedChat = null;

        const rest = prev.filter((c) => {
          if (c._id === msg.chatId) {
            const isActive = chat && chat._id === c._id;

            updatedChat = {
              ...c,
              lastMessage: msg,
              unreadCounts: {
                ...c.unreadCounts,
                [currentUser._id]: isActive
                  ? 0
                  : (c.unreadCounts?.[currentUser._id] || 0) + 1,
              },
            };
            return false; // remove from old position
          }
          return true;
        });

        return updatedChat ? [updatedChat, ...rest] : prev;
      });
    };

    socket.on("messageReceived", handleMessage);
    return () => socket.off("messageReceived", handleMessage);
  }, [chat, currentUser._id]);

  /* ===============================
     CLEAR SEARCH AFTER SEND
  ================================ */
  useEffect(() => {
    if (clearSearch) {
      setSearch("");
      setClearSearch(false);
    }
  }, [clearSearch, setClearSearch]);

  /* ===============================
     OPEN / CREATE CHAT
  ================================ */
  const openChat = async (userOrChat) => {
    // existing chat
    if (userOrChat.users) {
      setChat(userOrChat);

      setChats((prev) =>
        prev.map((c) =>
          c._id === userOrChat._id
            ? {
                ...c,
                unreadCounts: {
                  ...c.unreadCounts,
                  [currentUser._id]: 0,
                },
              }
            : c
        )
      );

      socket.emit("joinChat", userOrChat._id);
      return;
    }

    // new chat
    const res = await api.post("/chats", {
      userId: userOrChat._id,
    });

    setChat(res.data);

    setChats((prev) => {
      const exists = prev.find((c) => c._id === res.data._id);
      return exists ? prev : [res.data, ...prev];
    });

    socket.emit("joinChat", res.data._id);
  };

  /* ===============================
     LOGOUT
  ================================ */
  const handleLogout = () => {
    socket.disconnect();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    logout(navigate);
  };

  /* ===============================
     🔥 FINAL ORDERED LIST (KEY FIX)
     chats with messages first
     users without chat later
  ================================ */
  const orderedList = [
    ...chats.map((c) => {
      const otherUser = c.users.find((u) => u._id !== currentUser._id);
      return { user: otherUser, chat: c };
    }),
    ...users
      .filter((u) => !chats.some((c) => c.users.some((cu) => cu._id === u._id)))
      .map((u) => ({ user: u, chat: null })),
  ].filter((item) => item.user.name.toLowerCase().includes(search));

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-top">
        <h3>Chats</h3>
        <span>{currentUser.name}</span>
        <span className="logout" onClick={handleLogout}>
          Logout
        </span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span className="search-icon">🔍</span>
        <input
          value={search}
          placeholder="Search or start new chat"
          onChange={(e) => setSearch(e.target.value.toLowerCase().trim())}
        />
      </div>

      {/* List */}
      <div className="chat-list">
        {orderedList.map(({ user, chat: chatItem }) => {
          const unread = chatItem
            ? getUnreadCount(chatItem, currentUser._id)
            : 0;

          return (
            <div
              key={user._id}
              className={`chat-item ${
                chatItem && chat && chat._id === chatItem._id ? "active" : ""
              }`}
              onClick={() => (chatItem ? openChat(chatItem) : openChat(user))}
            >
              <div className="avatar">{getAvatar(user)}</div>

              <div className="chat-info">
                <div className="chat-name">{user.name}</div>
                <div className="chat-last">
                  {chatItem?.lastMessage?.text || "Start new chat"}
                </div>
              </div>

              {chatItem && (
                <div className="chat-meta">
                  <div className="chat-time">
                    {formatTime(chatItem.lastMessage?.createdAt)}
                  </div>
                  {unread > 0 && <div className="unread-badge">{unread}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
