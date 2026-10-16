const COLORS: Record<string, string> = {
  CREATED: "status-slate", CLONING: "status-blue", INDEXING: "status-blue", PLANNING: "status-indigo", PATCHING: "status-indigo",
  RESOLVING_DEPENDENCIES: "status-amber", BUILDING: "status-amber", TESTING: "status-amber", ANALYZING_FAILURE: "status-orange", REPAIRING: "status-orange",
  AWAITING_APPROVAL: "status-purple", APPROVED: "status-purple", CREATING_PR: "status-purple", VERIFIED: "status-green", FAILED: "status-red", TIMEOUT: "status-red", REJECTED: "status-slate", SECURITY_BLOCKED: "status-red", CANCELLED: "status-slate",
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${COLORS[status] || "status-slate"}`}>{status.replace(/_/g, " ")}</span>;
}
