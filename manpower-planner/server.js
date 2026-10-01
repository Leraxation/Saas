#!/usr/bin/env node
// Manpower Budget Planner: local server.
// Serves the planner at http://localhost:4000 and the department-head request form at /request,
// and stores the plan, employee file and requests as JSON files in ./data. No dependencies.
//
//   node server.js                         planner on this computer only
//   PLANNER_PIN=1234 HOST=0.0.0.0 node server.js
//                                          share the request form on your network, planner behind a PIN
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || (process.argv.includes("--share") ? "0.0.0.0" : "127.0.0.1");
const PIN = process.env.PLANNER_PIN || "";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BODY = 30 * 1024 * 1024;

if (HOST !== "127.0.0.1" && HOST !== "localhost" && !PIN) {
  console.warn("\n  WARNING: the planner is shared on the network without a PIN. Anyone who can reach this");
  console.warn("  computer can read salaries. Restart with PLANNER_PIN=<your pin> to protect it.\n");
}
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const file = name => path.join(DATA_DIR, name + ".json");
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch { return fallback; }
}
function writeJSON(name, value, backup) {
  const target = file(name), tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, target);
  if (backup) {
    // One copy per file per day, so a bad import can be rolled back.
    const day = new Date().toISOString().slice(0, 10);
    const copy = path.join(BACKUP_DIR, `${name}-${day}.json`);
    if (!fs.existsSync(copy)) fs.copyFileSync(target, copy);
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const SECURITY_HEADERS = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "SAMEORIGIN" };

function send(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("Upload is larger than 30 MB."), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch { reject(Object.assign(new Error("Body is not valid JSON."), { status: 400 })); } });
    req.on("error", reject);
  });
}
const pinOk = req => {
  if (!PIN) return true;
  const given = Buffer.from(String(req.headers["x-planner-pin"] || ""));
  const want = Buffer.from(PIN);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
};
const str = (v, max) => String(v ?? "").slice(0, max);
const n = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo; };
// Only known request fields are stored, with sane bounds.
function cleanRequest(b) {
  return {
    id: str(b.id, 80) || "rq-" + crypto.randomUUID(), owner: str(b.owner, 120),
    dept: str(b.dept, 80), deptName: str(b.deptName, 160), by: str(b.by, 160), title: str(b.title, 160), grade: str(b.grade, 60),
    nat: b.nat === "E" ? "E" : "O", count: Math.round(n(b.count, 1, 1000)), startM: Math.round(n(b.startM, 1, 12)),
    type: ["new", "replacement", "omanisation"].includes(b.type) ? b.type : "new",
    prio: ["critical", "high", "normal"].includes(b.prio) ? b.prio : "normal",
    basic: n(b.basic, 0, 1e6), allow: n(b.allow, 0, 1e6), why: str(b.why, 4000),
    status: ["pending", "approved", "rejected", "changes", "withdrawn"].includes(b.status) ? b.status : "pending",
    note: str(b.note, 1000), lineId: b.lineId ? str(b.lineId, 80) : null,
    createdAt: n(b.createdAt, 0, 9e15) || Date.now(), decidedAt: b.decidedAt ? n(b.decidedAt, 0, 9e15) : null, updatedAt: Date.now(),
  };
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const planner = pinOk(req);
  const needPlanner = () => { if (!planner) { send(res, 401, { error: "Planner PIN required." }); return false; } return true; };

  if (route === "health") return send(res, 200, { app: "manpower-planner", pin: !!PIN });

  if (route === "plan" || route === "roster") {
    if (!needPlanner()) return;
    if (req.method === "GET") return send(res, 200, { data: readJSON(route, null) });
    if (req.method === "PUT") { const b = await readBody(req); writeJSON(route, b.data ?? null, true); return send(res, 200, { ok: true }); }
  }

  if (route === "config") {
    if (req.method === "GET") return send(res, 200, { data: readJSON("config", null) });
    if (req.method === "PUT") { if (!needPlanner()) return; writeJSON("config", await readBody(req)); return send(res, 200, { ok: true }); }
  }

  if (route === "requests") {
    const all = readJSON("requests", []);
    if (req.method === "GET") {
      const mine = url.searchParams.get("mine");
      if (mine) return send(res, 200, { items: all.filter(r => r.owner === mine) });
      if (!needPlanner()) return;
      return send(res, 200, { items: all });
    }
    if (req.method === "POST") {
      const item = cleanRequest(await readBody(req));
      const i = all.findIndex(r => r.id === item.id);
      if (i < 0) {
        if (!item.owner) return send(res, 400, { error: "Missing requester." });
        const cfg = readJSON("config", null);
        if (cfg && cfg.open === false && !planner) return send(res, 403, { error: "Requests are closed." });
        item.status = "pending"; item.note = ""; item.lineId = null; item.decidedAt = null; item.createdAt = Date.now();
        all.push(item);
      } else {
        const prev = all[i];
        if (!planner) {
          // Requesters may edit or withdraw their own request while it is still open.
          if (prev.owner !== item.owner || !["pending", "changes"].includes(prev.status)) return send(res, 403, { error: "This request can no longer be changed." });
          if (!["pending", "withdrawn"].includes(item.status)) return send(res, 403, { error: "Only the planner can decide on requests." });
          Object.assign(item, { note: prev.note, lineId: prev.lineId, decidedAt: prev.decidedAt });
        }
        item.owner = prev.owner; item.createdAt = prev.createdAt;
        all[i] = item;
      }
      writeJSON("requests", all, true);
      return send(res, 200, { item });
    }
  }
  send(res, 404, { error: "Unknown endpoint." });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/" || p === "/request" || p === "/request/") p = "/index.html";
  const full = path.normalize(path.join(PUBLIC_DIR, p));
  if (!full.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream", "cache-control": p.endsWith(".html") ? "no-cache" : "max-age=86400", ...SECURITY_HEADERS });
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url);
    else if (req.method === "GET" || req.method === "HEAD") serveStatic(req, res, url);
    else { res.writeHead(405); res.end(); }
  } catch (e) {
    send(res, e.status || 500, { error: e.message || "Server error." });
  }
}).listen(PORT, HOST, () => {
  const lines = [`  Planner:       http://localhost:${PORT}`, `  Request form:  http://localhost:${PORT}/request`];
  if (HOST === "0.0.0.0" || HOST === "::") {
    for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
      if (a.family === "IPv4" && !a.internal) lines.push(`  On the network: http://${a.address}:${PORT}/request  (give this to department heads)`);
    }
  }
  console.log(`\nManpower Budget Planner is running.\n${lines.join("\n")}\n  Data folder:   ${DATA_DIR}\n  Planner PIN:   ${PIN ? "on" : "off"}\n\nPress Ctrl+C to stop.\n`);
});
