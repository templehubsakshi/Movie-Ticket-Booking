import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protectRoute } from "../middleware/auth.js";

const authRouter = express.Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);

// Protected — returns current user data (token refresh / page reload)
authRouter.get("/me", protectRoute, getMe);

export default authRouter;
