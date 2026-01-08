import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
