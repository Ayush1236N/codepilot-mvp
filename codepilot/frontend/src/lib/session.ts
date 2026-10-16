// MVP simplification: credentials are held in the browser's sessionStorage
// (cleared when the tab closes) and sent per-request. See README "Security
// Model" section. A production build would use GitHub OAuth + a server-side
// encrypted credential store instead of client-supplied PATs.

export interface Session {
  githubToken: string;
  anthropicApiKey: string;
  login?: string;
}

const KEY = "codepilot.session";

export function getSession(): Session | null {
  const raw = sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(s: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
