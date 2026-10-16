import { getSession } from "./session";

const BASE = "/api";

async function request(path: string, opts: RequestInit = {}) {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (session?.githubToken) headers["X-GitHub-Token"] = session.githubToken;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  validateGithubToken: () => request("/github/validate"),
  listRepos: () => request("/github/repos"),
  listIssues: (owner: string, repo: string) => request(`/github/repos/${owner}/${repo}/issues`),

  createTask: (params: {
    repoFullName: string;
    issueNumber: number;
    githubToken: string;
    anthropicApiKey: string;
    maxIterations: number;
  }) => request("/tasks", { method: "POST", body: JSON.stringify(params) }),

  listTasks: () => request("/tasks"),
  getTask: (id: string) => request(`/tasks/${id}`),
  approveTask: (id: string) => request(`/tasks/${id}/approve`, { method: "POST" }),
  rejectTask: (id: string) => request(`/tasks/${id}/reject`, { method: "POST" }),
};
