export type TaskStatus =
  | "CREATED"
  | "CLONING"
  | "INDEXING"
  | "PLANNING"
  | "PATCHING"
  | "RESOLVING_DEPENDENCIES"
  | "BUILDING"
  | "TESTING"
  | "ANALYZING_FAILURE"
  | "REPAIRING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "CREATING_PR"
  | "VERIFIED"
  | "FAILED"
  | "TIMEOUT"
  | "REJECTED"
  | "SECURITY_BLOCKED"
  | "CANCELLED";

export interface TaskRecord {
  id: string;
  repo_full_name: string;
  issue_number: number;
  issue_title: string;
  issue_body: string;
  status: TaskStatus;
  max_iterations: number;
  current_iteration: number;
  branch_name: string | null;
  pr_url: string | null;
  final_diff: string | null;
  verification_summary: string | null;
  build_status: string | null;
  tests_passed: number;
  tests_failed: number;
  created_at: string;
  updated_at: string;
  github_token: string; // stored only in-memory/sqlite for task lifetime; see README security notes
  anthropic_api_key: string;
}

export interface TaskLogEntry {
  id?: number;
  task_id: string;
  ts: string;
  level: "info" | "warn" | "error" | "agent" | "sandbox";
  message: string;
}

export interface TaskIterationRecord {
  id?: number;
  task_id: string;
  iteration: number;
  plan_summary: string;
  patch: string;
  build_status: string;
  tests_passed: number;
  tests_failed: number;
  failure_analysis: string | null;
  created_at: string;
}

export interface AgentPatchResponse {
  summary: string;
  files_changed: string[];
  patch: string; // unified diff
  rationale: string;
}

export interface MavenTestResult {
  buildStatus: "SUCCESS" | "FAILURE" | "ERROR";
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsErrored: number;
  failingTests: { name: string; trace: string }[];
  rawOutput: string;
  exitCode: number;
  timedOut: boolean;
}
