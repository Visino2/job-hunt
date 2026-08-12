import { Router } from "express";
import { getProfile, saveProfile } from "../services/profileStore.js";
import { fullProfileSchema } from "../schemas.js";

export const profileRouter = Router();

profileRouter.get("/", (_req, res) => {
  res.json(getProfile());
});

profileRouter.put("/", (req, res) => {
  const parsed = fullProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile payload", issues: parsed.error.issues });
    return;
  }
  const updated = saveProfile(parsed.data);
  res.json(updated);
});
