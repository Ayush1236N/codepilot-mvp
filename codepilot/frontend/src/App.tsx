import { Routes, Route, Link, useLocation } from "react-router-dom";
import ConnectPage from "./pages/ConnectPage";
import NewTaskPage from "./pages/NewTaskPage";
import TasksListPage from "./pages/TasksListPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import { getSession } from "./lib/session";

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return <Link className={`nav-item ${active ? "nav-item-active" : ""}`} to={to}><span className="nav-icon">{icon}</span>{label}</Link>;
}

export default function App() {
  const session = getSession();
  const isWorkspace = Boolean(session);
  return <div className="app-shell">
    <header className="topbar"><Link to="/" className="brand"><span className="brand-mark"><span>✦</span></span><span>Code<span className="brand-accent">Pilot</span></span><span className="brand-chip">ENGINEERING AGENT</span></Link>{isWorkspace&&<div className="topbar-meta"><span className="system-dot"><span/> Systems nominal</span><span className="user-pill"><span className="avatar">{session?.login?.[0]?.toUpperCase()||"U"}</span>{session?.login?`@${session.login}`:"Local workspace"}</span></div>}</header>
    {isWorkspace&&<aside className="sidebar"><div className="sidebar-label">Workspace</div><nav><NavItem to="/" label="New task" icon="＋"/><NavItem to="/tasks" label="Task history" icon="◫"/></nav><div className="sidebar-card"><div className="sidebar-card-icon">⌁</div><strong>Sandbox verified</strong><span>Every patch is built and tested before it can ship.</span></div><div className="sidebar-footer">v0.1 MVP <span>•</span> Local mode</div></aside>}
    <main className={`main-content ${isWorkspace?"with-sidebar":""}`}><div className="page-frame"><Routes><Route path="/" element={session?<NewTaskPage/>:<ConnectPage/>}/><Route path="/tasks" element={<TasksListPage/>}/><Route path="/tasks/:id" element={<TaskDetailPage/>}/></Routes></div></main><footer className="app-footer">CodePilot <span>•</span> Autonomous code changes, verified before review</footer>
  </div>;
}
