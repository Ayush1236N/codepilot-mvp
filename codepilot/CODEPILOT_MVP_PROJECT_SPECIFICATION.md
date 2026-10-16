# CODEPILOT
## Autonomous Software Engineer with Sandboxed Verification
### SWE-Bench-Style AI Software Engineering Platform

**Version:** 1.0 (MVP-focused)  
**Last updated:** 2026-09-11

---

## 1. Project Overview

CodePilot is an autonomous software-engineering platform that accepts a GitHub repository and software issue, analyzes the repository using AST and symbol relationships, generates a code patch, executes the modified project inside an isolated sandbox, analyzes failures, iterates toward a repair, and produces a verified GitHub Pull Request.

The core differentiator is **verifiable autonomy**: the system does not treat an LLM's claim that a fix is correct as success. A task is considered verified only after the patch is applied successfully and the relevant build and regression tests pass in an isolated execution environment.

---

## 2. Core Objective

The complete target workflow is:

```text
GitHub Repository
        ↓
GitHub Issue
        ↓
Repository Inspection
        ↓
AST + Symbol/Dependency Graph
        ↓
Relevant Context Retrieval
        ↓
Issue Analysis
        ↓
Implementation Plan
        ↓
Patch Generation
        ↓
Patch Application
        ↓
Ephemeral Docker Sandbox
        ↓
Build + Tests
        ↓
Failure Analysis
        ↓
Self-Healing Iteration
        ↓
Regression Verification
        ↓
Code Review / Security Checks
        ↓
Git Commit + Push
        ↓
Verified Pull Request
```

---

## 3. MVP Scope and Non-Scope

### 3.1 MVP Scope (First Complete Version)

| Area | MVP |
|---|---|
| Language | Java only |
| Build system | Maven only |
| Repository type | Public GitHub repositories only |
| Tests | JUnit unit tests only |
| Agent | Single coding agent |
| Sandbox | Docker without gVisor initially |
| GitHub integration | Branch, commit, push, and PR creation with mandatory human approval |
| Benchmarking | Deferred until core loop is stable |
| Later languages | Python/JavaScript/TypeScript after Java pipeline is reliable |

### 3.2 Out of Scope for MVP

- Multi-agent workflows
- gVisor or advanced isolation
- Automatic test generation
- Private repositories
- Gradle support
- SWE-bench benchmarking
- Broad language support beyond Java

---

## 4. Primary Features

- GitHub repository and issue ingestion
- Repository structure and build-system detection
- AST-based source-code analysis
- Symbol and dependency graph generation
- Targeted semantic and structural code retrieval
- Autonomous planning and patch generation
- Minimal-diff code modification
- Ephemeral Docker-based execution
- CPU, memory, timeout, privilege, filesystem, and network controls
- Automated build and regression testing
- Stack-trace and stderr analysis
- Self-healing multi-iteration agent loop
- Git branch, commit, push, and Pull Request generation
- Human approval gate before PR/merge operations
- Benchmarking using a subset of SWE-bench Lite (post-MVP)
- Benchmark and execution dashboard
- Real-time agent logs
- Diff viewer and sandbox terminal viewer
- Observability, metrics, audit logs, and CI/CD

---

## 5. Recommended Technology Stack

| Area | Technology | Purpose |
|---|---|---|
| Backend | Java 21 + Spring Boot | Core platform and orchestration |
| Frontend | React + TypeScript | Professional dashboard |
| Styling | Tailwind CSS / Material UI | UI system |
| Database | PostgreSQL | Persistent application data |
| Vector Search | pgvector | Semantic repository retrieval (post-MVP) |
| Cache / Queue | Redis | Async jobs and transient state |
| Code Parsing | JavaParser / Eclipse JDT | Java AST and symbols |
| Multi-language Parsing | Tree-sitter | Extensible parsing (post-MVP) |
| Code Intelligence | LSP | Definitions and references (post-MVP) |
| Execution | Docker | Isolated code execution |
| Advanced Isolation | gVisor | Additional sandbox isolation (post-MVP) |
| Git | JGit | Repository operations |
| GitHub | GitHub REST/GraphQL API | Issues and PRs |
| Testing | JUnit + Maven/Gradle | Java verification |
| Realtime | WebSocket / SSE | Live agent logs |
| Observability | Micrometer + Prometheus + Grafana | Metrics and monitoring |
| Security | Spring Security + OAuth2/JWT | Authentication and authorization |
| CI/CD | GitHub Actions | Automated build/test/deployment |

---

## 6. System Architecture

```text
┌──────────────────────┐
│ Web UI               │
│ React + TypeScript   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Spring Boot API      │
└──────────┬───────────┘
           │
┌──────────┼────────────────────┐
│          │                    │
▼          ▼                    ▼
Issue    Agent            Repository
Analyzer Orchestrator     Analyzer
│          │                    │
▼          ▼                    ▼
Coding / LLM Agent   AST + Symbol Graph
           │                    │
           └─────────┬──────────┘
                     ▼
               Patch Generator
                     │
                     ▼
               Sandbox Manager
                     │
                     ▼
                  Docker
                     │
               Build + Test Runner
                     │
                     ▼
               Failure Analyzer
                     │
        ┌────────────┴────────────┐
        │                         │
       FAIL                      PASS
        │                         │
        ▼                         ▼
   Repair / Iterate        Verification
                                 │
                                 ▼
                            Git / GitHub
                                 │
                                 ▼
                           Pull Request
```

