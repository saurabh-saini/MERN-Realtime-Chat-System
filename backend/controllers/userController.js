import User from "../models/User.js";

export const getUsers = async (req, res) => {
  const users = await User.find({
    _id: { $ne: req.user._id },
  }).select("name email avatar");

  res.json(users);
};
