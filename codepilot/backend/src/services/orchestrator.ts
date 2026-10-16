import { nanoid } from "nanoid";
import { getTask, updateTask, addIteration } from "../db";
import { emitLog, emitStatus } from "../ws";
import * as githubService from "./github.service";
import * as repoService from "./repo.service";
import * as contextService from "./context.service";
import * as agentService from "./agent.service";
import * as patchService from "./patch.service";
import * as sandboxService from "./sandbox.service";
import { TaskRecord, TaskStatus, MavenTestResult } from "../types";

function log(taskId: string, level: "info" | "warn" | "error" | "agent" | "sandbox", msg: string) {
  emitLog(taskId, level, msg);
}

function setStatus(taskId: string, status: TaskStatus) {
  updateTask(taskId, { status });
  emitStatus(taskId, status);
}

/**
 * Runs the full pipeline up through verification, then stops at
 * AWAITING_APPROVAL (or FAILED/TIMEOUT/SECURITY_BLOCKED). PR creation only
 * happens after an explicit human approval call (see approveTask below).
 */
export async function runTask(taskId: string) {
  const task = getTask(taskId);
  if (!task) return;

  try {
    const [owner, repo] = task.repo_full_name.split("/");

    // 1. Repository connection + inspection
    setStatus(taskId, "CLONING");
    log(taskId, "info", `Fetching repository metadata for ${task.repo_full_name}...`);
    const repoInfo = await githubService.getRepoInfo(task.github_token, owner, repo);
    log(taskId, "info", `Cloning ${task.repo_full_name}@${repoInfo.defaultBranch}...`);
    const dir = await repoService.cloneRepo(taskId, repoInfo.cloneUrl, task.github_token, repoInfo.defaultBranch);

    const detection = repoService.detectBuildSystem(dir);
    log(
      taskId,
      "info",
      `Detected: Java=${detection.isJava} Maven=${detection.isMaven} javaFiles=${detection.javaFileCount} testFiles=${detection.testFileCount}`
    );
    if (!detection.isJava || !detection.isMaven) {
      log(taskId, "error", "Repository is not a Java+Maven project. MVP scope only supports Java/Maven.");
      setStatus(taskId, "FAILED");
      updateTask(taskId, { verification_summary: "Unsupported project type (MVP requires Java + Maven)." });
      return;
    }

    // 2. Repository indexing / structural context retrieval
    setStatus(taskId, "INDEXING");
    log(taskId, "info", "Indexing repository symbols (package/class/method structural scan)...");
    const symbols = contextService.indexRepository(dir);
    const relevantFiles = contextService.retrieveRelevantFiles(dir, symbols, task.issue_title, task.issue_body);
    log(taskId, "info", `Selected ${relevantFiles.length} relevant files for agent context: ${relevantFiles.map((f) => f.relativePath).join(", ")}`);

    // 3. Planning + initial patch generation
    setStatus(taskId, "PLANNING");
    log(taskId, "agent", "Requesting implementation plan and initial patch from the coding agent...");
    let agentResp = await agentService.generateInitialPatch(
      task.anthropic_api_key,
      task.issue_title,
      task.issue_body,
      relevantFiles,
      task.max_iterations
    );
    log(taskId, "agent", `Plan: ${agentResp.summary}`);

    let iteration = 1;
    let verified = false;
    let lastTestResult: MavenTestResult | null = null;
    let lastPatch = agentResp.patch;

    while (iteration <= task.max_iterations) {
      updateTask(taskId, { current_iteration: iteration });

      // 4. Patch application
      setStatus(taskId, "PATCHING");
      log(taskId, "info", `[iteration ${iteration}] Applying patch (${agentResp.files_changed.join(", ") || "files per diff"})...`);
      const applyResult = await patchService.applyPatch(dir, agentResp.patch, agentResp.files_changed);

      if (!applyResult.applied) {
        log(taskId, "error", `Patch failed to apply: ${applyResult.error}`);
        if (iteration >= task.max_iterations) {
          setStatus(taskId, "FAILED");
          updateTask(taskId, { verification_summary: `Patch application failed and no iterations remain: ${applyResult.error}` });
          return;
        }
        // Ask the agent to regenerate given the apply error, reusing the repair path
        const fakeResult: MavenTestResult = {
          buildStatus: "ERROR",
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
          testsErrored: 0,
          failingTests: [],
          rawOutput: `git apply failed:\n${applyResult.error}`,
          exitCode: 1,
          timedOut: false,
        };
        iteration++;
        agentResp = await agentService.generateRepairPatch(
          task.anthropic_api_key,
          task.issue_title,
          task.issue_body,
          lastPatch,
          fakeResult,
          iteration,
          task.max_iterations
        );
        lastPatch = agentResp.patch;
        continue;
      }

      if (applyResult.outOfScopeFiles.length > 0) {
        log(taskId, "error", `Security: patch touched out-of-scope paths: ${applyResult.outOfScopeFiles.join(", ")}`);
        setStatus(taskId, "SECURITY_BLOCKED");
        updateTask(taskId, { verification_summary: "Patch touched files outside the repository workspace and was blocked." });
        return;
      }
      log(taskId, "info", `Patch applied cleanly. Touched files: ${applyResult.touchedFiles.join(", ")}`);

      // 5. Ephemeral sandbox: resolve dependencies (network on), then build+test (network off)
      setStatus(taskId, "RESOLVING_DEPENDENCIES");
      log(taskId, "sandbox", "Starting dependency-resolution container (network enabled, resource-limited)...");
      await sandboxService.resolveDependencies(dir, sandboxService.DEFAULT_LIMITS, (m) => log(taskId, "sandbox", m));

      setStatus(taskId, "BUILDING");
      log(taskId, "sandbox", "Starting build/test container (network disabled, CPU/memory/pids limited)...");
      setStatus(taskId, "TESTING");
      const testResult = await sandboxService.buildAndTest(dir, sandboxService.DEFAULT_LIMITS, (m) => log(taskId, "sandbox", m));
      lastTestResult = testResult;

      log(
        taskId,
        "info",
        `Build status: ${testResult.buildStatus} | tests run=${testResult.testsRun} passed=${testResult.testsPassed} failed=${testResult.testsFailed} errored=${testResult.testsErrored} timedOut=${testResult.timedOut}`
      );

      addIteration({
        task_id: taskId,
        iteration,
        plan_summary: agentResp.summary,
        patch: agentResp.patch,
        build_status: testResult.buildStatus,
        tests_passed: testResult.testsPassed,
        tests_failed: testResult.testsFailed,
        failure_analysis: testResult.buildStatus === "SUCCESS" ? null : testResult.failingTests.map((t) => t.name).join(", "),
        created_at: new Date().toISOString(),
      });

      const thisIterationVerified =
        testResult.buildStatus === "SUCCESS" &&
        testResult.testsFailed === 0 &&
        testResult.testsErrored === 0 &&
        !testResult.timedOut &&
        testResult.exitCode === 0;

      if (thisIterationVerified) {
        verified = true;
        break;
      }

      if (testResult.timedOut) {
        log(taskId, "error", "Sandbox execution timed out.");
        setStatus(taskId, "TIMEOUT");
        updateTask(taskId, {
          verification_summary: "Execution exceeded the configured sandbox time limit.",
          build_status: testResult.buildStatus,
          tests_passed: testResult.testsPassed,
          tests_failed: testResult.testsFailed,
        });
        return;
      }

      if (iteration >= task.max_iterations) {
        log(taskId, "error", "Maximum repair iterations reached without verification.");
        break;
      }

      // 6. Failure analysis + repair
      setStatus(taskId, "ANALYZING_FAILURE");
      log(taskId, "agent", "Analyzing failure output and generating a repair patch...");
      await patchService.resetRepo(dir); // repair patches are generated against the ORIGINAL tree
      setStatus(taskId, "REPAIRING");
      iteration++;
      agentResp = await agentService.generateRepairPatch(
        task.anthropic_api_key,
        task.issue_title,
        task.issue_body,
        lastPatch,
        testResult,
        iteration,
        task.max_iterations
      );
      lastPatch = agentResp.patch;
      log(taskId, "agent", `Repair plan (iteration ${iteration}): ${agentResp.summary}`);
    }

    const finalDiff = await patchService.getDiff(dir);

    if (!verified) {
      setStatus(taskId, "FAILED");
      updateTask(taskId, {
        verification_summary: `Not verified after ${iteration} iteration(s). Last build status: ${lastTestResult?.buildStatus}.`,
        build_status: lastTestResult?.buildStatus || null,
        tests_passed: lastTestResult?.testsPassed || 0,
        tests_failed: lastTestResult?.testsFailed || 0,
        final_diff: finalDiff,
      });
      return;
    }

    // 7. Verified — await human approval before any GitHub write operation
    updateTask(taskId, {
      final_diff: finalDiff,
      verification_summary: `Verified: patch applied, build succeeded, ${lastTestResult?.testsPassed} test(s) passed, 0 failed, 0 errored.`,
      build_status: lastTestResult?.buildStatus || null,
      tests_passed: lastTestResult?.testsPassed || 0,
      tests_failed: lastTestResult?.testsFailed || 0,
      branch_name: `codepilot/issue-${task.issue_number}-${nanoid(6)}`,
    });
    setStatus(taskId, "AWAITING_APPROVAL");
    log(taskId, "info", "Verification succeeded. Awaiting human approval before PR creation.");
  } catch (err: any) {
    log(taskId, "error", `Unhandled orchestrator error: ${err.message}`);
    setStatus(taskId, "FAILED");
    updateTask(taskId, { verification_summary: `Internal error: ${err.message}` });
  }
}