> gVisor is an advanced post-MVP isolation option and is not part of the initial execution path.

---

## 7. Major Backend Modules

| Module | Responsibility |
|---|---|
| `api` | REST endpoints, validation, task control |
| `agent` | Agent orchestration, planning, iteration state |
| `repository` | Clone, inspect, detect language/build system |
| `ast` | AST parsing and source-code structure |
| `graph` | Symbol/dependency/call/test relationships |
| `retrieval` | Structural + semantic context retrieval |
| `sandbox` | Docker lifecycle and execution policies |
| `testing` | Build/test execution and result parsing |
| `git` | Branches, diffs, commits, push |
| `github` | Issues, repository metadata, PR creation |
| `benchmark` | SWE-bench evaluation and metrics (post-MVP) |
| `security` | Isolation, permissions, validation, audit |
| `database` | Persistence and repository/task metadata |
| `observability` | Logs, metrics, tracing |

---

## 8. User Stories and Acceptance Criteria

### 8.1 Repository Connection

**As a user,**  
I want to connect a public GitHub repository,  
so that CodePilot can analyze and fix issues in that repository.

**Acceptance criteria:**

- User can authenticate via GitHub OAuth.
- User can select a public repository they have access to.
- System can clone the repository into an isolated workspace.
- System detects Java and Maven.
- Errors are shown clearly if cloning or detection fails.

### 8.2 Issue Selection

**As a user,**  
I want to select or enter a GitHub issue,  
so that CodePilot knows what to fix.

**Acceptance criteria:**

- User can pick an open issue from the connected repository.
- User can paste an issue URL or number.
- System fetches issue title, body, and labels.
- System validates that the issue exists and is accessible.

### 8.3 Task Creation

**As a user,**  
I want to create a task for a repository and issue,  
so that the agent can start working.

**Acceptance criteria:**

- Task is created with status `CREATED`.
- Task includes repository, issue, iteration limit, and sandbox policy.
- Task can be queued for execution.
- User can view task status and logs.

### 8.4 Repository Indexing

**As the system,**  
I want to index repository structure and symbols,  
so that the agent can navigate code efficiently.

**Acceptance criteria:**

- System parses Java files into classes, methods, fields.
- System builds symbol and dependency relationships.
- Indexing completes within a configured timeout.
- Failures are logged and task moves to `FAILED` if unrecoverable.

### 8.5 Patch Generation

**As the agent,**  
I want to generate a minimal patch,  
so that the issue is addressed with minimal risk.

**Acceptance criteria:**

- Patch touches only files relevant to the issue.
- Patch is expressed as unified diff or structured operations.
- System validates patch syntax and scope.
- System rejects unrelated or excessive changes.

### 8.6 Sandbox Execution

**As the system,**  
I want to execute builds and tests in a sandbox,  
so that untrusted code cannot affect the host.

**Acceptance criteria:**

- Each run executes in a fresh Docker container.
- Container runs as non-root.
- CPU, memory, timeout, filesystem, and network limits are enforced.
- Container is destroyed after execution.
- All output is captured and persisted.

### 8.7 Failure Repair

**As the agent,**  
I want to analyze failures and propose repairs,  
so that the task can reach a verified state.

**Acceptance criteria:**

- Agent receives exit code, stdout, stderr, and test results.
- Agent proposes a new patch based on failure evidence.
- Maximum iteration count is enforced.
- Repeated identical patches are detected and blocked.

### 8.8 Verification

**As the system,**  
I want to determine task status based on evidence,  
so that users can trust the result.

**Acceptance criteria:**

- Status is `VERIFIED` only if patch applies, build succeeds, and tests pass.
- Status is `FAILED` if maximum iterations are reached without success.
- Status is `TIMEOUT` if execution exceeds limits.
- LLM cannot override system-determined status.

### 8.9 Human Approval

**As a reviewer,**  
I want to review and approve changes before push,  
so that no unreviewed code is published.

**Acceptance criteria:**

- UI shows diff, test results, and iterations.
- Reviewer can approve or reject.
- Approval is recorded with user and timestamp.
- No push or PR occurs without approval.

### 8.10 Pull Request Creation

**As the system,**  
I want to create a GitHub PR after approval,  
so that the fix can be merged upstream.

**Acceptance criteria:**

- System creates a branch `agent/fix-<issue>`.
- System commits and pushes the patch.
- System creates a PR with a structured description.
- PR links back to the task in CodePilot.

---

## 9. Task State Machine

### 9.1 States

```text
CREATED
QUEUED
CLONING
INDEXING
ANALYZING
PLANNING
PATCHING
VERIFYING
REPAIRING
AWAITING_APPROVAL
PR_CREATED
```

