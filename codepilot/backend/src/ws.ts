import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { addLog } from "./db";
import { TaskLogEntry } from "./types";

const subscribers = new Map<string, Set<WebSocket>>();

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const taskId = url.searchParams.get("taskId");
    if (!taskId) {
      ws.close(1008, "taskId query param required");
      return;
    }
    if (!subscribers.has(taskId)) subscribers.set(taskId, new Set());
    subscribers.get(taskId)!.add(ws);

    ws.on("close", () => {
      subscribers.get(taskId)?.delete(ws);
    });
  });
}

export function emitLog(taskId: string, level: TaskLogEntry["level"], message: string) {
  const ts = new Date().toISOString();
  addLog({ task_id: taskId, ts, level, message });
  const payload = JSON.stringify({ type: "log", ts, level, message });
  const subs = subscribers.get(taskId);
  if (subs) {
    for (const ws of subs) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}

export function emitStatus(taskId: string, status: string) {
  const payload = JSON.stringify({ type: "status", status });
  const subs = subscribers.get(taskId);
  if (subs) {
    for (const ws of subs) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}
