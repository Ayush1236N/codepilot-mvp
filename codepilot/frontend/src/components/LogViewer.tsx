import { useEffect, useRef } from "react";

export interface LogLine { ts: string; level: string; message: string; }
const LEVEL_COLOR: Record<string, string> = { info: "text-slate-300", warn: "text-amber-400", error: "text-red-400", agent: "text-indigo-300", sandbox: "text-emerald-300" };

export default function LogViewer({ logs }: { logs: LogLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);
  return <div className="code-panel"><div className="code-panel-bar"><i/><i/><i/></div><div className="code-body font-mono text-[11px]">{logs.length === 0 && <div className="text-slate-600">Waiting for agent telemetry...</div>}{logs.map((l, i) => <div key={i} className="whitespace-pre-wrap leading-relaxed mb-1"><span className="text-slate-600">{new Date(l.ts).toLocaleTimeString()} </span><span className={`uppercase text-[9px] mr-1 ${LEVEL_COLOR[l.level] || "text-slate-300"}`}>[{l.level}]</span><span className={LEVEL_COLOR[l.level] || "text-slate-300"}>{l.message}</span></div>)}<div ref={bottomRef}/></div></div>;
}
