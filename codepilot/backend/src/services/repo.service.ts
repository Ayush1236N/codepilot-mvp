import simpleGit from "simple-git";
import path from "path";
import fs from "fs";

const WORKSPACE_ROOT = path.join(__dirname, "..", "..", "workspace");
if (!fs.existsSync(WORKSPACE_ROOT)) fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

export function workspaceDir(taskId: string) {
  return path.join(WORKSPACE_ROOT, taskId);
}

export function repoDir(taskId: string) {
  return path.join(workspaceDir(taskId), "repo");
}

export async function cloneRepo(taskId: string, cloneUrl: string, token: string, defaultBranch: string) {
  const dir = repoDir(taskId);
  fs.mkdirSync(dir, { recursive: true });
  // Inject token for HTTPS auth (public repo, but token gives higher rate limits / push access)
  const authedUrl = cloneUrl.replace("https://", `https://x-access-token:${token}@`);
  const git = simpleGit();
  await git.clone(authedUrl, dir, ["--branch", defaultBranch, "--single-branch", "--depth", "50"]);
  // scrub credentials from the stored remote url immediately after clone
  const repoGit = simpleGit(dir);
  await repoGit.remote(["set-url", "origin", cloneUrl]);
  return dir;
}

export interface RepoDetection {
  isJava: boolean;
  isMaven: boolean;
  pomPath: string | null;
  javaFileCount: number;
  testFileCount: number;
}

export function detectBuildSystem(dir: string): RepoDetection {
  const pomPath = path.join(dir, "pom.xml");
  const isMaven = fs.existsSync(pomPath);
  const javaFiles = walkFiles(dir, ".java");
  const testFiles = javaFiles.filter(
    (f) => f.includes(`${path.sep}test${path.sep}`) || path.basename(f).endsWith("Test.java")
  );
  return {
    isJava: javaFiles.length > 0,
    isMaven,
    pomPath: isMaven ? pomPath : null,
    javaFileCount: javaFiles.length,
    testFileCount: testFiles.length,
  };
}

export function walkFiles(dir: string, extension: string, ignoreDirs = new Set(["target", ".git", "node_modules"])): string[] {
  const results: string[] = [];
  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignoreDirs.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(extension)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

export function cleanupWorkspace(taskId: string) {
  const dir = workspaceDir(taskId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
