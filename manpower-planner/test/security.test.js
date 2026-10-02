// Security regression tests for the planner server. Run: node --test test/
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const SERVER = path.join(__dirname, "..", "server.js");
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "mp-test-"));
const PORT = 41000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;
const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: DATA, DATA_KEY: crypto.randomBytes(32).toString("base64"), HOST: "127.0.0.1" };
let proc;

function client(){
  const jar = {}; let csrf = "";
  async function req(method, p, body, opts = {}){
    const headers = { cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "), ...(opts.headers || {}) };
    if (body !== undefined && !headers["content-type"]) headers["content-type"] = "application/json";
    if (method !== "GET" && opts.csrf !== false) headers["x-csrf-token"] = opts.token ?? csrf;
    const r = await fetch(BASE + p, { method, headers, body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)), redirect: "manual" });
    for (const c of r.headers.getSetCookie ? r.headers.getSetCookie() : []){ const [kv] = c.split(";"); const i = kv.indexOf("="); jar[kv.slice(0, i)] = kv.slice(i + 1); }
    let json = null; const text = await r.text(); try { json = JSON.parse(text); } catch {}
    if (json && json.csrf) csrf = json.csrf;
    return { status: r.status, headers: r.headers, json, text };
  }
  return { req, jar, get csrf(){ return csrf; } };
}
const STRONG = "correct horse battery staple";

