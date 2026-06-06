import express from "express";
import { register, login, logout, getMe } from "../controllers/authController.js";
import { protectRoute } from "../middleware/auth.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login",    login);
authRouter.post("/logout",   logout);         // clears the HttpOnly cookie server-side
authRouter.get("/me",        protectRoute, getMe);

export default authRouter;
