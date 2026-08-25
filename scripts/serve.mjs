/**
 * Serve the production build for ad-hoc checks — screenshots, Lighthouse, a
 * real browser — with the stale-server guards the audit already has.
 *
 * Hand-rolling `next start` and killing the port by hand is how a stale server
 * ends up answering: on Windows `lsof` does not exist, so the kill silently
 * does nothing and the old process keeps the port. This refuses to run rather
 * than serve a build that is not the one on disk.
 *
 * Usage:
 *   node scripts/serve.mjs             # build, then serve on :4020
 *   node scripts/serve.mjs --skip-build
 *   node scripts/serve.mjs --port 4030
 */
import { spawnSync } from "node:child_process";
import { ROOT, startProductionServer } from "./lib/server.mjs";

const args = process.argv.slice(2);
const portFlag = args.indexOf("--port");
const port = portFlag !== -1 ? Number(args[portFlag + 1]) : Number(process.env.SERVE_PORT) || 4020;

if (!args.includes("--skip-build")) {
  console.log("→ Building production bundle...");
  const { status } = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    cwd: ROOT,
  });
  if (status !== 0) process.exit(status ?? 1);
}

const server = await startProductionServer(port);
console.log(`Serving ${server.url} — press Ctrl+C to stop.`);
