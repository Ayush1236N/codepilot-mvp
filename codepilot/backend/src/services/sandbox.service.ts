import Docker from "dockerode";
import path from "path";
import fs from "fs";
import { MavenTestResult } from "../types";

const docker = new Docker(); // connects to /var/run/docker.sock by default

const MAVEN_IMAGE = process.env.MAVEN_IMAGE || "maven:3.9-eclipse-temurin-21";
const M2_CACHE_ROOT = path.join(__dirname, "..", "..", "workspace", "_m2-cache");
if (!fs.existsSync(M2_CACHE_ROOT)) fs.mkdirSync(M2_CACHE_ROOT, { recursive: true });

export interface SandboxLimits {
  memoryMb: number;
  cpuQuota: number; // fraction of a core, e.g. 1.5
  timeoutSeconds: number;
}

const DEFAULT_LIMITS: SandboxLimits = {
  memoryMb: Number(process.env.SANDBOX_MEMORY_MB || 2048),
  cpuQuota: Number(process.env.SANDBOX_CPU_QUOTA || 1.5),
  timeoutSeconds: Number(process.env.SANDBOX_TIMEOUT_SECONDS || 600),
};

async function ensureImage(onLog: (msg: string) => void) {
  const images = await docker.listImages({ filters: { reference: [MAVEN_IMAGE] } });
  if (images.length > 0) return;
  onLog(`Pulling sandbox image ${MAVEN_IMAGE} (first run only)...`);
  await new Promise<void>((resolve, reject) => {
    docker.pull(MAVEN_IMAGE, (err: any, stream: any) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err2: any) => (err2 ? reject(err2) : resolve()));
    });
  });
}

/**
 * Runs a command in an ephemeral, resource-limited container mounting the repo.
 * `networkEnabled` controls whether the container can reach the network:
 * - true: used only for the dependency-resolution phase (mvn dependency:go-offline)
 * - false: used for the actual build/test phase, so agent-authored code executes
 *   with no network access at all.
 */
async function runInContainer(
  repoDir: string,
  cmd: string[],
  limits: SandboxLimits,
  networkEnabled: boolean,
  onLog: (msg: string) => void
): Promise<{ exitCode: number; output: string; timedOut: boolean }> {
  await ensureImage(onLog);

  const container = await docker.createContainer({
    Image: MAVEN_IMAGE,
    Cmd: ["bash", "-lc", cmd.join(" ")],
    WorkingDir: "/workspace",
    User: "1000:1000",
    HostConfig: {
      Binds: [`${repoDir}:/workspace`, `${M2_CACHE_ROOT}:/home/maven/.m2`],
      Memory: limits.memoryMb * 1024 * 1024,
      MemorySwap: limits.memoryMb * 1024 * 1024, // disable swap growth beyond memory limit
      NanoCpus: Math.round(limits.cpuQuota * 1e9),
      NetworkMode: networkEnabled ? "bridge" : "none",
      Privileged: false,
      ReadonlyRootfs: false, // maven needs to write to /tmp and .m2; repo mount is the only writable app dir
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      PidsLimit: 512,
      AutoRemove: false,
    },
    Tty: false,
    AttachStdout: true,
    AttachStderr: true,
  });

  let output = "";
  let timedOut = false;

  const stream = await container.attach({ stream: true, stdout: true, stderr: true });
  container.modem.demuxStream(
    stream,
    { write: (chunk: Buffer) => { output += chunk.toString("utf-8"); onLog(chunk.toString("utf-8").trimEnd()); } } as any,
    { write: (chunk: Buffer) => { output += chunk.toString("utf-8"); onLog(chunk.toString("utf-8").trimEnd()); } } as any
  );

  await container.start();

  const timer = setTimeout(async () => {
    timedOut = true;
    try {
      await container.stop({ t: 5 });
    } catch {
      /* already stopped */
    }
  }, limits.timeoutSeconds * 1000);

  let exitCode = 1;
  try {
    const result = await container.wait();
    exitCode = result.StatusCode ?? 1;
  } finally {
    clearTimeout(timer);
    try {
      await container.remove({ force: true });
    } catch {
      /* ignore cleanup races */
    }
  }

  return { exitCode, output, timedOut };
}

export async function resolveDependencies(repoDir: string, limits: SandboxLimits, onLog: (msg: string) => void) {
  return runInContainer(
    repoDir,
    ["mvn", "-B", "-q", "dependency:go-offline", "-Dmaven.repo.local=/home/maven/.m2/repository"],
    limits,
    true, // network required to actually download dependencies
    onLog
  );
}

export async function buildAndTest(
  repoDir: string,
  limits: SandboxLimits,
  onLog: (msg: string) => void
): Promise<MavenTestResult> {
  const { exitCode, output, timedOut } = await runInContainer(
    repoDir,
    ["mvn", "-B", "-o", "-Dmaven.repo.local=/home/maven/.m2/repository", "test"],
    limits,
    false, // no network during actual build/test of agent-authored code
    onLog
  );

  return parseMavenOutput(output, exitCode, timedOut);
}

const SUREFIRE_SUMMARY_RE = /Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/g;
const FAILED_TEST_RE = /^(?:Tests in error|Failed tests):\s*$/m;
const TEST_CASE_FAIL_RE = /^\s*([\w.$]+(?:\([\w.$]+\))?)\s*(?:Time elapsed.*)?(?:<<< (?:FAILURE|ERROR)!)/gm;

function parseMavenOutput(output: string, exitCode: number, timedOut: boolean): MavenTestResult {
  let testsRun = 0,
    failures = 0,
    errors = 0;

  const matches = [...output.matchAll(SUREFIRE_SUMMARY_RE)];
  if (matches.length > 0) {
    // Maven prints a running summary per module plus a final total; take the last (aggregate) line.
    const last = matches[matches.length - 1];
    testsRun = Number(last[1]);
    failures = Number(last[2]);
    errors = Number(last[3]);
  }

  const failingTests: { name: string; trace: string }[] = [];
  for (const m of output.matchAll(TEST_CASE_FAIL_RE)) {
    const name = m[1];
    const startIdx = m.index || 0;
    const trace = output.slice(startIdx, startIdx + 1500);
    failingTests.push({ name, trace });
  }

  let buildStatus: MavenTestResult["buildStatus"] = "ERROR";
  if (timedOut) buildStatus = "ERROR";
  else if (exitCode === 0 && failures === 0 && errors === 0) buildStatus = "SUCCESS";
  else if (/BUILD FAILURE/.test(output)) buildStatus = "FAILURE";
  else buildStatus = "ERROR";

  return {
    buildStatus,
    testsRun,
    testsPassed: Math.max(0, testsRun - failures - errors),
    testsFailed: failures,
    testsErrored: errors,
    failingTests,
    rawOutput: output,
    exitCode,
    timedOut,
  };
}

export { DEFAULT_LIMITS };
