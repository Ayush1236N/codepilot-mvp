import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { githubRouter } from "./routes/github";
import { tasksRouter } from "./routes/tasks";
import { attachWebSocketServer } from "./ws";
import "./db"; // ensure schema is created on boot

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/github", githubRouter);
app.use("/api/tasks", tasksRouter);

const PORT = Number(process.env.PORT || 4000);
const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`CodePilot backend listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws?taskId=<id>`);
});
