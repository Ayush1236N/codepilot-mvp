import { Router } from "express";
import { nanoid } from "nanoid";
import { insertTask, getTask, listTasks, getLogs, getIterations } from "../db";
import { TaskRecord } from "../types";
import { runTask, approveAndCreatePR, rejectTask } from "../services/orchestrator";
import * as githubService from "../services/github.service";
import { cleanupWorkspace } from "../services/repo.service";

export const tasksRouter = Router();

tasksRouter.post("/", async (req, res) => {
  try {
    const { repoFullName, issueNumber, githubToken, anthropicApiKey, maxIterations } = req.body;
    if (!repoFullName || !issueNumber || !githubToken || !anthropicApiKey) {
      return res.status(400).json({ error: "repoFullName, issueNumber, githubToken, and anthropicApiKey are required" });
    }
    const [owner, repo] = repoFullName.split("/");
    const issue = await githubService.getIssue(githubToken, owner, repo, Number(issueNumber));

    const id = nanoid(10);
    const now = new Date().toISOString();
    const record: TaskRecord = {
      id,
      repo_full_name: repoFullName,
      issue_number: issue.number,
      issue_title: issue.title,
      issue_body: issue.body,
      status: "CREATED",
      max_iterations: Math.min(Math.max(Number(maxIterations) || 3, 1), 5),
      current_iteration: 0,
      branch_name: null,
      pr_url: null,
      final_diff: null,
      verification_summary: null,
      build_status: null,
      tests_passed: 0,
      tests_failed: 0,
      created_at: now,
      updated_at: now,
      github_token: githubToken,
      anthropic_api_key: anthropicApiKey,
    };
    insertTask(record);

    // Fire-and-forget: orchestrator runs async, progress streamed via WebSocket + polling.
    runTask(id).catch((e) => console.error("runTask crashed:", e));

    res.status(201).json(toPublicTask(record));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

tasksRouter.get("/", (_req, res) => {
  res.json(listTasks().map(toPublicTask));
});

tasksRouter.get("/:id", (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({
    ...toPublicTask(task),
    logs: getLogs(task.id),
    iterations: getIterations(task.id),
  });
});

tasksRouter.post("/:id/approve", async (req, res) => {
  try {
    await approveAndCreatePR(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

tasksRouter.post("/:id/reject", (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  rejectTask(req.params.id);
  res.json({ ok: true });
});

tasksRouter.delete("/:id/workspace", (req, res) => {
  cleanupWorkspace(req.params.id);
  res.json({ ok: true });
});

function toPublicTask(t: TaskRecord) {
  // Never leak tokens/keys back to the client.
  const { github_token, anthropic_api_key, ...pub } = t;
  return pub;
}
