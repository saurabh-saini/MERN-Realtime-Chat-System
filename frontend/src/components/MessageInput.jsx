import { useEffect, useRef, useState } from "react";

export default function MessageInput({ sendMessage, chat }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  // 🔥 chat change hote hi focus
  useEffect(() => {
    inputRef.current?.focus();
  }, [chat]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
    inputRef.current?.focus(); // 🔥 send ke baad bhi focus
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="message-input">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
      />
      <button onClick={send}>Send</button>
    </div>
  );
}