before(async () => {
  proc = spawn(process.execPath, [SERVER], { env: ENV, stdio: "pipe" });
  for (let i = 0; i < 50; i++){ try { await fetch(BASE + "/api/health"); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error("server did not start");
});
after(() => { proc && proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

const admin = client(), head = client(), viewer = client(), anon = client();

test("pages carry strict security headers and no third-party resources", async () => {
  const r = await anon.req("GET", "/");
  assert.equal(r.status, 200);
  const csp = r.headers.get("content-security-policy");
  assert.match(csp, /default-src 'none'/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /script-src 'self' 'sha256-/);
  assert.doesNotMatch(csp, /unsafe-eval/); assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(r.text, /fonts\.googleapis\.com/);
});

test("only whitelisted files are served", async () => {
  for (const p of ["/server.js", "/../server.js", "/%2e%2e/server.js", "/data/plan.json", "/package.json", "/public/index.html"]){
    assert.equal((await anon.req("GET", p)).status, 404, p);
  }
});

test("API refuses unauthenticated access", async () => {
  for (const p of ["/api/plan", "/api/roster", "/api/requests", "/api/config", "/api/users", "/api/audit"]) assert.equal((await anon.req("GET", p)).status, 401, p);
});

test("first administrator: weak password refused, then created once", async () => {
  const s = await anon.req("GET", "/api/session");
  assert.equal(s.status, 401); assert.equal(s.json.setup, true); assert.equal(s.json.setupAllowed, true);
  assert.equal((await admin.req("POST", "/api/setup", { username: "admin", name: "Admin", password: "short" }, { csrf: false })).status, 400);
  assert.equal((await admin.req("POST", "/api/setup", { username: "admin", name: "Admin", password: "password123password" }, { csrf: false })).status, 400);
  const r = await admin.req("POST", "/api/setup", { username: "admin", name: "Plan Owner", password: STRONG }, { csrf: false });
  assert.equal(r.status, 200); assert.equal(r.json.user.role, "admin");
  assert.equal((await anon.req("POST", "/api/setup", { username: "evil", name: "x", password: STRONG }, { csrf: false })).status, 409);
});

test("session cookie is HttpOnly and SameSite=Strict", async () => {
  const c = client();
  const r = await fetch(BASE + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: STRONG }) });
  const sc = r.headers.get("set-cookie");
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.match(sc, /Path=\//);
  void c;
});

test("CSRF: changes need the session token, JSON, and a same-origin request", async () => {
  const plan = { depts: [{ id: "d1", name: "Finance" }], lines: [] };
  assert.equal((await admin.req("PUT", "/api/plan", { data: plan, baseVersion: 0 }, { token: "wrong" })).status, 403);
  assert.equal((await admin.req("PUT", "/api/plan", { data: plan, baseVersion: 0 }, { headers: { origin: "https://evil.example" } })).status, 403);
  assert.equal((await admin.req("PUT", "/api/plan", JSON.stringify({ data: plan, baseVersion: 0 }), { headers: { "content-type": "text/plain" } })).status, 415);
});

test("plan saves are versioned and stale writes are refused", async () => {
  const plan = { depts: [{ id: "d1", name: "Finance" }, { id: "d2", name: "Cargo" }], lines: [{ id: "l1", dept: "d1", role: "SECRET-MARKER-ACCOUNTANT", basic: 900 }] };
  const r1 = await admin.req("PUT", "/api/plan", { data: plan, baseVersion: 0 });
  assert.equal(r1.status, 200); assert.equal(r1.json.version, 1);
  assert.equal((await admin.req("PUT", "/api/plan", { data: plan, baseVersion: 0 })).status, 409);
  assert.equal((await admin.req("PUT", "/api/plan", { data: plan, baseVersion: 1 })).json.version, 2);
  await admin.req("PUT", "/api/config", { depts: [{ id: "d1", name: "Finance" }, { id: "d2", name: "Cargo" }], open: true, fy: 2027, a: {} });
});

test("data is encrypted at rest", async () => {
  const raw = fs.readFileSync(path.join(DATA, "plan.json"), "utf8");
  assert.doesNotMatch(raw, /SECRET-MARKER/);
  assert.equal(JSON.parse(raw).alg, "AES-256-GCM");
  const users = fs.readFileSync(path.join(DATA, "users.json"), "utf8");
  assert.doesNotMatch(users, /admin|scrypt/);
});

let headTemp = "";
test("roles: department head is limited to the request form and their department", async () => {
  const c = await admin.req("POST", "/api/users", { username: "head.finance", name: "Finance Head", role: "requester", depts: ["d1"] });
  assert.equal(c.status, 200); headTemp = c.json.tempPassword; assert.ok(headTemp.length >= 16);
  assert.equal((await head.req("POST", "/api/login", { username: "head.finance", password: headTemp }, { csrf: false })).status, 200);
  assert.equal((await head.req("GET", "/api/config")).json.code, "must_change");
  assert.equal((await head.req("POST", "/api/password", { current: headTemp, next: "quiet river lantern 2027" })).status, 200);
  assert.equal((await head.req("GET", "/api/plan")).status, 403);
  assert.equal((await head.req("GET", "/api/roster")).status, 403);
  assert.equal((await head.req("GET", "/api/users")).status, 403);
  const cfg = await head.req("GET", "/api/config");
  assert.deepEqual(cfg.json.data.depts.map(d => d.id), ["d1"]);
  const base = { title: "Accountant", nat: "O", count: 2, startM: 4, why: "Workload grows with the new ERP rollout." };
  assert.equal((await head.req("POST", "/api/requests", { ...base, dept: "d2", id: "rq-x" })).status, 403);
  const ok = await head.req("POST", "/api/requests", { ...base, dept: "d1", id: "rq-1", owner: "someone-else", status: "approved" });
  assert.equal(ok.status, 200); assert.equal(ok.json.item.owner, "head.finance"); assert.equal(ok.json.item.status, "pending");
  assert.equal((await head.req("POST", "/api/requests", { ...ok.json.item, status: "approved" })).status, 403);
  const dec = await admin.req("POST", "/api/requests", { ...ok.json.item, status: "approved" });
  assert.equal(dec.json.item.decidedBy, "admin");
  assert.equal((await head.req("POST", "/api/requests", { ...ok.json.item, why: "changed after approval" })).status, 403);
});

test("viewer can read the plan but not change it", async () => {
  const c = await admin.req("POST", "/api/users", { username: "finance.viewer", name: "Finance Viewer", role: "viewer" });
  await viewer.req("POST", "/api/login", { username: "finance.viewer", password: c.json.tempPassword }, { csrf: false });
  await viewer.req("POST", "/api/password", { current: c.json.tempPassword, next: "viewer passphrase for review" });
  assert.equal((await viewer.req("GET", "/api/plan")).status, 200);
  assert.equal((await viewer.req("PUT", "/api/plan", { data: { depts: [], lines: [] }, baseVersion: 2 })).status, 403);
  assert.equal((await viewer.req("POST", "/api/requests", { dept: "d1", title: "x", why: "y" })).status, 403);
});

test("wrong passwords lock the account and do not reveal which usernames exist", async () => {
  const c = client();
  const unknown = await c.req("POST", "/api/login", { username: "nobody", password: "whatever-whatever" }, { csrf: false });
  const wrong = await c.req("POST", "/api/login", { username: "finance.viewer", password: "whatever-whatever" }, { csrf: false });
  assert.equal(unknown.status, 401); assert.equal(wrong.status, 401); assert.equal(unknown.json.error, wrong.json.error);
  for (let i = 0; i < 4; i++) await c.req("POST", "/api/login", { username: "finance.viewer", password: "nope-nope-nope" }, { csrf: false });
  assert.equal((await c.req("POST", "/api/login", { username: "finance.viewer", password: "viewer passphrase for review" }, { csrf: false })).status, 423);
  const un = await admin.req("PUT", "/api/users/finance.viewer", { unlock: true });
  assert.equal(un.status, 200);
  assert.equal((await c.req("POST", "/api/login", { username: "finance.viewer", password: "viewer passphrase for review" }, { csrf: false })).status, 200);
});

test("the last administrator cannot be removed", async () => {
  assert.equal((await admin.req("PUT", "/api/users/admin", { role: "planner" })).status, 400);
  assert.equal((await admin.req("PUT", "/api/users/admin", { disabled: true })).status, 400);
});

test("disabling a user ends their sessions immediately", async () => {
  assert.equal((await head.req("GET", "/api/requests")).status, 200);
  await admin.req("PUT", "/api/users/head.finance", { disabled: true });
  assert.equal((await head.req("GET", "/api/requests")).status, 401);
});

test("audit log records events and detects tampering", async () => {
  const a = await admin.req("GET", "/api/audit?limit=500");
  assert.equal(a.status, 200); assert.equal(a.json.ok, true);
  const events = a.json.entries.map(e => e.event);
  for (const ev of ["setup_admin_created", "login_success", "login_failed", "account_locked", "user_created", "request_submitted", "request_approved", "plan_saved"]) assert.ok(events.includes(ev), ev);
  const f = path.join(DATA, "audit.log"), lines = fs.readFileSync(f, "utf8").trim().split("\n");
  const e = JSON.parse(lines[2]); e.actor = "someone-else"; lines[2] = JSON.stringify(e);
  fs.writeFileSync(f, lines.join("\n") + "\n");
  const b = await admin.req("GET", "/api/audit");
  assert.equal(b.json.ok, false); assert.equal(b.json.brokenAt, 3);
});

test("network sharing without HTTPS is refused", () => {
  const r = spawnSync(process.execPath, [SERVER], { env: { ...ENV, HOST: "0.0.0.0", PORT: String(PORT + 1) }, encoding: "utf8", timeout: 10000 });
  assert.equal(r.status, 1); assert.match(r.stderr, /needs HTTPS/);
});

test("the wrong encryption key is refused at startup", () => {
  const r = spawnSync(process.execPath, [SERVER], { env: { ...ENV, DATA_KEY: crypto.randomBytes(32).toString("base64"), PORT: String(PORT + 2) }, encoding: "utf8", timeout: 10000 });
  assert.equal(r.status, 1); assert.match(r.stderr, /does not match/);
});
