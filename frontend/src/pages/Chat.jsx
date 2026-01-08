import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { socket } from "../socket";
import "../styles/chat.css";

export default function Chat() {
  const [chat, setChat] = useState(null);
  const [clearSearch, setClearSearch] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    // 🔥 CONNECT SOCKET
    socket.connect();

    // 🔥 VERY IMPORTANT (ONLINE / LAST SEEN)
    socket.emit("setup", user._id);

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app">
      <Sidebar
        setChat={setChat}
        chat={chat}
        clearSearch={clearSearch}
        setClearSearch={setClearSearch}
      />

      <ChatWindow chat={chat} onMessageSent={() => setClearSearch(true)} />
    </div>
  );
}
