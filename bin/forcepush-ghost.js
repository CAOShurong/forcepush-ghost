#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanPublicRepo, formatTimeline } from "../src/scan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function usage() {
  console.log(`forcepush-ghost — The force-push scandal timeline for any public repo.

Usage:
  npx forcepush-ghost owner/repo
  npx forcepush-ghost --fixture scandal-a|scandal-b|clean

Offline fixtures always work. Live mode uses public GitHub Events (story/timeline only).
`);
}

function printFixture(id) {
  const path = join(root, "fixtures", `${id}.json`);
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
  console.error("Expected owner/repo");
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
try {
  const data = await scanPublicRepo(target, { token });
  console.log(formatTimeline(data));
} catch (err) {
  console.error(String(err?.message || err));
  console.error("Falling back to offline Fixture A so the story stays visible:\n");
  printFixture("scandal-a");
  process.exitCode = 1;
}
