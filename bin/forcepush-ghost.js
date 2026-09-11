#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function usage() {
  console.log(`forcepush-ghost — The force-push scandal timeline for any public repo.

Usage:
  npx forcepush-ghost owner/repo
  npx forcepush-ghost --fixture scandal-a|scandal-b|clean

Offline fixtures always work. Live GitHub scan lands in a follow-up release when API access is available.
`);
}

function printFixture(id) {
  const path = join(root, "fixtures", `${id}.json`);
  const data = JSON.parse(readFileSync(path, "utf8"));
  console.log(`\n${data.repo} (${data.branch}) — ${data.label}\n`);
  for (const ev of data.events) {
    const mark = ev.status === "wiped" ? "✕ WIPED" : "● ALIVE";
    console.log(`${mark}  ${ev.short}  ${ev.message}`);
    console.log(`         ${ev.author}  ${ev.timestamp}`);
    if (ev.note) console.log(`         ${ev.note}`);
  }
  console.log(`\n${data.disclaimer}`);
  console.log("Open demo/index.html for the visual timeline.\n");
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(0);
}

if (args[0] === "--fixture") {
  const id = args[1] || "scandal-a";
  printFixture(id);
  process.exit(0);
}

const target = args[0];
if (!/^[\w.-]+\/[\w.-]+$/.test(target)) {
  console.error("Expected owner/repo");
  process.exit(1);
}

console.log(`Live scan for ${target} is not wired in this offline V0 yet.`);
console.log("Showing Fixture A so the timeline story is still visible:\n");
printFixture("scandal-a");
