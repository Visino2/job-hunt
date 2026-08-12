import { Router } from "express";
import { getProfile } from "../services/profileStore.js";
import { tailorApplication } from "../services/claude.js";
import { fetchJobDescriptionFromUrl } from "../services/jobFetch.js";
import { tailorRequestSchema } from "../schemas.js";

export const tailorRouter = Router();

tailorRouter.post("/", async (req, res) => {
  const parsed = tailorRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }
  const { jobDescription, jobUrl } = parsed.data;

  try {
    let text = jobDescription?.trim() ?? "";

    if (!text && jobUrl) {
      text = await fetchJobDescriptionFromUrl(jobUrl);
    }

    const profile = getProfile();
    const result = await tailorApplication(profile, text);

    res.json({ jobDescription: text, ...result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Tailoring failed." });
  }
});
