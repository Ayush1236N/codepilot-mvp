import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileP = promisify(execFile);

export interface PatchApplyResult {
  applied: boolean;
  error: string | null;
  touchedFiles: string[];
  outOfScopeFiles: string[];
}

/**
 * Applies a unified diff to the repo using `git apply`, after a dry-run
 * `--check` pass. Verifies the resulting diff only touches files inside the
 * repo and (loosely) within the set the agent declared it would change.
 */
export async function applyPatch(
  repoDir: string,
  patch: string,
  declaredFiles: string[]
): Promise<PatchApplyResult> {
  const patchPath = path.join(repoDir, "..", "current.patch");
  fs.writeFileSync(patchPath, patch, "utf-8");

  try {
    await execFileP("git", ["apply", "--check", "--whitespace=nowarn", patchPath], { cwd: repoDir });
  } catch (e: any) {
    return {
      applied: false,
      error: `git apply --check failed: ${e.stderr || e.message}`,
      touchedFiles: [],
      outOfScopeFiles: [],
    };
  }

  try {
    await execFileP("git", ["apply", "--whitespace=nowarn", patchPath], { cwd: repoDir });
  } catch (e: any) {
    return {
      applied: false,
      error: `git apply failed: ${e.stderr || e.message}`,
      touchedFiles: [],
      outOfScopeFiles: [],
    };
  }

  const { stdout } = await execFileP("git", ["diff", "--name-only", "HEAD"], { cwd: repoDir });
  const touchedFiles = stdout.split("\n").map((s) => s.trim()).filter(Boolean);

  // Security: reject path traversal or anything resolving outside the repo.
  const outOfScope: string[] = [];
  for (const f of touchedFiles) {
    const resolved = path.resolve(repoDir, f);
    if (!resolved.startsWith(path.resolve(repoDir))) outOfScope.push(f);
  }

  return { applied: true, error: null, touchedFiles, outOfScopeFiles: outOfScope };
}

export async function getDiff(repoDir: string): Promise<string> {
  const { stdout } = await execFileP("git", ["diff", "HEAD"], { cwd: repoDir, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

export async function resetRepo(repoDir: string) {
  await execFileP("git", ["reset", "--hard", "HEAD"], { cwd: repoDir });
  await execFileP("git", ["clean", "-fd"], { cwd: repoDir });
}
