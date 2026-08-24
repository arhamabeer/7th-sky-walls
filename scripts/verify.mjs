/**
 * One-command verification loop: production build, serve it, run the
 * responsive audit across the device matrix, then tear down.
 *
 * Auditing the production build (not the dev server) matters — dev mode's
 * Fast Refresh state produces hydration warnings that do not exist in
 * production, and dev bundles differ from what users receive.
 *
 * The port is force-freed before starting, and the served build is
 * fingerprinted and compared against the one just built. Both guards exist
 * because a leftover server silently serving a stale build makes every
 * subsequent audit meaningless.
 *
 * Usage:
 *   node scripts/verify.mjs                 # build + audit everything
 *   node scripts/verify.mjs --skip-build    # reuse the existing build
 *   node scripts/verify.mjs --only mobile   # limit the viewport matrix
 *   node scripts/verify.mjs --shots         # save screenshots to .audit/
 */
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const args = process.argv.slice(2);
const PORT = Number(process.env.VERIFY_PORT) || 4010;
const ROOT = path.resolve(import.meta.dirname, "..");
const passThrough = args.filter((a) => a !== "--skip-build");

function run(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: true, cwd: ROOT }).status ?? 1;
}

function portHolders(port) {
  if (process.platform !== "win32") {
    const out = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" }).stdout || "";
    return out.split(/\s+/).filter(Boolean);
  }
  const out =
    spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`,
    ], { encoding: "utf8" }).stdout || "";
  return [...new Set(out.split(/\s+/).filter(Boolean))];
}

function killPort(port) {
  const pids = portHolders(port);
  for (const pid of pids) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", pid, "/T", "/F"], { stdio: "ignore" });
    } else {
      spawnSync("kill", ["-9", pid], { stdio: "ignore" });
    }
  }
  return pids;
}

async function waitForPort(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.connect({ port, host: "127.0.0.1" }, () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** Build id of the compiled output on disk. */
async function diskBuildId() {
  return (await readFile(path.join(ROOT, ".next", "BUILD_ID"), "utf8")).trim();
}

/** Build id the running server actually serves, read from its HTML payload. */
async function servedBuildId(port) {
  const html = await fetch(`http://localhost:${port}/`).then((r) => r.text());
  const m = html.match(/\/_next\/static\/([^/]+)\/_(?:buildManifest|ssgManifest)/);
  return m ? m[1] : null;
}

// --- 1. Free the port before anything else. ------------------------------
const stale = killPort(PORT);
if (stale.length) {
  console.log(`→ Killed stale process(es) on :${PORT}: ${stale.join(", ")}`);
  await new Promise((r) => setTimeout(r, 1200));
}

// --- 2. Build. ------------------------------------------------------------
if (!args.includes("--skip-build")) {
  console.log("→ Building production bundle...");
  const code = run("npx", ["next", "build"]);
  if (code !== 0) {
    console.error("Build failed — aborting verification.");
    process.exit(code);
  }
}
const expectedBuildId = await diskBuildId();

// --- 3. Serve. ------------------------------------------------------------
console.log(`→ Starting production server on :${PORT} (build ${expectedBuildId})...`);
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
  cwd: ROOT,
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d.toString()));
server.stderr.on("data", (d) => (serverLog += d.toString()));

let torndown = false;
const shutdown = () => {
  if (torndown) return;
  torndown = true;
  // Kill by port, not just by pid: with shell:true the tracked pid is the
  // shell, and its child can outlive a plain kill.
  killPort(PORT);
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      server.kill("SIGKILL");
    }
  } catch {
    /* already gone */
  }
};
process.on("exit", shutdown);
process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

if (!(await waitForPort(PORT))) {
  console.error("Server did not start in time. Server output:\n" + serverLog);
  shutdown();
  process.exit(1);
}

// --- 4. Prove we are auditing the build we just made. --------------------
const served = await servedBuildId(PORT).catch(() => null);
if (served && served !== expectedBuildId) {
  console.error(
    `Served build (${served}) does not match the build on disk (${expectedBuildId}).\n` +
      `Another server is answering on :${PORT}. Aborting rather than auditing a stale build.`,
  );
  shutdown();
  process.exit(1);
}
console.log(`→ Verified server is serving build ${served ?? expectedBuildId}\n`);

// --- 5. Audit. ------------------------------------------------------------
const auditCode = run("node", [
  "scripts/responsive-audit.mjs",
  "--url",
  `http://localhost:${PORT}`,
  ...passThrough,
]);

shutdown();
process.exit(auditCode);
