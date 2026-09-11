#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanPublicRepo, formatTimeline } from "../src/scan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ALLOWED = new Set(["scandal-a", "scandal-b", "clean"]);

function usage() {
  console.log(`forcepush-ghost — The force-push scandal timeline for any public repo.

Usage:
  npx forcepush-ghost --fixture scandal-a|scandal-b|clean
  npx forcepush-ghost owner/repo

Offline fixtures always work (recommended first look).
Live mode uses recent public GitHub Events only (story/timeline — not a secret scanner).
On live failure we refuse to invent results — use --fixture instead.
`);
}

function printFixture(id) {
  if (!ALLOWED.has(id)) {
    console.error(`Unknown fixture "${id}". Use: scandal-a | scandal-b | clean`);
    process.exit(1);
  }
  const path = join(root, "fixtures", `${id}.json`);
  if (!existsSync(path)) {
    console.error(`Missing fixture file: ${path}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  console.log(formatTimeline(data));
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(0);
}

if (args[0] === "--fixture") {
  printFixture(args[1] || "scandal-a");
  process.exit(0);
}

const target = args[0];
if (!/^[\w.-]+\/[\w.-]+$/.test(target)) {
  console.error("Expected owner/repo or --fixture scandal-a|scandal-b|clean");
  process.exit(1);
}

function resolveGithubToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    const r = spawnSync("gh", ["auth", "token"], {
      encoding: "utf8",
      timeout: 3000,
      env: process.env,
    });
    if (r.status === 0) {
      const t = (r.stdout || "").trim();
      if (t) return t;
    }
  } catch {
    // gh CLI optional
  }
  return undefined;
}

const token = resolveGithubToken();
try {
  const data = await scanPublicRepo(target, { token });
  console.log(formatTimeline(data));
} catch (err) {
  console.error(String(err?.message || err));
  console.error("Live scan failed — refusing to substitute a fixture (that would be a false claim).");
  console.error("Try: node bin/forcepush-ghost.js --fixture scandal-a");
  console.error("Or open the Pages demo / demo/index.html");
  console.error("Rate-limited? Set GITHUB_TOKEN / GH_TOKEN, or install `gh` and `gh auth login`.");
  process.exit(2);
}
