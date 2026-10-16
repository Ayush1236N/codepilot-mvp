import Anthropic from "@anthropic-ai/sdk";
import { AgentPatchResponse, MavenTestResult } from "../types";

const SYSTEM_PROMPT = `You are the coding agent inside CodePilot, an autonomous software engineering platform.

Loop: ANALYZE -> LOCATE -> PLAN -> PATCH -> BUILD -> TEST -> ANALYZE FAILURE -> REPAIR -> RE-TEST -> VERIFY

Rules you must follow:
- Generate the SMALLEST safe patch that addresses the issue. Do not perform unrelated refactors.
- Only modify files that are actually necessary. Never touch build files, CI config, or unrelated tests unless the issue explicitly requires it.
- You do not decide whether a task is verified. The backend applies your patch, builds and tests it in an isolated sandbox, and reports real results back to you. Never claim tests passed — you will be told the actual outcome.
- Output ONLY a single JSON object, no markdown fences, no prose outside the JSON.
- The "patch" field must be a valid unified diff (git diff format, with ---/+++ headers and @@ hunks) that applies cleanly with \`git apply\` from the repository root.
- Use the exact relative file paths given in the provided context.

Respond with exactly this JSON shape:
{
  "summary": "one paragraph description of the change",
  "files_changed": ["relative/path/One.java"],
  "patch": "diff --git a/... b/...\\n--- a/...\\n+++ b/...\\n@@ ...\\n...",
  "rationale": "why this change resolves the issue"
}`;

function buildClient(apiKey: string) {
  return new Anthropic({ apiKey });
}

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Agent response did not contain a JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateInitialPatch(
  apiKey: string,
  issueTitle: string,
  issueBody: string,
  files: { relativePath: string; content: string; classNames: string[] }[],
  maxIterations: number
): Promise<AgentPatchResponse> {
  const client = buildClient(apiKey);

  const contextBlock = files
    .map((f) => `### File: ${f.relativePath}\nClasses: ${f.classNames.join(", ") || "(none detected)"}\n\`\`\`java\n${f.content}\n\`\`\``)
    .join("\n\n");

  const userPrompt = `## GitHub Issue

Title: ${issueTitle}

Body:
${issueBody || "(no description provided)"}

## Maximum repair iterations available
${maxIterations}

## Relevant repository context (selected by structural/keyword retrieval)

${contextBlock}

Analyze the issue, plan the minimal implementation, and generate the initial patch as a unified diff. Respond with the JSON object described in the system prompt only.`;

  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const parsed = extractJson(text);
  return {
    summary: parsed.summary || "",
    files_changed: parsed.files_changed || [],
    patch: parsed.patch || "",
    rationale: parsed.rationale || "",
  };
}

export async function generateRepairPatch(
  apiKey: string,
  issueTitle: string,
  issueBody: string,
  previousPatch: string,
  testResult: MavenTestResult,
  iteration: number,
  maxIterations: number
): Promise<AgentPatchResponse> {
  const client = buildClient(apiKey);

  const failureBlock = testResult.failingTests
    .slice(0, 10)
    .map((t) => `Test: ${t.name}\n${t.trace.slice(0, 2000)}`)
    .join("\n\n---\n\n");

  const userPrompt = `## Repair iteration ${iteration} of ${maxIterations}

The previous patch was applied and the sandbox ran the build/tests. It did NOT verify.

Build status: ${testResult.buildStatus}
Tests run: ${testResult.testsRun}, passed: ${testResult.testsPassed}, failed: ${testResult.testsFailed}, errored: ${testResult.testsErrored}
Timed out: ${testResult.timedOut}

## Failing tests and stack traces

${failureBlock || "(no individual test failures parsed — see raw output excerpt below)"}

## Raw output excerpt (last 4000 chars)

${testResult.rawOutput.slice(-4000)}

## Previous patch (unified diff)

${previousPatch}

## Original issue

Title: ${issueTitle}
Body: ${issueBody}

Read the exit code and stack traces, identify the failing test(s), trace the failure to the relevant code, determine the root cause, and generate a MINIMAL repair. Do not repeat the same unsuccessful change. Respond with the JSON object described in the system prompt, representing the FULL new unified diff to apply to the ORIGINAL (unpatched) repository state (not a diff-of-a-diff).`;

  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const parsed = extractJson(text);
  return {
    summary: parsed.summary || "",
    files_changed: parsed.files_changed || [],
    patch: parsed.patch || "",
    rationale: parsed.rationale || "",
  };
}
