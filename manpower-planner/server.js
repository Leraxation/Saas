#!/usr/bin/env node
// Manpower Budget Planner: secure local server.
//
// Serves the planner at http(s)://<host>:4000 and the department-head request form at /request.
// Security controls (see SECURITY.md): named accounts with roles, scrypt password hashing, account
// lockout and rate limiting, HttpOnly/SameSite session cookies with idle and absolute timeouts,
// CSRF protection, AES-256-GCM encryption of all data at rest, a hash-chained audit log, strict
// security headers (CSP, HSTS, framing), TLS required for network access, encrypted daily backups
// with retention. No third-party dependencies.
//
//   node server.js                        this computer only (http://localhost:4000)
//   node server.js --share                share on the network (needs TLS, see README)
//   node server.js reset-password <user>  console recovery: issue a temporary password
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

/* ---------- Configuration ---------- */
const env = process.env, ARGS = process.argv.slice(2);
const exists = p => { try { fs.accessSync(p); return true; } catch { return false; } };
const CERT_DIR = path.join(__dirname, "certs");
const CFG = {
  port: Number(env.PORT) || 4000,
  host: env.HOST || (ARGS.includes("--share") ? "0.0.0.0" : "127.0.0.1"),
  dataDir: path.resolve(env.DATA_DIR || path.join(__dirname, "data")),
  keyFile: path.resolve(env.DATA_KEY_FILE || path.join(os.homedir(), ".manpower-planner", "data.key")),
  tlsCert: env.TLS_CERT || (exists(path.join(CERT_DIR, "server.crt")) ? path.join(CERT_DIR, "server.crt") : ""),
  tlsKey: env.TLS_KEY || (exists(path.join(CERT_DIR, "server.key")) ? path.join(CERT_DIR, "server.key") : ""),
  tlsPfx: env.TLS_PFX || (exists(path.join(CERT_DIR, "server.pfx")) ? path.join(CERT_DIR, "server.pfx") : ""),
  tlsPfxPass: env.TLS_PFX_PASSPHRASE || "",
  allowHttp: env.ALLOW_HTTP === "1",
  trustProxy: env.TRUST_PROXY === "1",
  idleMs: (Number(env.SESSION_IDLE_MINUTES) || 30) * 60e3,
  maxMs: (Number(env.SESSION_MAX_HOURS) || 10) * 3600e3,
  backupDays: Number(env.BACKUP_RETENTION_DAYS) || 30,
  lockoutAttempts: 5,
  lockoutMs: 15 * 60e3,
};
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
const networkMode = !LOOPBACK.has(CFG.host);
const useTLS = !!((CFG.tlsCert && CFG.tlsKey) || CFG.tlsPfx);
const PUBLIC_DIR = path.join(__dirname, "public");
const BACKUP_DIR = path.join(CFG.dataDir, "backups");
const AUDIT_FILE = path.join(CFG.dataDir, "audit.log");
const ROLES = ["admin", "planner", "viewer", "requester"];
const PLANNERS = ["admin", "planner"];
const READERS = ["admin", "planner", "viewer"];

function fail(msg){ console.error("\n  " + msg.split("\n").join("\n  ") + "\n"); process.exit(1); }

/* ---------- Encryption at rest (AES-256-GCM) ---------- */
fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
try { fs.chmodSync(CFG.dataDir, 0o700); fs.chmodSync(BACKUP_DIR, 0o700); } catch {}
const dataFile = name => path.join(CFG.dataDir, name + ".json");
const STORES = ["plan", "roster", "requests", "config", "users"];

