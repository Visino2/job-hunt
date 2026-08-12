import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import { profileRouter } from "./routes/profile.js";
import { tailorRouter } from "./routes/tailor.js";
import { applicationsRouter } from "./routes/applications.js";
import { interviewRouter } from "./routes/interview.js";
import { jobsRouter } from "./routes/jobs.js";
import { exportRouter } from "./routes/export.js";
import { authRouter } from "./routes/auth.js";

const app = express();
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : undefined));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", authRouter);

// Left reachable without a password — no sensitive data (never the key
// itself, just whether one's configured), and hosting platforms ping this
// for health checks without knowing your app password.
app.get("/api/health", (_req, res) => {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const hasApiKey =
    provider === "gemini"
      ? Boolean(process.env.GEMINI_API_KEY)
      : Boolean(process.env.ANTHROPIC_API_KEY);
  res.json({ ok: true, provider, hasApiKey });
});

// One shared secret, not per-user accounts — this app has exactly one
// intended user. Only active when APP_PASSWORD is set (deployed use);
// local dev is unaffected. Everything below this line is gated.
app.use("/api", (req, res, next) => {
  const required = process.env.APP_PASSWORD;
  if (!required || req.header("x-app-password") === required) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
});

app.use("/api/profile", profileRouter);
app.use("/api/tailor", tailorRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/export", exportRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`job-hunt-assistant server listening on http://localhost:${port}`);
});
