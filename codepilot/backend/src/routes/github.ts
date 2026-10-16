import { Router } from "express";
import * as githubService from "../services/github.service";

export const githubRouter = Router();

function tokenFrom(req: any): string {
  const token = req.headers["x-github-token"];
  if (!token || typeof token !== "string") {
    throw Object.assign(new Error("Missing X-GitHub-Token header"), { status: 401 });
  }
  return token;
}

githubRouter.get("/validate", async (req, res) => {
  try {
    const token = tokenFrom(req);
    const user = await githubService.validateToken(token);
    res.json(user);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

githubRouter.get("/repos", async (req, res) => {
  try {
    const token = tokenFrom(req);
    const repos = await githubService.listRepos(token);
    res.json(repos);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

githubRouter.get("/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const token = tokenFrom(req);
    const issues = await githubService.listIssues(token, req.params.owner, req.params.repo);
    res.json(issues);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
});
