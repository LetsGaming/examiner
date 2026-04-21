#!/usr/bin/env node

import { execSync } from "child_process";
import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DIR = dirname(fileURLToPath(import.meta.url));
const BASE_DIR = join(DIR, "..");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

const step = (msg) => console.log(`\n${c.bold(`▶ ${msg}`)}`);
const ok = (msg) => console.log(c.green(`✓ ${msg}`));
const die = (msg) => {
  console.error(c.red(`✗ ${msg}`));
  process.exit(1);
};

function run(cmd, opts = {}) {
  // Changed default cwd to BASE_DIR so npm finds package.json
  execSync(cmd, { stdio: "inherit", cwd: BASE_DIR, ...opts });
}

function pm2Running(name) {
  try {
    const out = execSync(`pm2 pid ${name}`, { cwd: BASE_DIR, stdio: "pipe" })
      .toString()
      .trim();
    return out !== "" && out !== "0";
  } catch {
    return false;
  }
}

function which(bin) {
  try {
    execSync(`which ${bin}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const APP_NAME = "dbd-adept-tracker";
const SERVE_SRC = join(BASE_DIR, "serve.js");
const SERVE_DST = join(BASE_DIR, "dist", "serve.cjs");

// ─── Guards ───────────────────────────────────────────────────────────────────
for (const bin of ["node", "npm", "pm2"]) {
  if (!which(bin))
    die(
      `${bin} not found${bin === "pm2" ? " — install with: npm i -g pm2" : ""}`,
    );
}

if (!existsSync(SERVE_SRC)) die(`serve.js not found at ${SERVE_SRC}`);

// ─── 1. Install ───────────────────────────────────────────────────────────────
step("Installing dependencies");

// Ensure package-lock.json exists, otherwise npm ci will always fail
if (!existsSync(join(BASE_DIR, "package-lock.json"))) {
  console.log(
    c.yellow(
      "! package-lock.json not found. Generating one via 'npm install'...",
    ),
  );
  run("npm install");
} else {
  run("npm ci --prefer-offline --fund=false --audit=false");
}
ok("Dependencies ready");

// ─── 2. Build ─────────────────────────────────────────────────────────────────
step("Building project");
run("npx vite build");
ok("Build complete → dist/");

// ─── 3. Copy server ───────────────────────────────────────────────────────────
step("Copying serve.js → dist/serve.cjs");
cpSync(SERVE_SRC, SERVE_DST);
ok("Server script in place");

// ─── 4. Start or restart via pm2 ──────────────────────────────────────────────
step("Deploying with pm2");

if (pm2Running(APP_NAME)) {
  run(`pm2 restart ${APP_NAME}`);
  ok(`Restarted existing pm2 process: ${c.bold(APP_NAME)}`);
} else {
  run(`pm2 start ${SERVE_DST} --name ${APP_NAME} --interpreter node`);
  ok(`Started new pm2 process: ${c.bold(APP_NAME)}`);
}

// ─── 5. Summary ───────────────────────────────────────────────────────────────
const divider = c.bold("─".repeat(43));
console.log(`
${divider}
${c.green(c.bold("   Build & deploy complete"))}
${divider}
  App:  ${c.bold(APP_NAME)}
  URL:  ${c.bold("http://localhost:3030")}

  ${c.bold(`pm2 logs ${APP_NAME}`)}      — live logs
  ${c.bold(`pm2 stop ${APP_NAME}`)}      — stop
  ${c.bold("pm2 save && pm2 startup")}  — persist across reboots
${divider}`);
