io.on("connection", (socket) => {
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("sendMessage", (msg) => {
    socket.to(msg.chatId).emit("receiveMessage", msg);
  });
});
