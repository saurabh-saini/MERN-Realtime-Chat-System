import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