### 9.2 Terminal States

```text
VERIFIED
FAILED
TIMEOUT
CANCELLED
SECURITY_BLOCKED
```

### 9.3 Allowed Transitions

```text
CREATED → QUEUED
QUEUED → CLONING
CLONING → INDEXING | FAILED
INDEXING → ANALYZING | FAILED
ANALYZING → PLANNING | FAILED
PLANNING → PATCHING | FAILED
PATCHING → VERIFYING | FAILED
VERIFYING → REPAIRING | AWAITING_APPROVAL | FAILED
REPAIRING → PATCHING | FAILED | TIMEOUT
AWAITING_APPROVAL → PR_CREATED | CANCELLED
PR_CREATED → VERIFIED | FAILED

Any state → CANCELLED if user cancels.
Any state → TIMEOUT if global task timeout is exceeded.
Any state → SECURITY_BLOCKED if a security policy is violated.
```

### 9.4 Worker Failure and Resume

- If a worker crashes mid-task, the task returns to `QUEUED` or a retry state.
- Task metadata and iteration history are persisted before each step.
- Retries are limited to avoid infinite loops.
- Idempotency is ensured for clone, index, patch, and push steps.

---

## 10. Repository Ingestion

```text
GitHub URL
↓
Clone repository
↓
Detect language
↓
Detect Maven / Gradle / other build system
↓
Identify source and test roots
↓
Parse relevant files
↓
Extract symbols and relationships
↓
Persist searchable repository metadata
```

For the first production milestone, prioritize Java repositories.

Expand to Python/JavaScript/TypeScript only after the Java pipeline is reliable.

### 10.1 Build-Detection Matrix

| Area | Initial Support | Later Support |
|---|---|---|
| Language | Java | Python, JavaScript, TypeScript |
| Build system | Maven | Gradle |
| Repository type | Public GitHub repos | Private repositories |
| Tests | JUnit unit tests | Integration and end-to-end tests |
| Java versions | Configurable (e.g., 17, 21) | Automatic version matrix |
| Dependency access | Controlled network or prebuilt cache | More package ecosystems |

If a repository cannot be built due to missing services or credentials, the task moves to `FAILED` with a clear reason.

---

## 11. AST and Symbol Graph

The agent should navigate code structurally rather than relying only on raw text chunks.

The system should extract:

- Classes
- Interfaces
- Methods
- Fields
- Imports
- Annotations
- Method calls
- References
- Inheritance
- Interface implementation
- Tests associated with production code
- Package/module relationships

Example:

```text
PaymentService
├── CALLS → PaymentRepository
├── REFERENCES → Currency
├── CALLS → PaymentValidator
└── TESTED_BY → PaymentServiceTest
```

Suggested graph relationships:

```text
CALLS
IMPORTS
EXTENDS
IMPLEMENTS
REFERENCES
TESTS
DEPENDS_ON
```

---

## 12. Context Retrieval

```text
Issue
↓
Keyword / entity extraction
↓
Symbol search
↓
AST relationships
↓
Dependency graph traversal
↓
Relevant source methods
↓
Relevant tests
↓
Semantic retrieval when needed
↓
Compact LLM context
```

The system should start with the smallest relevant context and expand only when evidence indicates that more context is necessary.

---

## 13. Autonomous Agent Loop

```text
ANALYZE
↓
LOCATE
↓
PLAN
↓
PATCH
↓
BUILD
↓
TEST
↓
ANALYZE FAILURE
↓
REPAIR
↓
RE-TEST
↓
VERIFY
```

- Configure a hard maximum iteration count, such as five; use three for the MVP.
- Persist every iteration, patch, test result, and failure.
- Do not let the LLM directly control host-level execution.

---

## 14. Patch Generation

- Generate minimal, targeted changes.
- Prefer unified diffs or structured patch operations.
- Inspect the final diff before verification.
- Reject unrelated file modifications.

Example:

```diff
- old implementation
+ corrected implementation
```

### 14.1 Patch Application and Rollback Policy

- Patches must apply cleanly to the base commit.
- Maximum number of changed files per iteration: e.g. 10.
- Maximum lines added/removed per iteration: e.g. 300.
- Blocked paths: configuration files, build files (unless explicitly allowed), binary files.
- Binary files are rejected in MVP.
- If a patch fails to apply, the task moves to `FAILED` or `REPAIRING` with clear diagnostics.
- Each iteration starts from the last known good state.
- Duplicate patches (same content hash) are detected and blocked.
- Final diff is compared with the original base branch to ensure consistency.

---

## 15. Sandboxed Execution

All untrusted generated or repository code must execute inside an isolated environment.

```text
Backend
↓
Sandbox Manager
↓
Ephemeral Container
├── Repository
├── Generated Patch
├── Build Tools
└── Test Suite
↓
stdout / stderr / exit code / duration
↓
Container destroyed
```

### 15.1 Sandbox Security and Threat Model

Use:

