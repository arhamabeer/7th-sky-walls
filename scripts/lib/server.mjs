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

/**
 * Whether the server at `base` is serving the given build.
 *
 * A substring test, because it is the one that works. This used to extract the
 * id by matching `/_next/static/<id>/_buildManifest` — a pattern this version of
 * Next never emits: the only segments under `/_next/static/` are `media` and
 * `chunks`. So the extraction returned null on every call, every comparison
 * against it was dead code, and `startProductionServer` printed "Verified server
 * is serving build X" — the id from disk, having verified nothing at all. The
 * one helper whose entire job is to refuse a stale build had not checked for one
 * in its whole existence.
 *
 * Next does put the build id in the HTML, so asking whether it is there answers
 * the only question that matters and cannot come back vacuously true.
 */
export async function servesBuild(base, buildId) {
  const html = await fetch(`${base.replace(/\/$/, "")}/`).then((r) => r.text());
  return html.includes(buildId);
}

/** As above, for a local port. */
export async function portServesBuild(port, buildId) {
  return servesBuild(`http://localhost:${port}`, buildId);
}

/**
 * Refuse to measure a server that is not the build on disk.
 *
 * Every check here reports its verdict as the absence of a finding, so pointing
 * one at the wrong server produces a confident answer about something else. Both
 * halves of that happened in one session: the analytics check passed three times
 * against a server started the previous day, because its default port was held
 * by a leftover process and nothing looked at what it was talking to; and the
 * responsive audit, handed its base URL positionally when it wanted a flag,
 * silently measured a month-old process on the default port and reported 589
 * status errors and 620 missing `h1` elements — a site catastrophe that was an
 * unread argument.
 *
 * Three near-identical copies of this assertion had grown across the scripts and
 * four other gates had none, which is the same defect this codebase keeps
 * producing: one fact written down in several places, and missing from the rest.
 *
 * `requireBuild: false` reports a mismatch instead of failing, for the checks
 * that are legitimately pointed at a dev server or a deployment.
 */
export async function assertServing(base, { requireBuild = true, label = "" } = {}) {
  const url = base.replace(/\/$/, "");
  let res;
  try {
    res = await fetch(`${url}/`);
  } catch (err) {
    console.error(
      `Nothing answered at ${url} — ${String(err).slice(0, 100)}\n` +
        `Start one with: node scripts/serve.mjs --skip-build --port ${new URL(url).port || 80}`,
    );
    process.exit(2);
  }
  if (!res.ok) {
    console.error(
      `${url}/ returned ${res.status}, so this is not serving the site.\n` +
        `Something else is on that port — check it, or pass the right base URL.`,
    );
    process.exit(2);
  }

  let expected = null;
  try {
    expected = await diskBuildId();
  } catch {
    console.log(`${label ? `${label}: ` : ""}${url} answered; nothing built on disk to compare it to.`);
    return null;
  }

  const prefix = label ? `${label}: ` : "";
  const html = await res.text();
  if (html.includes(expected)) {
    console.log(`${prefix}Serving build ${expected}.`);
    return expected;
  }

  const message = `${prefix}${url} is not serving the build on disk (${expected}).`;
  if (requireBuild) {
    console.error(`${message}\nSomething older is holding the port — restart the server.`);
    process.exit(2);
  }
  console.log(`${message} Treating it as a dev server or a deployment.`);
  return null;
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

  /**
   * Confirmed, rather than assumed. The previous version compared an id that
   * was always null against the one on disk and then announced the disk id as
   * verified — see the note on `servesBuild`.
   */
  const correct = await portServesBuild(port, expected).catch(() => null);
  if (correct !== true) {
    stop();
    throw new Error(
      correct === null
        ? `Could not read a page from :${port} to confirm which build it serves.`
        : `The server on :${port} is not serving the build on disk (${expected}).\n` +
          `Another server is answering. Refusing to test a stale build.`,
    );
  }
  if (verbose) console.log(`→ Verified server is serving build ${expected}\n`);

  return {
    url: `http://localhost:${port}`,
    buildId: expected,
    stop,
    get log() {
      return log;
    },
  };
}