export async function approveAndCreatePR(taskId: string) {
  const task = getTask(taskId);
  if (!task) throw new Error("Task not found");
  if (task.status !== "AWAITING_APPROVAL") throw new Error(`Task is not awaiting approval (status: ${task.status})`);

  setStatus(taskId, "APPROVED");
  const [owner, repo] = task.repo_full_name.split("/");
  const dir = repoService.repoDir(taskId);

  try {
    setStatus(taskId, "CREATING_PR");
    const repoInfo = await githubService.getRepoInfo(task.github_token, owner, repo);
    const branchName = task.branch_name || `codepilot/issue-${task.issue_number}-${nanoid(6)}`;
    log(taskId, "info", `Creating branch ${branchName}, committing, and pushing...`);

    const gitService = await import("./git.service");
    await gitService.commitAndPush(
      dir,
      branchName,
      `CodePilot: fix #${task.issue_number} - ${task.issue_title}`,
      repoInfo.cloneUrl,
      task.github_token
    );

    log(taskId, "info", "Opening pull request...");
    const pr = await githubService.createPullRequest(task.github_token, owner, repo, {
      title: `CodePilot: ${task.issue_title}`,
      body: `Automated fix for #${task.issue_number}, generated and verified by CodePilot.\n\n${task.verification_summary || ""}\n\n_This PR was generated autonomously. Review carefully before merging._`,
      head: branchName,
      base: repoInfo.defaultBranch,
    });

    updateTask(taskId, { pr_url: pr.url, branch_name: branchName });
    setStatus(taskId, "VERIFIED");
    log(taskId, "info", `Pull request created: ${pr.url}`);
  } catch (err: any) {
    log(taskId, "error", `PR creation failed: ${err.message}`);
    setStatus(taskId, "FAILED");
    updateTask(taskId, { verification_summary: `PR creation failed: ${err.message}` });
  }
}

export function rejectTask(taskId: string) {
  setStatus(taskId, "REJECTED");
  log(taskId, "info", "Task rejected by human reviewer. No PR was created.");
}