- Non-root execution, e.g. UID 1000
- CPU and memory limits
- Strict execution timeouts
- Restricted Linux capabilities and privileges
- Restricted filesystem access
- Temporary isolated repository/patch workspace
- No host filesystem access outside the container
- Network disabled by default
- Controlled proxy or prebuilt cache for required package resolution
- Automatic container destruction after execution, including crash paths
- Maximum process count
- Maximum stdout/stderr output size
- Maximum disk usage
- File descriptor limits
- Seccomp and AppArmor profiles
- No secrets or host environment variables unless explicitly required and audited
- Resource exhaustion protection through cgroups and quotas
- Logging of suspected host-escape attempts and transition to `SECURITY_BLOCKED`

Additional architecture rule:

> Docker daemon access must be restricted to the CodePilot backend. The agent must never receive direct Docker daemon control.

Use only trusted, controlled container images. Do not permit the LLM or repository to select arbitrary host-level container images.

gVisor is reserved for the post-MVP advanced isolation configuration.

---

## 16. Test Runner

The MVP should detect Maven and execute the appropriate build/test commands.

Capture:

- Exit code
- stdout
- stderr
- Duration
- Passed tests
- Failed tests
- Stack traces
- Build status

Example:

```json
{
  "exitCode": 1,
  "passed": 42,
  "failed": 2,
  "duration": 14.82,
  "failures": [
    {
      "test": "PaymentServiceTest.testINR",
      "error": "NullPointerException"
    }
  ]
}
```

---

## 17. Self-Healing

```text
Iteration 1
Compilation FAILED
↓
Agent analyzes compiler output
↓
Iteration 2
Compilation PASS
Tests FAILED
↓
Agent analyzes failing test + stack trace
↓
Iteration 3
Tests PASS
↓
VERIFIED
```

The agent must use actual execution evidence, not confidence alone.

Repeatedly failing identical patches should be detected and prevented.

---

## 18. Verification Definition

A task is `VERIFIED` only when all applicable conditions are satisfied:

- Patch applies successfully.
- Project builds successfully.
- Relevant tests pass.
- Existing regression tests pass.
- No newly introduced failures remain.
- Final diff is consistent with the issue.
- Sandbox execution completed within policy limits.

Never mark a task `VERIFIED` solely because the LLM says the code is correct.

---

## 19. Git and GitHub Workflow

```text
Repository
↓
Create agent/fix-<issue>
↓
Apply patch
↓
Run verification
↓
Inspect diff
↓
Commit
↓
Push
↓
Human approval
↓
Create Pull Request
```

Example PR sections:

- Summary
- Changes
- Tests
- Verification
- Iterations
- Sandbox details
- Known limitations

---

## 20. Human Approval Gate

- Default behavior requires human review before publishing or merging changes.
- Provide an explicit approval action in the UI.
- Do not auto-merge by default.
- Record who approved the action and when.
- Store approval/rejection events in the audit log.

---

## 21. Database Model

### 21.1 Core Entities

| Entity | Purpose |
|---|---|
| `users` | Accounts and authentication metadata |
| `repositories` | Repository metadata and configuration |
| `issues` | GitHub issue information |
| `tasks` | One autonomous resolution task |
| `agent_runs` | Iteration prompts, responses, status, timing |
| `files` | Indexed repository files |
| `symbols` | Classes, methods, fields, interfaces |
| `dependencies` | Relationships between symbols/files |
| `patches` | Generated and applied diffs |
| `test_runs` | Build/test execution results |
| `test_failures` | Parsed failures and stack traces |
| `pull_requests` | GitHub PR metadata |
| `benchmark_results` | SWE-bench evaluation data (post-MVP) |
| `audit_logs` | Security and execution events |

### 21.2 Schema Guidelines

- Use UUIDs or bigserial for primary keys.
- Foreign keys enforce referential integrity.
- Status fields use enums such as `task_status` and `agent_run_status`.
- Index `task.status`, `task.repository_id`, `task.created_at`, and `agent_runs.task_id`.
- Large logs and outputs use size limits and retention policies.
- Diffs and patches are stored as text, with compression if needed.
- Sensitive fields such as tokens and secrets are encrypted at rest.
- Multi-user isolation is enforced through `user_id` and repository access controls.
- Audit logs are append-only and immutable.
- Database migrations are managed with Flyway or Liquibase.

---

## 22. Suggested API

```text
POST   /api/repositories
GET    /api/repositories
GET    /api/repositories/{id}

POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/{id}
POST   /api/tasks/{id}/start
POST   /api/tasks/{id}/cancel

GET    /api/tasks/{id}/iterations
GET    /api/tasks/{id}/logs
GET    /api/tasks/{id}/patch
GET    /api/tasks/{id}/tests

POST   /api/tasks/{id}/pull-request

GET    /api/benchmarks           # post-MVP
POST   /api/benchmarks/run       # post-MVP
GET    /api/benchmarks/{id}      # post-MVP
```

### 22.1 API Contracts

#### POST `/api/tasks`

Request:

```json
{
  "repositoryId": "uuid",
  "issueNumber": 123,
  "iterationLimit": 3,
  "sandboxPolicy": {
    "cpuLimit": 2.0,
    "memoryLimitMb": 4096,
    "timeoutSeconds": 600,
    "networkEnabled": false
  }
}
```

Response:

```json
{
  "id": "uuid",
  "status": "CREATED",
  "repositoryId": "uuid",
  "issueNumber": 123,
  "createdAt": "2026-09-11T10:00:00Z"
}
```

Requirements:

- Authentication required via OAuth2/JWT.
- Validation ensures repository exists and issue number is valid.
- Errors return structured JSON with error codes.

#### GET `/api/tasks/{id}`

Response:

```json
{
  "id": "uuid",
  "status": "VERIFYING",
  "repositoryId": "uuid",
  "issueNumber": 123,
  "iterations": 2,
  "lastUpdatedAt": "2026-09-11T10:10:00Z"
}
```

#### WebSocket / SSE Events

Example:

```json
{
  "taskId": "uuid",
  "type": "iteration_complete",
  "data": {
    "iteration": 2,
    "status": "TEST_FAILED",
    "durationSeconds": 45.2
  }
}
```

Logs are streamed as incremental events.

Approval actions are authorized and audited.

---

## 23. Frontend / Dashboard

The frontend should include:

### Dashboard

- Active tasks
- Success rate
- Average iterations
- Test pass rate
- Recent tasks
- Verification status

### Task Detail

- Issue title/body
- Repository
- Current status
- Agent steps
- Iteration history
- Changed files
- Patch/diff
- Test results
- Runtime
- Sandbox status

### Live Terminal

Display:

- stdout
- stderr
- build output
- test output
- exit code
- execution duration

### Diff Viewer

Use a GitHub-style changed-file and line-level diff viewer.

### Repository Explorer

Show:

- Packages
- Classes
- Methods
- Symbols
- Dependencies
- References
- Test relationships

### Benchmark Dashboard (Post-MVP)

Display:

- Issues evaluated
- Issues resolved
- Resolution rate
- Compilation rate
- Regression-test pass rate
- Average iterations
- Average runtime
- Token usage
- Timeout rate
- Failure categories

### Task Progress

```text
[ANALYZING]
      ↓
[PLANNING]
      ↓
[PATCHING]
      ↓
[BUILDING]
      ↓
[TESTING]
      ↓
[REPAIRING]
      ↓
[VERIFYING]
      ↓
[AWAITING APPROVAL]
      ↓
[PR CREATED]
```

---

## 24. Multi-Agent Advanced Architecture (Post-MVP)

```text
Planner Agent
     ↓
Coder Agent
     ↓
Test Agent
     ↓
Reviewer Agent
     ↓
Security Agent
     ↓
Final Verification
```

Responsibilities:

- **Planner Agent:** determines likely files and implementation strategy.
- **Coder Agent:** proposes the patch.
- **Test Agent:** evaluates behavior and regression impact.
- **Reviewer Agent:** checks correctness, maintainability, and scope.
- **Security Agent:** checks dangerous or suspicious changes.
- **Backend:** remains the execution authority.

---

## 25. Test Generation (Post-MVP)

If an issue lacks an adequate regression test:

```text
Issue
↓
Generate regression test
↓
Confirm test exposes bug
↓
Apply fix
↓
Run regression test
↓
Run existing suite
```

Generated tests should be retained only when they are relevant, stable, and useful as verification evidence.

---

## 26. Code Quality and Security Review

The platform should evaluate:

- Complexity and maintainability
- Duplicate or unnecessary changes
- Naming and project style
- Potential injection/security vulnerabilities
- Secrets or credential exposure
- Dangerous process/network/filesystem operations
- Dependency changes
- Supply-chain implications

---

## 27. Observability

Track:

- Structured logs for every task and agent iteration
- Execution duration
- Sandbox duration
- Test duration
- Iteration count
- Success/failure/timeout counts
- Token usage where available
- Audit events for sensitive operations
- Worker retries and failures
- Sandbox policy violations

---

## 28. Benchmarking with SWE-bench Lite (Post-MVP)

Evaluate the agent using a reproducible benchmark process.

```text
Issue
↓
Agent
↓
Patch
↓
Build + Tests
↓
PASS / FAIL
↓
Benchmark Record
```

Track:

- Issues evaluated
- Issues resolved
- Resolution rate
- Compilation rate
- Regression-test pass rate
- Average iterations
- Average runtime
- Token usage
- Timeout rate
- Failure categories

> Never fabricate benchmark numbers. Only publish results generated by actual evaluation runs.

---

## 29. Recommended Project Structure

