# Security

The planner holds salaries, dates of birth and nationality for every employee. This document lists the
controls built into the localhost server, what you still have to do when you deploy it, and the
known limits. Run the automated checks with `npm test` (no dependencies needed).

## Controls

| Area | Control |
| --- | --- |
| **Identity** | Named accounts only, no shared passwords. The first administrator can only be created on the server computer itself (loopback). |
| **Roles** | Administrator (users, audit log, planning) · Planner (plan, employee file, request decisions) · Viewer (read-only planner, e.g. Finance) · Department head (request form only, limited to assigned departments). Enforced on the server for every API call. |
| **Passwords** | scrypt (N=32768, r=8, p=1, 16-byte salt). At least 12 characters, blocklist of common and predictable passwords, must not contain the username or name. Temporary passwords are random, shown once, and must be changed at first sign-in. |
| **Brute force** | Account locks for 15 minutes after 5 failed attempts. Sign-in is limited to 20 attempts per IP address per 15 minutes, and the whole API to 900 requests per IP per 5 minutes. Unknown usernames and wrong passwords get the same answer and take the same time. |
| **Sessions** | 256-bit random tokens, stored server-side only as SHA-256 hashes. Cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` with the `__Host-` prefix under HTTPS. 30-minute idle timeout and 10-hour absolute limit. Sessions end immediately when a user is disabled, their role changes or their password is reset. Changing your password ends your other sessions. |
| **Screen lock** | The page signs out after 30 minutes without activity, so an unattended screen stops showing salaries. Unsaved changes stay in the page and are saved after signing in again. |
| **CSRF** | Every change needs the per-session token in a header, a JSON body and a same-origin `Origin`/`Sec-Fetch-Site`. |
| **Transport** | Network sharing refuses to start without HTTPS (TLS 1.2 or later), unless the planner sits behind your HTTPS reverse proxy (`TRUST_PROXY=1`). HSTS is sent under HTTPS. |
| **Encryption at rest** | Plan, employee file, requests, form settings, user accounts and all backups are encrypted with AES-256-GCM (random IV per write, file name bound as associated data). The key lives outside the data folder (default `~/.manpower-planner/data.key`, mode 0600) or comes from `DATA_KEY`. A wrong or missing key stops the server instead of corrupting data. Files written by earlier versions are encrypted on first start. |
| **Audit** | Append-only `data/audit.log` (JSON lines) records sign-ins, failures, lockouts, password changes, user changes, plan and employee-file saves, request submissions and decisions, form settings, exports and server starts, with user, time and IP. Each entry includes the SHA-256 of the previous one, so editing or deleting lines is detected (Audit log tab). Salaries are never written to it. |
| **Browser hardening** | Strict Content-Security-Policy (no inline script except the page's own hashed script, no `eval`, no third-party hosts, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, COOP/CORP, a restrictive `Permissions-Policy` and `no-store` caching. The server-hosted page makes no requests to the internet; web fonts are removed. |
| **Attack surface** | No third-party npm dependencies. Only four static files are served, from an allow-list. Request bodies must be JSON with size limits per endpoint; `__proto__`/`constructor` keys are dropped; request fields are validated and bounded. Header and request timeouts are set. Errors never return stack traces. |
| **Excel import** | Workbooks are parsed in an isolated Web Worker with a 90-second limit, 40 MB and 200,000-row caps. A malformed file cannot reach the page's data, and a parse that hangs is stopped. |
| **Exports** | Text that starts with `=`, `+`, `-` or `@` is prefixed with `'` in CSV and Excel exports, so a crafted name cannot run as a formula when opened in Excel (CSV injection). |
| **Integrity** | Saves are versioned: if someone else saved since you opened the plan, your save is refused and you are asked to reload instead of overwriting their work. |
| **Backups** | One encrypted copy per file per day in `data/backups`, kept for 30 days (`BACKUP_RETENTION_DAYS`). |
| **Recovery** | `node server.js reset-password <username>` on the server console issues a temporary password (logged in the audit trail). The last active administrator cannot be disabled or demoted. |

## Deployment checklist

1. **Run it on a managed computer or internal server** with disk encryption (BitLocker or FileVault) and current OS patches. Use Node.js LTS.
2. **Back up the encryption key separately** from the data folder (for example in the company password vault). Without it the data and backups cannot be read. With it, anyone holding a copy of the data can read it.
3. **For network access, use HTTPS.** Put the certificate from IT in `certs/` (`server.crt` + `server.key`, or `server.pfx` with `TLS_PFX_PASSPHRASE`), or publish it through the company reverse proxy (IIS, nginx, F5) with `TRUST_PROXY=1`. Do not set `ALLOW_HTTP=1` in production.
4. **Restrict the network path:** allow port 4000 only from the office network or VPN in the firewall. Never expose it directly to the internet.
5. **Run as a normal user account,** not as Administrator or root. On a server, run it as a service under a dedicated account (for example with NSSM on Windows or systemd on Linux), and give only that account access to the data folder and key file.
6. **Accounts:** give each person their own account with the lowest role that fits. Review the Users tab monthly and disable people who change jobs or leave.
7. **Audit:** review the Audit log tab regularly. To keep it centrally, forward `data/audit.log` to your SIEM (it is one JSON object per line).
8. **Retention:** set `BACKUP_RETENTION_DAYS` to your data-retention policy. Delete the data folder, its backups and the key when the budget cycle's retention period ends.

## Known limits and recommended next steps

- **Excel library version.** The bundled SheetJS is 0.18.5, the latest on npm. Versions before 0.19.3 and 0.20.2 have two published issues: prototype pollution (CVE-2023-30533) and a regular-expression denial of service (CVE-2024-22363), both triggered by opening a crafted file. The worker isolation, time limit and size caps above contain both. To remove them entirely, have IT download version 0.20.3 or later from the vendor (`https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`), check it against the vendor's published checksum, and replace `public/xlsx.full.min.js`.
- **Single sign-on.** Accounts are local to the planner. For Active Directory or Entra ID sign-in, publish it behind the company's SSO reverse proxy. Integrating it directly would be a follow-up project.
- **Multi-factor authentication** is not built in. Use the SSO proxy above if MFA is required.
- **Sessions are kept in memory,** so restarting the server signs everyone out. That is intentional.
- **One server process.** The design assumes a single instance; it is not built for load-balanced clusters.
- **The claude.ai preview** of this tool does not use these server controls. There, access is governed by claude.ai sign-in and the artifact's sharing settings, and data is private per account. Use the localhost server for real employee data.

## Reporting a problem

If the Audit log tab shows "Tampering detected", or you suspect someone has a copy of the data and key:
stop the server, keep a copy of `data/audit.log` for investigation, contact IT security, then rotate
the key (`node server.js` with a new `DATA_KEY` after re-importing from a trusted backup) and reset
all passwords from the Users tab.
