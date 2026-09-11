#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanPublicRepo, scanForkWitness, formatTimeline, resolveForkRepo } from "../src/scan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ALLOWED = new Set(["scandal-a", "scandal-b", "clean", "fork-witness-a", "fork-witness-clean"]);
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;

function usage() {
  console.log(`forcepush-ghost — The force-push scandal timeline for any public repo.

Usage:
  node bin/forcepush-ghost.js --fixture scandal-a|scandal-b|clean|fork-witness-a|fork-witness-clean
  node bin/forcepush-ghost.js owner/repo
  node bin/forcepush-ghost.js owner/repo --vs forkOwner
  node bin/forcepush-ghost.js owner/repo --vs forkOwner/forkRepo
  npx forcepush-ghost …   # only after npm publish

Offline fixtures / Pages demo always work (recommended first look).
Live mode uses recent public activity + events windows (story/timeline — not a secret scanner).
Live --vs compares upstream rewrite signals against a fork's commit graph.
On live / --vs failure we refuse to invent results — use --fixture or the Pages demo instead.
Pages demo stays offline fixtures — it never runs live --vs.
`);
}

function printFixture(id) {
  if (!ALLOWED.has(id)) {
    console.error(`Unknown fixture "${id}". Use: scandal-a | scandal-b | clean | fork-witness-a | fork-witness-clean`);
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

function parseArgs(argv) {
  const out = { fixture: null, target: null, vs: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      out.help = true;
    } else if (a === "--fixture") {
      out.fixture = argv[++i] || "scandal-a";
    } else if (a === "--vs") {
      out.vs = argv[++i];
    } else if (!a.startsWith("-") && !out.target) {
      out.target = a;
    } else if (!a.startsWith("-")) {
      // ignore extras
    } else {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    }
  }
  return out;
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

const args = parseArgs(process.argv.slice(2));
if (args.help || (process.argv.slice(2).length === 0)) {
  usage();
  process.exit(0);
}

if (args.fixture != null) {
  printFixture(args.fixture);
  process.exit(0);
}

if (!args.target || !OWNER_REPO.test(args.target)) {
  console.error("Expected owner/repo or --fixture scandal-a|scandal-b|clean|fork-witness-a|fork-witness-clean");
  if (args.vs != null) {
    console.error("For live fork-witness: node bin/forcepush-ghost.js owner/repo --vs forkOwner");
  }
  process.exit(1);
}

if (args.vs !== null && args.vs !== undefined) {
  let forkRepo;
  try {
    forkRepo = resolveForkRepo(args.target, args.vs);
  } catch (err) {
    const msg = String(err?.message || err);
    console.error(msg);
    // Same-repo --vs is a usage error that would print a fake dual-rail — exit 2.
    if (/same-repo --vs/i.test(msg)) process.exit(2);
    process.exit(1);
  }
  const token = resolveGithubToken();
  try {
    const data = await scanForkWitness(args.target, forkRepo, { token });
    console.log(formatTimeline(data));
  } catch (err) {
    console.error(String(err?.message || err));
    console.error("Live --vs failed — refusing to substitute a fixture (that would be a false claim).");
    console.error("Try offline: node bin/forcepush-ghost.js --fixture fork-witness-a");
    console.error("Or open the Pages demo / demo/index.html (offline fixtures only — no live --vs).");
    console.error("Rate-limited? Set GITHUB_TOKEN / GH_TOKEN, or install `gh` and `gh auth login`.");
    process.exit(2);
  }
  process.exit(0);
}

const token = resolveGithubToken();
try {
  const data = await scanPublicRepo(args.target, { token });
  console.log(formatTimeline(data));
} catch (err) {
  console.error(String(err?.message || err));
  console.error("Live scan failed — refusing to substitute a fixture (that would be a false claim).");
  console.error("Try: node bin/forcepush-ghost.js --fixture scandal-a");
  console.error("Or open the Pages demo / demo/index.html");
  console.error("Rate-limited? Set GITHUB_TOKEN / GH_TOKEN, or install `gh` and `gh auth login`.");
  process.exit(2);
}