```text
codepilot/
├── backend/
│   ├── api/
│   ├── agent/
│   ├── repository/
│   ├── ast/
│   ├── graph/
│   ├── retrieval/
│   ├── sandbox/
│   ├── testing/
│   ├── git/
│   ├── github/
│   ├── benchmark/
│   ├── security/
│   ├── database/
│   └── observability/
│
├── frontend/
│   ├── dashboard/
│   ├── tasks/
│   ├── repository/
│   ├── agent/
│   ├── terminal/
│   ├── diff/
│   └── benchmark/
│
├── sandbox/
│   ├── docker/
│   └── policies/
│
├── benchmark/
│   ├── datasets/
│   ├── evaluation/
│   └── results/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── security/
│   └── evaluation/
│
└── README.md
```

---

## 30. Asynchronous Job Architecture

Long-running agent tasks should not block HTTP requests.

```text
HTTP API
   ↓
Task Queue
   ↓
Agent Worker
   ↓
Sandbox Worker
   ↓
Test Results
   ↓
Agent Worker
   ↓
Verification
```

Redis is recommended for the MVP queue/state layer.

---

## 31. CI/CD

```text
Push / Pull Request
        ↓
Compile
        ↓
Unit Tests
        ↓
Integration Tests
        ↓
Security Checks
        ↓
Docker Build
        ↓
Deploy
```

GitHub Actions should execute the project's own CI pipeline.

---

## 32. Development Roadmap

### Phase 1 — Foundation

- Spring Boot backend
- PostgreSQL
- React frontend
- GitHub OAuth
- GitHub repository integration
- Repository cloning
- Basic task model

### Phase 2 — Code Intelligence

- Java AST parser
- Symbol extraction
- Dependency graph
- Targeted code search
- Test relationship mapping

### Phase 3 — Agent

- Issue analyzer
- Planner
- Coding agent
- Patch generator
- Structured agent state

### Phase 4 — Verification

- Docker sandbox
- Test runner
- Output capture
- Failure analyzer
- Self-healing loop
- Resource limits
- Security policy enforcement

### Phase 5 — GitHub

- Branch creation
- Commit generation
- Push
- PR creation
- Human approval gate

### Phase 6 — Benchmark

- SWE-bench Lite subset
- Reproducible evaluator
- Metrics
- Benchmark dashboard

### Phase 7 — Advanced

- Multi-agent workflow
- gVisor
- Test generation
- Security review
- Advanced observability
- Additional languages/build systems

---

## 33. Universal Token-Efficient AI Software Engineering Prompt

Use the following as the base system prompt for the coding agent.

```text
# Universal Token-Efficient AI Software Engineering Prompt

You are the primary software engineering agent for this project. Your goal is to understand the existing project, correctly interpret the user's requirements, and implement the requested feature, fix, or change as a production-ready solution while minimizing unnecessary token usage, context expansion, and code changes.

## 1. Understand Before You Build

Before making changes, first understand only the parts of the project that are relevant to the request.

- Inspect the project structure and identify the relevant application, framework, language, modules, and entry points.
- Look for existing documentation, requirements, configuration, architecture notes, README files, rules/instructions, changelogs, and project-specific guidance.
- Treat project documentation and explicit user requirements as the primary source of truth.
- Do not assume a specific framework, folder structure, file name, architecture, database, API, or technology.
- Reuse the project's existing architecture, patterns, conventions, dependencies, and implementation style whenever appropriate.
- Do not scan the entire repository unless the task genuinely requires it.
- Start with the smallest relevant context and expand only when necessary.

## 2. Understand the Requirement

Before coding, determine:

- What the user actually wants.
- The functional requirements.
- The expected inputs and outputs.
- Existing behavior that must be preserved.
- Relevant UI, API, database, authentication, validation, or business logic requirements.
- Edge cases and failure scenarios that matter.
- Technical constraints already present in the project.

If the requirement is ambiguous but can be reasonably inferred from the existing project, use the project's established behavior and patterns rather than asking unnecessary questions.

If a critical requirement cannot be determined safely, ask only one concise clarification before proceeding.

## 3. Plan the Smallest Correct Change

Before modifying code:

- Identify the minimum files and components that need to change.
- Trace direct dependencies only when required.
- Prefer extending existing functionality over creating duplicate implementations.
- Prefer small, focused changes over rewrites.
- Do not change architecture, APIs, database schemas, dependencies, or unrelated behavior unless the requirement requires it.
- Preserve backward compatibility whenever possible.
- Do not introduce abstractions merely for theoretical future use.

The objective is not simply to make the code work; it is to make it work correctly within the existing project's architecture.

## 4. Implementation Rules

When implementing:

- Follow existing naming conventions, formatting, patterns, and coding style.
- Reuse existing utilities, components, services, hooks, helpers, types, and APIs when suitable.
- Avoid duplicate logic.
- Do not rewrite complete files when a targeted modification is sufficient.
- Do not modify unrelated code.
- Do not remove existing functionality unless explicitly required.
- Keep security, validation, error handling, performance, accessibility, and maintainability appropriate to the project's requirements.
- Add or update tests when the project already has a testing structure or when the change requires meaningful verification.
- Keep dependencies to a minimum and do not add a dependency when the existing project can solve the problem cleanly.

## 5. Debugging

When fixing a bug:

1. Identify the actual failure.
2. Inspect the error, stack trace, failing function, and immediate dependencies.
3. Reproduce or logically trace the problem when possible.
4. Find the root cause instead of only treating the symptom.
5. Apply the smallest safe fix.
6. Verify that the fix does not break related behavior.

Do not perform broad refactoring while debugging unless it is necessary to fix the root cause.

## 6. Verification

After implementation, verify the change using the project's existing validation methods whenever available:

- Build/type-check
- Tests
- Linting
- Relevant scripts
- API or integration checks
- Existing project-specific validation

Only run checks relevant to the change. Do not waste resources running unrelated operations.

If verification cannot be performed, clearly state what could not be verified.

## 7. Token and Context Efficiency

Treat unnecessary context and output as a measurable cost.

- Read the smallest amount of information required to make a correct decision.
- Do not repeatedly read the same files.
- Do not rediscover information that is already known from project documentation or previous context.
- Expand context only when the current information is insufficient.
- Avoid unnecessary explanations, examples, summaries, and repeated output.
- Never generate large amounts of code when a small patch is sufficient.
- Prefer targeted inspection and targeted edits.

Token efficiency must never come at the cost of correctness, security, or understanding the requirement.

## 8. Output Rules

After completing the task, return:

1. The modified code or unified diff, when applicable.
2. A concise explanation of what was changed and why.
3. Verification performed and its result.
4. Any remaining risks, assumptions, or limitations, only if applicable.

Keep the explanation concise and avoid repeating information already provided.

Do not provide a complete project summary unless explicitly requested.

## 9. General Decision Rule

For every task, follow this order:

Understand the project → Understand the requirement → Identify relevant context → Determine the smallest correct approach → Implement → Verify → Report concisely.

Always prioritize:

Correctness > Requirement compliance > Existing project consistency > Security/reliability > Maintainability > Token efficiency > Minimal output

Never sacrifice correctness or necessary project understanding merely to reduce token usage.
```