function loadKey(){
  if (env.DATA_KEY){
    const k = Buffer.from(env.DATA_KEY, "base64");
    if (k.length !== 32) fail("DATA_KEY must be 32 random bytes, base64-encoded.");
    return k;
  }
  if (exists(CFG.keyFile)){
    const k = Buffer.from(fs.readFileSync(CFG.keyFile, "utf8").trim(), "base64");
    if (k.length !== 32) fail(`The encryption key file ${CFG.keyFile} is damaged.`);
    return k;
  }
  if (exists(path.join(CFG.dataDir, "keycheck.json")))
    fail(`Encrypted data exists in ${CFG.dataDir} but its key is missing.\nRestore the key file to ${CFG.keyFile} (or set DATA_KEY). Without it the data cannot be read.`);
  fs.mkdirSync(path.dirname(CFG.keyFile), { recursive: true, mode: 0o700 });
  const k = crypto.randomBytes(32);
  fs.writeFileSync(CFG.keyFile, k.toString("base64") + "\n", { mode: 0o600, flag: "wx" });
  console.log(`\n  Created a new encryption key: ${CFG.keyFile}\n  Back this file up somewhere safe and separate from the data folder. Without it the data cannot be read.`);
  return k;
}
const KEY = loadKey();
function seal(name, value){
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  c.setAAD(Buffer.from("mp:" + name));
  const ct = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return JSON.stringify({ mp: 1, alg: "AES-256-GCM", iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") });
}
function unseal(name, text){
  const o = JSON.parse(text);
  if (!o || o.mp !== 1) return { legacy: true, value: o };
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(o.iv, "base64"));
  d.setAAD(Buffer.from("mp:" + name)); d.setAuthTag(Buffer.from(o.tag, "base64"));
  return { value: JSON.parse(Buffer.concat([d.update(Buffer.from(o.ct, "base64")), d.final()]).toString("utf8")) };
}
// Key check: refuses to start with the wrong key instead of failing on first read.
(function keyCheck(){
  const f = path.join(CFG.dataDir, "keycheck.json");
  if (exists(f)){
    try { if (unseal("keycheck", fs.readFileSync(f, "utf8")).value !== "manpower-planner") throw 0; }
    catch { fail(`The encryption key at ${CFG.keyFile} does not match the data in ${CFG.dataDir}.`); }
  } else fs.writeFileSync(f, seal("keycheck", "manpower-planner"), { mode: 0o600 });
})();

const cache = new Map();
function load(name, fallback){
  if (cache.has(name)) return cache.get(name);
  let v = fallback;
  if (exists(dataFile(name))){
    const r = unseal(name, fs.readFileSync(dataFile(name), "utf8"));
    v = r.value;
    if (r.legacy){ save(name, v, false); console.log(`  Encrypted existing ${name}.json`); }
  }
  cache.set(name, v);
  return v;
}
function save(name, value, backup = true){
  const f = dataFile(name), tmp = f + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmp, seal(name, value), { mode: 0o600 });
  fs.renameSync(tmp, f);
  cache.set(name, value);
  if (backup){
    const copy = path.join(BACKUP_DIR, `${name}-${new Date().toISOString().slice(0, 10)}.json`);
    if (!exists(copy)) fs.copyFileSync(f, copy);
  }
}
function pruneBackups(){
  const cutoff = Date.now() - CFG.backupDays * 864e5;
  for (const n of fs.readdirSync(BACKUP_DIR)){
    const p = path.join(BACKUP_DIR, n);
    try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
  }
}
// Encrypt any plaintext files left by earlier versions.
for (const s of STORES) if (exists(dataFile(s))) load(s, null);
for (const n of fs.readdirSync(BACKUP_DIR)){
  const m = n.match(/^(plan|roster|requests|config|users)-.*\.json$/); if (!m) continue;
  const p = path.join(BACKUP_DIR, n);
  try { const r = unseal(m[1], fs.readFileSync(p, "utf8")); if (r.legacy) fs.writeFileSync(p, seal(m[1], r.value), { mode: 0o600 }); } catch {}
}
pruneBackups();

/* ---------- Hash-chained audit log ---------- */
const GENESIS = "0".repeat(64);
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
let lastHash = GENESIS;
if (exists(AUDIT_FILE)){
  const lines = fs.readFileSync(AUDIT_FILE, "utf8").trim().split("\n").filter(Boolean);
  if (lines.length) try { lastHash = JSON.parse(lines[lines.length - 1]).hash; } catch {}
}
function audit(req, actor, event, detail = {}){
  const entry = { ts: new Date().toISOString(), actor: actor || "-", ip: req ? clientIp(req) : "console", event, detail };
  const hash = sha256(lastHash + JSON.stringify(entry));
  fs.appendFileSync(AUDIT_FILE, JSON.stringify({ ...entry, prev: lastHash, hash }) + "\n", { mode: 0o600 });
  lastHash = hash;
}
function readAudit(){
  if (!exists(AUDIT_FILE)) return { entries: [], ok: true, brokenAt: null };
  const lines = fs.readFileSync(AUDIT_FILE, "utf8").trim().split("\n").filter(Boolean);
  let prev = GENESIS, brokenAt = null; const entries = [];
  lines.forEach((l, i) => {
    let e; try { e = JSON.parse(l); } catch { if (brokenAt === null) brokenAt = i + 1; return; }
    const { ts, actor, ip, event, detail } = e;
    if (brokenAt === null && (e.prev !== prev || sha256(prev + JSON.stringify({ ts, actor, ip, event, detail })) !== e.hash)) brokenAt = i + 1;
    prev = e.hash; entries.push(e);
  });
  return { entries, ok: brokenAt === null, brokenAt };
}

