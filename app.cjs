// CommonJS wrapper for ES Modules (required by Phusion Passenger on cPanel
// shared hosting). This file is the entry point configured at the cPanel
// Node.js application Startup File.
//
// IMPORTANT — env loading:
// On this server, Phusion Passenger SetEnv directives in .htaccess do NOT
// take effect on the spawned Node process (verified empirically: process
// startup sees the OLD pre-rotation values). To make rotation possible
// without depending on the hosting layer, we manually parse `backend/.env`
// here and populate process.env BEFORE the app module is imported. After
// this, DATABASE_URL / JWT_SECRET / NODE_ENV are guaranteed to come from
// `backend/.env` regardless of what the web server set.
const fs = require("fs");
const path = require("path");
const logFile = __dirname + "/app-error.log";

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return false;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip matching surrounding quotes (env values may be quoted in .env)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  return true;
}

const envLoaded = loadEnv(path.join(__dirname, "backend", ".env"));

process.on("uncaughtException", (err) => {
  fs.appendFileSync(logFile, new Date().toISOString() + " UNCAUGHT: " + err.stack + "\n");
});
process.on("unhandledRejection", (err) => {
  fs.appendFileSync(logFile, new Date().toISOString() + " UNHANDLED: " + (err && err.stack ? err.stack : String(err)) + "\n");
});
process.on("exit", (code) => {
  fs.appendFileSync(logFile, new Date().toISOString() + " PROCESS EXIT code=" + code + "\n");
});

fs.writeFileSync(logFile, new Date().toISOString() + " Starting (envLoaded=" + envLoaded + ")\n");

import("./backend/src/index.js").then(() => {
  fs.appendFileSync(logFile, new Date().toISOString() + " Module loaded OK\n");
}).catch(err => {
  fs.appendFileSync(logFile, new Date().toISOString() + " LOAD ERROR: " + err.stack + "\n");
});