---

## 34. CodePilot Autonomous Agent Policy

This policy sits above the universal engineering prompt and defines how the autonomous agent operates.

```text
# Autonomous Software Engineering Agent

You are operating inside an automated software-engineering system.

Your task is to resolve the provided repository issue and produce a verifiable patch.

## Operating Rules

1. Inspect before modifying.
2. Use repository structure, AST/symbol information, dependency relationships, and targeted search to locate relevant code.
3. Do not assume that the issue description identifies the correct file or root cause.
4. Build a minimal implementation plan before editing.
5. Modify only files required for the fix.
6. Preserve existing APIs and behavior unless the issue requires otherwise.
7. Prefer existing project utilities and patterns.
8. Never claim success without verification.

## Agent Workflow

ANALYZE → LOCATE → PLAN → PATCH → BUILD → TEST → ANALYZE FAILURE → REPAIR → RE-TEST → VERIFY

Maximum iterations: {MAX_ITERATIONS}

## Repository Intelligence

Use available:

- AST information
- Symbol definitions
- References
- Call relationships
- Inheritance relationships
- Test relationships
- Semantic search

Prefer structurally relevant code over large amounts of unrelated repository text.

## Patch Rules

Generate the smallest safe patch.

Before applying a patch:

- Identify affected files.
- Determine the intended change.
- Check relevant dependencies.
- Check relevant tests.

After applying a patch:

- Inspect the resulting diff.
- Ensure no unrelated files were changed.
- Ensure the patch is syntactically valid.

## Sandbox Rules

All generated or modified code must be verified inside the isolated execution environment.

Never execute untrusted repository code directly on the host.

The sandbox must enforce:

- Execution timeout
- Memory limits
- CPU limits
- Restricted privileges
- Restricted filesystem access
- Restricted or disabled network access
- Automatic cleanup

## Verification Rules

A task is VERIFIED only when:

1. The patch applies successfully.
2. The project builds successfully when applicable.
3. Relevant tests pass.
4. Existing regression tests pass.
5. No newly introduced test failures remain.
6. The final diff matches the requested change.

Do not mark a task VERIFIED merely because:

- The code compiles.
- The generated patch looks correct.
- The LLM believes the solution is correct.
- One test passes.

## Failure Handling

When tests fail:

1. Read the exit code.
2. Inspect stderr/stdout.
3. Identify the failing test.
4. Inspect the stack trace.
5. Trace the failure to the relevant code.
6. Determine the root cause.
7. Generate a minimal repair.
8. Re-run the relevant tests.
9. Re-run the regression suite when appropriate.

Do not repeatedly generate unrelated patches.

## Termination

SUCCESS:
The implementation satisfies the issue and verification succeeds.

FAILURE:
The maximum number of iterations is reached, required dependencies are unavailable, the repository cannot be built, or the issue cannot be safely resolved.

TIMEOUT:
Execution exceeds the configured time limit.

## Final Result

Return structured information:

{
  "status": "VERIFIED | FAILED | TIMEOUT",
  "summary": "...",
  "files_changed": [],
  "tests_passed": 0,
  "tests_failed": 0,
  "iterations": 0,
  "build_status": "...",
  "verification": "...",
  "remaining_risks": []
}

Never fabricate test results, execution results, benchmark results, or verification status.
```