/* ---------- Users & passwords ---------- */
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const COMMON_WORDS = ["password", "passw0rd", "qwerty", "asdf", "admin", "welcome", "letmein", "changeme", "omanair", "oman", "muscat", "planner", "manpower", "budget", "abc", "secret", "login"];
const COMMON = new Set(["password", "password1", "password123", "123456789012", "qwertyuiop", "welcome123", "omanair", "muscat", "admin", "letmein", "changeme", "p@ssw0rd"]);
async function hashPassword(pw){
  const salt = crypto.randomBytes(16);
  const h = await scrypt(String(pw).normalize("NFKC"), salt, 64, SCRYPT);
  return { alg: "scrypt", salt: salt.toString("base64"), hash: h.toString("base64") };
}
async function verifyPassword(rec, pw){
  const h = await scrypt(String(pw).normalize("NFKC"), Buffer.from(rec.salt, "base64"), 64, SCRYPT);
  const want = Buffer.from(rec.hash, "base64");
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
let DUMMY = null; hashPassword(crypto.randomBytes(12).toString("hex")).then(r => { DUMMY = r; });
function passwordProblem(pw, user){
  pw = String(pw || "");
  if (pw.length < 12) return "Use at least 12 characters. A short phrase of several words works well.";
  if (pw.length > 200) return "Use at most 200 characters.";
  const low = pw.toLowerCase();
  // Strip common words, digits and symbols: what is left must still be a real secret.
  let rest = low; for (const w of COMMON_WORDS) rest = rest.split(w).join("");
  if (COMMON.has(low) || /^(.)\1+$/.test(pw) || rest.replace(/[^a-z\u0600-\u06ff]/g, "").length < 4) return "That password is too common or predictable. Choose another.";
  if (user && (low.includes(user.username) || (user.name && user.name.length > 3 && low.includes(user.name.toLowerCase())))) return "Do not include your username or name in the password.";
  return null;
}
function tempPassword(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = ""; for (let i = 0; i < 16; i++) s += A[crypto.randomInt(A.length)];
  return s.replace(/(.{4})(?=.)/g, "$1-");
}
const users = () => load("users", { users: [] }).users;
const findUser = u => users().find(x => x.username === String(u || "").toLowerCase());
const saveUsers = () => save("users", { users: users() });
const publicUser = u => ({ username: u.username, name: u.name, role: u.role, depts: u.depts || [], disabled: !!u.disabled, mustChange: !!u.mustChange,
  lockedUntil: u.lockedUntil && u.lockedUntil > Date.now() ? u.lockedUntil : null, lastLogin: u.lastLogin || null, createdAt: u.createdAt, createdBy: u.createdBy || null,
  sessions: [...sessions.values()].filter(s => s.user === u.username).length });
const USERNAME_RX = /^[a-z0-9][a-z0-9._-]{2,39}$/;

/* ---------- Sessions, cookies, CSRF ---------- */
const sessions = new Map(); // sha256(token) -> session
const isSecure = req => useTLS || (CFG.trustProxy && String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https");
const cookieName = req => isSecure(req) ? "__Host-mp_sid" : "mp_sid";
function clientIp(req){
  if (CFG.trustProxy && req.headers["x-forwarded-for"]) return String(req.headers["x-forwarded-for"]).split(",")[0].trim().slice(0, 64);
  return (req.socket && req.socket.remoteAddress) || "?";
}
function parseCookies(req){
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")){ const i = part.indexOf("="); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}
function startSession(req, res, user){
  const token = crypto.randomBytes(32).toString("base64url");
  const s = { user: user.username, csrf: crypto.randomBytes(24).toString("base64url"), created: Date.now(), seen: Date.now(), ip: clientIp(req) };
  sessions.set(sha256(token), s);
  res.setHeader("set-cookie", `${cookieName(req)}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(CFG.maxMs / 1000)}${isSecure(req) ? "; Secure" : ""}`);
  return s;
}
function endSession(req, res){
  const t = parseCookies(req)[cookieName(req)]; if (t) sessions.delete(sha256(t));
  res.setHeader("set-cookie", `${cookieName(req)}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure(req) ? "; Secure" : ""}`);
}
function getSession(req){
  const t = parseCookies(req)[cookieName(req)]; if (!t) return null;
  const key = sha256(t), s = sessions.get(key); if (!s) return null;
  const now = Date.now();
  if (now - s.seen > CFG.idleMs || now - s.created > CFG.maxMs){ sessions.delete(key); return null; }
  const u = findUser(s.user);
  if (!u || u.disabled){ sessions.delete(key); return null; }
  s.seen = now;
  return { s, key, u };
}
function revokeSessions(username, exceptKey){ for (const [k, s] of sessions) if (s.user === username && k !== exceptKey) sessions.delete(k); }
setInterval(() => { const now = Date.now(); for (const [k, s] of sessions) if (now - s.seen > CFG.idleMs || now - s.created > CFG.maxMs) sessions.delete(k); }, 60e3).unref();

/* ---------- Rate limiting ---------- */
const buckets = new Map();
function limited(key, max, windowMs){
  const now = Date.now(); let b = buckets.get(key);
  if (!b || now > b.reset){ b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  return ++b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 60e3).unref();

/* ---------- HTTP helpers ---------- */
const PAGE_SRC = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8")
  .split("\n").filter(l => !/fonts\.(googleapis|gstatic)\.com/.test(l)).join("\n"); // no third-party requests
const SCRIPT_HASHES = [...PAGE_SRC.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`);
const CSP = ["default-src 'none'", `script-src 'self' ${SCRIPT_HASHES.join(" ")}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
  "connect-src 'self'", "worker-src 'self' blob:", "form-action 'self'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'"].join("; ");
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"], "/request": ["index.html", "text/html; charset=utf-8"], "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/xlsx.full.min.js": ["xlsx.full.min.js", "text/javascript; charset=utf-8"], "/LICENSE-xlsx.txt": ["LICENSE-xlsx.txt", "text/plain; charset=utf-8"],
};
const STATIC_BODY = Object.fromEntries(Object.values(STATIC).map(([f]) => [f, f === "index.html" ? Buffer.from(PAGE_SRC) : fs.readFileSync(path.join(PUBLIC_DIR, f))]));
function baseHeaders(req){
  const h = { "content-security-policy": CSP, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()", "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin", "x-permitted-cross-domain-policies": "none" };
  if (isSecure(req)) h["strict-transport-security"] = "max-age=31536000";
  return h;
}
function send(req, res, code, obj){
  res.writeHead(code, { ...baseHeaders(req), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
}
class HttpError extends Error { constructor(status, msg, code){ super(msg); this.status = status; this.code = code; } }
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function readBody(req, limit){
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) return Promise.reject(new HttpError(415, "Send JSON."));
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit){ reject(new HttpError(413, `That upload is larger than ${Math.round(limit / 1048576)} MB.`)); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8"), (k, v) => BAD_KEYS.has(k) ? undefined : v) : {}); } catch { reject(new HttpError(400, "Body is not valid JSON.")); } });
    req.on("error", reject);
  });
}
function originOk(req){
  const o = req.headers.origin;
  if (!o) return !req.headers["sec-fetch-site"] || ["same-origin", "none"].includes(req.headers["sec-fetch-site"]);
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}
const str = (v, max) => String(v ?? "").slice(0, max);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo; };

/* ---------- Domain validation ---------- */
function checkPlan(d){
  if (!d || typeof d !== "object" || !Array.isArray(d.depts) || !Array.isArray(d.lines)) throw new HttpError(400, "That is not a valid plan.");
  if (d.depts.length > 500 || d.lines.length > 20000 || (d.scen && d.scen.length > 100)) throw new HttpError(400, "The plan is larger than allowed.");
  return d;
}
function checkRoster(d){
  if (d === null) return null;
  if (!d || typeof d !== "object" || !Array.isArray(d.emps)) throw new HttpError(400, "That is not a valid employee file.");
  if (d.emps.length > 100000) throw new HttpError(400, "The employee file has more than 100,000 rows.");
  return d;
}
function cleanRequest(b){
  return {
    id: str(b.id, 80).replace(/[^\w.-]/g, "") || "rq-" + crypto.randomUUID(),
    dept: str(b.dept, 80), deptName: str(b.deptName, 160), by: str(b.by, 160), title: str(b.title, 160), grade: str(b.grade, 60),
    nat: b.nat === "E" ? "E" : "O", count: Math.round(num(b.count, 1, 1000)), startM: Math.round(num(b.startM, 1, 12)),
    type: ["new", "replacement", "omanisation"].includes(b.type) ? b.type : "new",
    prio: ["critical", "high", "normal"].includes(b.prio) ? b.prio : "normal",
    basic: num(b.basic, 0, 1e6), allow: num(b.allow, 0, 1e6), why: str(b.why, 4000),
    status: ["pending", "approved", "rejected", "changes", "withdrawn"].includes(b.status) ? b.status : "pending",
    note: str(b.note, 1000), lineId: b.lineId ? str(b.lineId, 80) : null,
  };
}
const versioned = name => load(name, { version: 0, data: null });

/* ---------- API ---------- */
const CLIENT_EVENTS = new Set(["export_xlsx", "export_csv", "export_json", "copy_summary", "template_download"]);
async function api(req, res, url){
  const ip = clientIp(req), route = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, ""), method = req.method;
  if (limited("api:" + ip, 900, 5 * 60e3)) throw new HttpError(429, "Too many requests. Wait a few minutes.");
  const mutating = method !== "GET" && method !== "HEAD";
  if (mutating && !originOk(req)) throw new HttpError(403, "Cross-site request refused.");

  if (route === "health" && method === "GET") return send(req, res, 200, { app: "manpower-planner", auth: true });

  // Session bootstrap (no session yet)
  if (route === "session" && method === "GET"){
    const a = getSession(req);
    if (!a) return send(req, res, 401, { error: "Sign in.", setup: users().length === 0, setupAllowed: users().length === 0 && LOOPBACK.has(req.socket.remoteAddress) && !req.headers["x-forwarded-for"] });
    return send(req, res, 200, { user: { ...publicUser(a.u) }, csrf: a.s.csrf, idleMinutes: CFG.idleMs / 60e3, secure: isSecure(req) });
  }
  if (route === "setup" && method === "POST"){
    if (users().length) throw new HttpError(409, "The administrator account already exists.");
    if (!LOOPBACK.has(req.socket.remoteAddress) || req.headers["x-forwarded-for"]) throw new HttpError(403, "Create the first administrator on the server computer itself (http://localhost).");
    const b = await readBody(req, 64e3);
    const username = str(b.username, 40).toLowerCase().trim(), name = str(b.name, 120).trim();
    if (!USERNAME_RX.test(username)) throw new HttpError(400, "Usernames are 3 to 40 letters, digits, dots, dashes or underscores.");
    const problem = passwordProblem(b.password, { username, name }); if (problem) throw new HttpError(400, problem);
    const u = { username, name: name || username, role: "admin", depts: [], ...(await hashPassword(b.password)), createdAt: Date.now(), createdBy: "setup", pwdChangedAt: Date.now(), failed: 0 };
    users().push(u); saveUsers();
    audit(req, username, "setup_admin_created"); audit(req, username, "login_success");
    u.lastLogin = Date.now(); saveUsers();
    const s = startSession(req, res, u);
    return send(req, res, 200, { user: publicUser(u), csrf: s.csrf });
  }
  if (route === "login" && method === "POST"){
    if (limited("login:" + ip, 20, 15 * 60e3)) throw new HttpError(429, "Too many sign-in attempts from this computer. Wait 15 minutes.");
    const b = await readBody(req, 16e3), u = findUser(b.username), now = Date.now();
    if (u && u.lockedUntil && u.lockedUntil > now){ audit(req, u.username, "login_blocked_locked"); throw new HttpError(423, "This account is locked after too many failed attempts. Try again in 15 minutes or ask an administrator to unlock it."); }
    const ok = u && !u.disabled ? await verifyPassword(u, b.password || "") : (DUMMY && await verifyPassword(DUMMY, String(b.password || "x")), false);
    if (!ok){
      if (u && !u.disabled){
        u.failed = (u.failed || 0) + 1;
        if (u.failed >= CFG.lockoutAttempts){ u.lockedUntil = now + CFG.lockoutMs; u.failed = 0; audit(req, u.username, "account_locked"); }
        saveUsers();
      }
      audit(req, str(b.username, 40).toLowerCase() || "-", "login_failed");
      throw new HttpError(401, "Wrong username or password.");
    }
    u.failed = 0; u.lockedUntil = null; u.lastLogin = now; saveUsers();
    audit(req, u.username, "login_success");
    const s = startSession(req, res, u);
    return send(req, res, 200, { user: publicUser(u), csrf: s.csrf });
  }

  // Everything below needs a session and a CSRF token for changes
  const a = getSession(req);
  if (!a) throw new HttpError(401, "Your session has ended. Sign in again.", "auth");
  const { u, s } = a;
  if (mutating && req.headers["x-csrf-token"] !== s.csrf) throw new HttpError(403, "Security token missing. Reload the page.");
  const need = roles => { if (!roles.includes(u.role)) throw new HttpError(403, "Your role does not allow this."); };

  if (route === "logout" && method === "POST"){ audit(req, u.username, "logout"); endSession(req, res); return send(req, res, 200, { ok: true }); }
  if (route === "password" && method === "POST"){
    const b = await readBody(req, 16e3);
    if (!(await verifyPassword(u, b.current || ""))){ audit(req, u.username, "password_change_failed"); throw new HttpError(400, "Your current password is not correct."); }
    const problem = passwordProblem(b.next, u); if (problem) throw new HttpError(400, problem);
    if (await verifyPassword(u, b.next)) throw new HttpError(400, "Choose a password different from the current one.");
    Object.assign(u, await hashPassword(b.next), { mustChange: false, pwdChangedAt: Date.now() }); saveUsers();
    revokeSessions(u.username, a.key);
    audit(req, u.username, "password_changed");
    return send(req, res, 200, { user: publicUser(u) });
  }
  if (u.mustChange) throw new HttpError(403, "Change your temporary password first.", "must_change");

  if (route === "audit" && method === "POST"){
    const b = await readBody(req, 8e3);
    if (!CLIENT_EVENTS.has(b.event)) throw new HttpError(400, "Unknown event.");
    audit(req, u.username, b.event, { file: str(b.file, 120) });
    return send(req, res, 200, { ok: true });
  }
  if (route === "audit" && method === "GET"){
    need(["admin"]);
    const r = readAudit(), limit = Math.round(num(url.searchParams.get("limit") || 300, 1, 5000));
    return send(req, res, 200, { ok: r.ok, brokenAt: r.brokenAt, total: r.entries.length, entries: r.entries.slice(-limit).reverse().map(({ prev, hash, ...e }) => e) });
  }

  if (route === "plan" || route === "roster"){
    if (method === "GET"){ need(READERS); const v = versioned(route); return send(req, res, 200, { data: v.data, version: v.version, savedAt: v.savedAt || null, savedBy: v.savedBy || null }); }
    if (method === "PUT"){
      need(PLANNERS);
      const b = await readBody(req, route === "roster" ? 60 * 1048576 : 8 * 1048576), cur = versioned(route);
      if (Number(b.baseVersion) !== cur.version) return send(req, res, 409, { error: `Someone else saved the ${route === "plan" ? "plan" : "employee file"} since you opened it (${cur.savedBy || "another user"}). Reload to see their changes.`, version: cur.version, savedBy: cur.savedBy });
      const data = route === "plan" ? checkPlan(b.data) : checkRoster(b.data);
      const next = { version: cur.version + 1, savedAt: Date.now(), savedBy: u.username, data };
      save(route, next);
      const detail = route === "plan" ? { version: next.version, lines: data.lines.length, depts: data.depts.length } : { version: next.version, employees: data ? data.emps.length : 0, file: data ? str(data.fileName, 120) : null };
      if (route === "roster" || cur.version === 0 || (Date.now() - (cur.savedAt || 0)) > 10 * 60e3 || cur.savedBy !== u.username) audit(req, u.username, route + "_saved", detail);
      return send(req, res, 200, { version: next.version });
    }
  }

  if (route === "config"){
    if (method === "GET"){
      const c = load("config", null);
      if (c && u.role === "requester" && (u.depts || []).length) return send(req, res, 200, { data: { ...c, depts: c.depts.filter(d => u.depts.includes(d.id)) } });
      return send(req, res, 200, { data: c });
    }
    if (method === "PUT"){
      need(PLANNERS);
      const b = await readBody(req, 512e3);
      if (!b || !Array.isArray(b.depts) || b.depts.length > 500) throw new HttpError(400, "Invalid form settings.");
      const prev = load("config", null);
      save("config", b, false);
      if (!prev || prev.open !== b.open || prev.deadline !== b.deadline) audit(req, u.username, "request_form_settings", { open: !!b.open, deadline: str(b.deadline, 20) });
      return send(req, res, 200, { ok: true });
    }
  }

  if (route === "requests"){
    const all = load("requests", []);
    const visible = r => PLANNERS.includes(u.role) || u.role === "viewer" || r.owner === u.username || (u.depts || []).includes(r.dept);
    if (method === "GET") return send(req, res, 200, { items: all.filter(visible) });
    if (method === "POST"){
      if (u.role === "viewer") throw new HttpError(403, "Your role is read-only.");
      const item = cleanRequest(await readBody(req, 64e3)), i = all.findIndex(r => r.id === item.id), now = Date.now();
      if (i < 0){
        if (u.role === "requester" && (u.depts || []).length && !u.depts.includes(item.dept)) throw new HttpError(403, "You can only request positions for your own department.");
        const cfg = load("config", null);
        if (cfg && cfg.open === false && !PLANNERS.includes(u.role)) throw new HttpError(403, "Requests are closed.");
        Object.assign(item, { owner: u.username, by: item.by || u.name, status: "pending", note: "", lineId: null, decidedAt: null, decidedBy: null, createdAt: now, updatedAt: now });
        all.push(item);
        audit(req, u.username, "request_submitted", { id: item.id, dept: item.dept, count: item.count, title: item.title });
      } else {
        const prev = all[i];
        if (PLANNERS.includes(u.role)){
          Object.assign(item, { owner: prev.owner, createdAt: prev.createdAt, updatedAt: now });
          if (item.status !== prev.status){ item.decidedAt = now; item.decidedBy = u.username; audit(req, u.username, "request_" + item.status, { id: item.id, dept: item.dept, count: item.count }); }
          else Object.assign(item, { decidedAt: prev.decidedAt || null, decidedBy: prev.decidedBy || null });
        } else {
          if (prev.owner !== u.username) throw new HttpError(403, "You can only change your own requests.");
          if (!["pending", "changes"].includes(prev.status)) throw new HttpError(403, "This request has already been decided.");
          if (!["pending", "withdrawn"].includes(item.status)) throw new HttpError(403, "Only a planner can decide on requests.");
          if (u.role === "requester" && (u.depts || []).length && !u.depts.includes(item.dept)) throw new HttpError(403, "You can only request positions for your own department.");
          Object.assign(item, { owner: prev.owner, createdAt: prev.createdAt, note: prev.note, lineId: prev.lineId, decidedAt: prev.decidedAt || null, decidedBy: prev.decidedBy || null, updatedAt: now });
          audit(req, u.username, item.status === "withdrawn" ? "request_withdrawn" : "request_edited", { id: item.id });
        }
        all[i] = item;
      }
      save("requests", all);
      return send(req, res, 200, { item });
    }
  }

  if (route === "users" || route.startsWith("users/")){
    need(["admin"]);
    if (route === "users" && method === "GET") return send(req, res, 200, { users: users().map(publicUser), roles: ROLES });
    if (route === "users" && method === "POST"){
      const b = await readBody(req, 16e3);
      const username = str(b.username, 40).toLowerCase().trim();
      if (!USERNAME_RX.test(username)) throw new HttpError(400, "Usernames are 3 to 40 letters, digits, dots, dashes or underscores.");
      if (findUser(username)) throw new HttpError(409, "That username is taken.");
      if (!ROLES.includes(b.role)) throw new HttpError(400, "Choose a role.");
      const temp = tempPassword();
      const nu = { username, name: str(b.name, 120).trim() || username, role: b.role, depts: Array.isArray(b.depts) ? b.depts.map(d => str(d, 80)).slice(0, 50) : [],
        ...(await hashPassword(temp)), mustChange: true, createdAt: Date.now(), createdBy: u.username, failed: 0 };
      users().push(nu); saveUsers();
      audit(req, u.username, "user_created", { username, role: nu.role, depts: nu.depts });
      return send(req, res, 200, { user: publicUser(nu), tempPassword: temp });
    }
    const target = findUser(decodeURIComponent(route.slice(6)));
    if (!target) throw new HttpError(404, "No such user.");
    if (method === "PUT"){
      const b = await readBody(req, 16e3), changes = {};
      const activeAdmins = users().filter(x => x.role === "admin" && !x.disabled);
      const losesAdmin = target.role === "admin" && ((b.role && b.role !== "admin") || b.disabled === true);
      if (losesAdmin && activeAdmins.length <= 1) throw new HttpError(400, "Keep at least one active administrator.");
      if (typeof b.name === "string"){ target.name = str(b.name, 120).trim() || target.username; changes.name = target.name; }
      if (b.role !== undefined){ if (!ROLES.includes(b.role)) throw new HttpError(400, "Unknown role."); if (b.role !== target.role){ changes.role = [target.role, b.role]; target.role = b.role; revokeSessions(target.username); } }
      if (Array.isArray(b.depts)){ target.depts = b.depts.map(d => str(d, 80)).slice(0, 50); changes.depts = target.depts; }
      if (b.disabled !== undefined){ target.disabled = !!b.disabled; changes.disabled = target.disabled; if (target.disabled) revokeSessions(target.username); }
      if (b.unlock){ target.lockedUntil = null; target.failed = 0; changes.unlocked = true; }
      if (b.revokeSessions){ revokeSessions(target.username, target.username === u.username ? a.key : undefined); changes.sessionsRevoked = true; }
      let temp = null;
      if (b.resetPassword){ temp = tempPassword(); Object.assign(target, await hashPassword(temp), { mustChange: true, lockedUntil: null, failed: 0 }); revokeSessions(target.username, target.username === u.username ? a.key : undefined); changes.passwordReset = true; }
      saveUsers();
      audit(req, u.username, "user_updated", { username: target.username, ...changes });
      return send(req, res, 200, { user: publicUser(target), tempPassword: temp });
    }
  }
  throw new HttpError(404, "Unknown endpoint.");
}

/* ---------- Server ---------- */
function handler(req, res){
  const url = new URL(req.url, "http://localhost");
  (async () => {
    if (url.pathname.startsWith("/api/")) return api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD"){ res.writeHead(405, baseHeaders(req)); return res.end(); }
    const entry = STATIC[url.pathname];
    if (!entry){ res.writeHead(404, { ...baseHeaders(req), "content-type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    const [f, type] = entry;
    res.writeHead(200, { ...baseHeaders(req), "content-type": type, "cache-control": f.endsWith(".html") ? "no-store" : "public, max-age=3600" });
    res.end(req.method === "HEAD" ? undefined : STATIC_BODY[f]);
  })().catch(e => {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(new Date().toISOString(), "error:", e && e.message);
    send(req, res, status, { error: status === 500 ? "Server error." : e.message, code: e.code });
  });
}

// Console recovery: node server.js reset-password <username>
if (ARGS[0] === "reset-password"){
  const u = findUser(ARGS[1]);
  if (!u) fail(`No user called "${ARGS[1] || ""}". Existing users: ${users().map(x => x.username).join(", ") || "none"}`);
  const temp = tempPassword();
  hashPassword(temp).then(h => {
    Object.assign(u, h, { mustChange: true, lockedUntil: null, failed: 0, disabled: false }); saveUsers();
    audit(null, "console", "user_updated", { username: u.username, passwordReset: true, via: "console" });
    console.log(`\n  Temporary password for ${u.username}: ${temp}\n  They must choose a new password when they sign in.\n`);
    process.exit(0);
  });
} else {
  if (networkMode && !useTLS && !CFG.allowHttp && !CFG.trustProxy)
    fail("Network sharing needs HTTPS so passwords and salaries are encrypted in transit.\n" +
      "Put the certificate from your IT team in the certs folder (server.crt + server.key, or server.pfx),\n" +
      "or run behind your company's HTTPS reverse proxy with TRUST_PROXY=1. See README.md.\n" +
      "(ALLOW_HTTP=1 overrides this check. Not recommended.)");
  let tlsOpts = null;
  if (useTLS){
    try {
      tlsOpts = CFG.tlsPfx ? { pfx: fs.readFileSync(CFG.tlsPfx), passphrase: CFG.tlsPfxPass } : { cert: fs.readFileSync(CFG.tlsCert), key: fs.readFileSync(CFG.tlsKey) };
      tlsOpts.minVersion = "TLSv1.2";
    } catch (e){ fail("Could not read the TLS certificate: " + e.message); }
  }
  const server = useTLS ? https.createServer(tlsOpts, handler) : http.createServer(handler);
  server.headersTimeout = 20e3; server.requestTimeout = 120e3; server.keepAliveTimeout = 5e3;
  server.on("clientError", (err, socket) => { try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch {} });
  server.listen(CFG.port, CFG.host, () => {
    const scheme = useTLS ? "https" : "http";
    const lines = [`  Planner:        ${scheme}://localhost:${CFG.port}`, `  Request form:   ${scheme}://localhost:${CFG.port}/request`];
    if (networkMode) for (const list of Object.values(os.networkInterfaces())) for (const ad of list || [])
      if (ad.family === "IPv4" && !ad.internal) lines.push(`  On the network: ${scheme}://${ad.address}:${CFG.port}/request`);
    console.log(`\nManpower Budget Planner is running (secure mode).\n${lines.join("\n")}\n  Data folder:    ${CFG.dataDir} (encrypted)\n  Encryption key: ${env.DATA_KEY ? "from DATA_KEY" : CFG.keyFile}\n  Audit log:      ${AUDIT_FILE}`);
    if (!users().length) console.log(`\n  First run: open ${scheme}://localhost:${CFG.port} on this computer to create the administrator account.`);
    if (networkMode && !useTLS && CFG.allowHttp) console.warn("\n  WARNING: shared on the network without HTTPS (ALLOW_HTTP=1). Passwords and salaries travel unencrypted.");
    console.log("\nPress Ctrl+C to stop.\n");
    audit(null, "system", "server_started", { host: CFG.host, port: CFG.port, tls: useTLS, proxy: CFG.trustProxy });
  });
}
