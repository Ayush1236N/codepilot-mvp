import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { TaskRecord, TaskLogEntry, TaskIterationRecord, TaskStatus } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "codepilot.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  repo_full_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  issue_title TEXT NOT NULL,
  issue_body TEXT NOT NULL,
  status TEXT NOT NULL,
  max_iterations INTEGER NOT NULL DEFAULT 3,
  current_iteration INTEGER NOT NULL DEFAULT 0,
  branch_name TEXT,
  pr_url TEXT,
  final_diff TEXT,
  verification_summary TEXT,
  build_status TEXT,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  github_token TEXT NOT NULL,
  anthropic_api_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_iterations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  plan_summary TEXT,
  patch TEXT,
  build_status TEXT,
  tests_passed INTEGER,
  tests_failed INTEGER,
  failure_analysis TEXT,
  created_at TEXT NOT NULL
);
`);

export function insertTask(t: TaskRecord) {
  db.prepare(
    `INSERT INTO tasks (id, repo_full_name, issue_number, issue_title, issue_body, status, max_iterations,
      current_iteration, branch_name, pr_url, final_diff, verification_summary, build_status,
      tests_passed, tests_failed, created_at, updated_at, github_token, anthropic_api_key)
     VALUES (@id,@repo_full_name,@issue_number,@issue_title,@issue_body,@status,@max_iterations,
      @current_iteration,@branch_name,@pr_url,@final_diff,@verification_summary,@build_status,
      @tests_passed,@tests_failed,@created_at,@updated_at,@github_token,@anthropic_api_key)`
  ).run(t as any);
}

export function updateTask(id: string, fields: Partial<TaskRecord>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE tasks SET ${setClause}, updated_at = @updated_at WHERE id = @id`).run({
    ...fields,
    id,
    updated_at: new Date().toISOString(),
  } as any);
}

export function getTask(id: string): TaskRecord | undefined {
  return db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as TaskRecord | undefined;
}

export function listTasks(): TaskRecord[] {
  return db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`).all() as TaskRecord[];
}

export function setStatus(id: string, status: TaskStatus) {
  updateTask(id, { status });
}

export function addLog(entry: TaskLogEntry) {
  db.prepare(`INSERT INTO task_logs (task_id, ts, level, message) VALUES (?,?,?,?)`).run(
    entry.task_id,
    entry.ts,
    entry.level,
    entry.message
  );
}

export function getLogs(taskId: string): TaskLogEntry[] {
  return db.prepare(`SELECT * FROM task_logs WHERE task_id = ? ORDER BY id ASC`).all(taskId) as TaskLogEntry[];
}

export function addIteration(rec: TaskIterationRecord) {
  db.prepare(
    `INSERT INTO task_iterations (task_id, iteration, plan_summary, patch, build_status, tests_passed, tests_failed, failure_analysis, created_at)
     VALUES (@task_id,@iteration,@plan_summary,@patch,@build_status,@tests_passed,@tests_failed,@failure_analysis,@created_at)`
  ).run(rec as any);
}

export function getIterations(taskId: string): TaskIterationRecord[] {
  return db
    .prepare(`SELECT * FROM task_iterations WHERE task_id = ? ORDER BY iteration ASC`)
    .all(taskId) as TaskIterationRecord[];
}