---

## 35. LLM vs Backend Responsibility

| LLM / Agent | Java Backend |
|---|---|
| Analyze issue | Authenticate and authorize |
| Plan implementation | Control task lifecycle |
| Select relevant code | Provide AST/graph/retrieval context |
| Generate patch | Validate and apply patch |
| Interpret test failures | Create and isolate sandbox |
| Suggest repair | Execute build/tests |
| Assess code quality | Enforce resource/security limits |
| Return structured decision | Persist evidence and determine actual state |

### Critical Architecture Principle

> **The LLM makes engineering decisions; the backend controls execution and verification.**

The LLM should never be the authority that declares whether a task actually succeeded.

---

## 36. Recommended First Complete Scenario

The first complete MVP should support this end-to-end flow:

```text
1. User connects/selects a public GitHub repository.
2. User selects or enters an issue.
3. System clones the repository.
4. System detects Java + Maven.
5. System indexes relevant source and tests.
6. Agent locates likely files using AST/symbol relationships.
7. Agent creates an implementation plan.
8. Agent generates a minimal patch.
9. Backend applies the patch in a temporary workspace.
10. Sandbox builds and tests the repository.
11. Agent analyzes any failures.
12. Agent performs limited repair iterations.
13. Verification engine confirms the final state.
14. UI displays diff + tests + verification evidence.
15. Human approves.
16. Backend creates branch/commit and GitHub PR.
17. Task result is stored for future evaluation.
```

---

## 37. Resume Positioning

Do not describe CodePilot as merely an AI chatbot.

Recommended project title:

**Autonomous Software Engineering Agent with Sandboxed Verification**

Example resume bullets:

```text
• Built a Spring Boot-based autonomous coding agent that analyzes GitHub issues,
  navigates repositories using AST/symbol relationships, generates minimal patches,
  and iteratively repairs failures using sandboxed regression testing.

• Implemented ephemeral Docker-based execution with resource and privilege controls
  for verifying AI-generated code without executing it directly on the host.

• Integrated Git/JGit and GitHub APIs to automate branch, commit, verification,
  and Pull Request workflows with a mandatory human approval gate.

• Designed a reproducible SWE-bench Lite evaluation pipeline to measure resolution
  rate, regression success, runtime, iteration count, and verification outcomes.
```

> Replace benchmark claims with actual measured results before publishing the project or adding numerical metrics to a resume.

---

## 38. Final Quality Checklist

- [ ] Repository is not blindly dumped into the LLM context.
- [ ] AST/symbol relationships are used for targeted navigation.
- [ ] Agent has a hard iteration limit.
- [ ] Generated code never executes directly on the host.
- [ ] Sandbox resource limits and cleanup are enforced.
- [ ] Patch scope is checked before verification.
- [ ] Build and regression results are captured as evidence.
- [ ] System distinguishes `PASS`, `FAIL`, `TIMEOUT`, and `VERIFIED`.
- [ ] LLM cannot fabricate execution status.
- [ ] GitHub PR creation requires explicit approval by default.
- [ ] Every benchmark number is based on an actual evaluation run.
- [ ] Application has unit, integration, and end-to-end tests.
- [ ] Secrets and GitHub credentials are protected.
- [ ] Important agent actions are auditable.
- [ ] README includes architecture, setup, security model, and evaluation methodology.
- [ ] MVP scope remains Java + Maven + JUnit + public GitHub + Docker.
- [ ] Post-MVP technologies are not accidentally treated as MVP requirements.

---

## 39. Final Architecture Principle

CodePilot should be designed around one central principle:

> **Autonomy must be paired with evidence.**

The agent can reason, search, plan, code, and repair, but the platform—not the model—determines whether the solution actually works.

The strongest version of the project therefore separates:

```text
LLM Reasoning
      +
Repository Intelligence
      +
Controlled Execution
      +
Automated Verification
      +
Human Approval
      =
Trustworthy Autonomous Software Engineering
```

---

## 40. MVP Definition of Done

The MVP is complete when a user can:

1. Authenticate with GitHub.
2. Select a public Java/Maven repository.
3. Select an issue.
4. Start a CodePilot task.
5. See repository indexing progress.
6. See the agent analyze and plan.
7. See a generated patch.
8. Have the patch executed inside a fresh Docker sandbox.
9. See build/test results.
10. Allow the agent to perform up to three repair iterations.
11. Receive a system-determined `VERIFIED`, `FAILED`, `TIMEOUT`, `CANCELLED`, or `SECURITY_BLOCKED` result.
12. Review the final diff and verification evidence.
13. Approve the fix.
14. Have CodePilot create the branch, commit, push, and Pull Request.
15. See the complete task history and audit trail.

This is the minimum end-to-end product that demonstrates the project's central claim: **an AI agent can autonomously modify real software, but its success is established through sandboxed execution and test evidence rather than model confidence.**
