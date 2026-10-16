import { Octokit } from "@octokit/rest";

export function getClient(token: string) {
  return new Octokit({ auth: token });
}

export async function validateToken(token: string) {
  const octokit = getClient(token);
  const { data } = await octokit.users.getAuthenticated();
  return { login: data.login, name: data.name, avatarUrl: data.avatar_url };
}

export async function listRepos(token: string) {
  const octokit = getClient(token);
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
    visibility: "public",
  });
  return repos.map((r) => ({
    fullName: r.full_name,
    description: r.description,
    defaultBranch: r.default_branch,
    private: r.private,
    permissions: r.permissions,
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
  }));
}

export async function listIssues(token: string, owner: string, repo: string) {
  const octokit = getClient(token);
  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  // Exclude pull requests (GitHub's issues API includes PRs)
  return issues
    .filter((i) => !("pull_request" in i))
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body || "",
      labels: (i.labels || []).map((l: any) => (typeof l === "string" ? l : l.name)),
      htmlUrl: i.html_url,
      createdAt: i.created_at,
    }));
}

export async function getIssue(token: string, owner: string, repo: string, issueNumber: number) {
  const octokit = getClient(token);
  const { data } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
  return { number: data.number, title: data.title, body: data.body || "" };
}

export async function getRepoInfo(token: string, owner: string, repo: string) {
  const octokit = getClient(token);
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    defaultBranch: data.default_branch,
    cloneUrl: data.clone_url,
    permissions: data.permissions,
    private: data.private,
  };
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  params: { title: string; body: string; head: string; base: string }
) {
  const octokit = getClient(token);
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base,
  });
  return { url: data.html_url, number: data.number };
}
