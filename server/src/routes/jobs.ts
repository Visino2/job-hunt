import { Router } from "express";
import { getRecentMatchedJobs } from "../services/rssJobFeeds.js";

export const jobsRouter = Router();

jobsRouter.get("/recent", async (req, res) => {
  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const result = await getRecentMatchedJobs(refresh);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Failed to fetch recent jobs." });
  }
});
