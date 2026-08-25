/**
 * Shared helpers for serving the production build to a test harness.
 *
 * These live in one place because a leftover server silently answering on the
 * port makes every downstream result meaningless — and the failure is
 * convincing rather than obvious. It shows up as an unstyled page, a missing
 * feature, or a finding for a defect that was fixed twenty minutes ago.
 * Anything that needs a server should go through here.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

const isWindows = process.platform === "win32";

/** PIDs listening on a port. */
export function portHolders(port) {
  if (!isWindows) {
    const out = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" }).stdout || "";
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  }
  // `lsof` does not exist on Windows, and a plain `kill` on the shell pid
  // leaves the real server bound. Ask Windows who owns the port instead.
  const out =
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`,
      ],
      { encoding: "utf8" },
    ).stdout || "";
  return [...new Set(out.split(/\s+/).filter(Boolean))];
}

/** Force-free a port. Returns the PIDs that were killed. */
export function killPort(port) {
  const pids = portHolders(port);
  for (const pid of pids) {
    if (isWindows) {
      spawnSync("taskkill", ["/pid", pid, "/T", "/F"], { stdio: "ignore" });
    } else {
      spawnSync("kill", ["-9", pid], { stdio: "ignore" });
    }
  }
  return pids;
}

export async function waitForPort(port, timeoutMs = 90000) {
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
export async function diskBuildId() {
  return (await readFile(path.join(ROOT, ".next", "BUILD_ID"), "utf8")).trim();
}

/** Build id the running server actually serves, read from its HTML payload. */
export async function servedBuildId(port) {
  const html = await fetch(`http://localhost:${port}/`).then((r) => r.text());
  const m = html.match(/\/_next\/static\/([^/]+)\/_(?:buildManifest|ssgManifest)/);
  return m ? m[1] : null;
}

/**
 * Start `next start` on a freed port and confirm it serves the build currently
 * on disk. Returns `{ url, buildId, stop, log }`; `stop()` is idempotent and is
 * also wired to process exit.
 */
export async function startProductionServer(port, { verbose = true } = {}) {
  const stale = killPort(port);
  if (stale.length) {
    if (verbose) console.log(`→ Freed :${port} (killed ${stale.join(", ")})`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  const expected = await diskBuildId();
  if (verbose) console.log(`→ Starting production server on :${port} (build ${expected})...`);

  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    cwd: ROOT,
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d.toString()));
  child.stderr.on("data", (d) => (log += d.toString()));

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    // Kill by port, not just by pid: with shell:true the tracked pid is the
    // shell, and its child can outlive a plain kill.
    killPort(port);
    try {
      if (isWindows) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGKILL");
      }
    } catch {
      /* already gone */
    }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });

  if (!(await waitForPort(port))) {
    stop();
    throw new Error(`Server did not start on :${port} in time.\n${log}`);
  }

  const served = await servedBuildId(port).catch(() => null);
  if (served && served !== expected) {
    stop();
    throw new Error(
      `Served build (${served}) does not match the build on disk (${expected}).\n` +
        `Another server is answering on :${port}. Refusing to test a stale build.`,
    );
  }
  if (verbose) console.log(`→ Verified server is serving build ${served ?? expected}\n`);

  return {
    url: `http://localhost:${port}`,
    buildId: served ?? expected,
    stop,
    get log() {
      return log;
    },
  };
}
