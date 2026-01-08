import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getUsers } from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, getUsers);

export default router;
