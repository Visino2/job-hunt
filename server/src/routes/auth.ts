import { Router } from "express";
import { z } from "zod";

export const authRouter = Router();

// Whether a password is required at all — lets the client skip the login
// screen entirely for local dev, where APP_PASSWORD is normally unset.
authRouter.get("/status", (_req, res) => {
  res.json({ authRequired: Boolean(process.env.APP_PASSWORD) });
});

const loginSchema = z.object({ password: z.string() });

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const required = process.env.APP_PASSWORD;
  if (!required || parsed.data.password === required) {
    res.json({ ok: true });
    return;
  }

  res.status(401).json({ error: "Incorrect password" });
});
