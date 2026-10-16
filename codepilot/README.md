

## Portfolio presentation

CodePilot is designed to demonstrate production-minded software engineering rather than a chatbot demo. The frontend now presents the product around three engineering principles:

- **Observe** — browse repositories, select a real GitHub issue, and inspect live agent telemetry.
- **Verify** — review the generated patch alongside isolated build and test output.
- **Ship** — keep a human approval gate before branch creation, push, and pull-request opening.

### Resume-ready project summary

> Built CodePilot, an autonomous software-engineering agent that converts GitHub issues into sandbox-verified pull requests. Implemented a React/TypeScript control center with live WebSocket telemetry, diff review, task history, and approval-gated GitHub writes; built the backend orchestration pipeline with Docker isolation, patch scope validation, repair loops, and persisted audit logs.

### What to highlight in a portfolio walkthrough

1. Start from a GitHub issue and show repository/issue discovery.
2. Explain that the LLM proposes changes, but the backend owns pass/fail verification.
3. Show the live log stream and generated diff in the task detail workspace.
4. Emphasize the approval gate: no push or PR is created without an explicit human action.
5. Discuss the MVP trade-offs honestly: SQLite, PAT auth, regex indexing, and the roadmap toward OAuth, AST analysis, and Postgres/pgvector.
