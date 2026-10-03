import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { wrap } from "../middleware/wrap";
import { validateBody } from "../middleware/errorHandler";
import { forgotSchema, loginSchema, registerSchema, resetSchema, verifySchema } from "../validators/schemas";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), wrap(auth.register));
authRouter.post("/login", authLimiter, validateBody(loginSchema), wrap(auth.login));
authRouter.post("/refresh", wrap(auth.refresh));
authRouter.post("/logout", wrap(auth.logout));
authRouter.get("/me", requireAuth, wrap(auth.me));
authRouter.get("/sessions", requireAuth, wrap(auth.sessions));
authRouter.delete("/sessions/:id", requireAuth, wrap(auth.revoke));
authRouter.post("/verify-email", validateBody(verifySchema), wrap(auth.verifyEmail));
authRouter.post("/resend-verification", requireAuth, wrap(auth.resend));
authRouter.post("/forgot-password", authLimiter, validateBody(forgotSchema), wrap(auth.forgot));
authRouter.post("/reset-password", authLimiter, validateBody(resetSchema), wrap(auth.reset));
