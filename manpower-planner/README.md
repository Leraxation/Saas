# Manpower Budget Planner

Manpower planning and budgeting for one budget year, with a request form for department heads.
It runs on your own computer (localhost), needs no internet connection and no database, and keeps
all data encrypted in the `data` folder next to this file. Security controls and the deployment
checklist are in [SECURITY.md](SECURITY.md).

## Start it

1. Install **Node.js LTS** (version 18.18 or later) from <https://nodejs.org>, once.
2. Copy this `manpower-planner` folder anywhere on your computer.
3. Start it:
   - **Windows:** double-click `start.bat`
   - **macOS / Linux:** run `./start.sh` in a terminal
   - **Any system:** open a terminal in this folder and run `node server.js`
4. The planner opens at **http://localhost:4000**. Keep the window open while you work. Press
   `Ctrl+C` in it to stop.

**First run:** the page asks you to create the **administrator account**. This is only possible on
the server computer itself. Choose a password of at least 12 characters. The planner then starts
with example data (3,100 generated employees, no real people). Load your own employee file on
**Import & export**.

**Encryption key:** on first start the server creates `~/.manpower-planner/data.key` and prints its
location. **Back that file up somewhere separate from the data folder,** for example in the company
password vault. Without it the data and backups cannot be read.

## Accounts and roles

Everyone signs in with their own account. As administrator, open the **Users** tab to add people:

| Role | Can do |
| --- | --- |
| Administrator | Everything, plus users and the audit log |
| Planner | Edit the plan and employee file, decide on requests |
| Viewer | Read the plan and export it (for example Finance), no changes |
| Department head | Request form only, for the departments you tick |

New users get a one-time password (give it in person or by phone) and choose their own at first
sign-in. Accounts lock for 15 minutes after 5 wrong passwords; unlock them on the Users tab. The
page signs out after 30 minutes without activity. If the administrator password is lost, run
`node server.js reset-password <username>` on the server computer.

## Let department heads submit requests

By default only your computer can reach the planner. Sharing it on the office network requires
**HTTPS**, so passwords and salaries are encrypted on the network:

1. Ask IT for a certificate for your computer's name. Save it in the `certs` folder as
   `server.pfx`, or as `server.crt` and `server.key`.
2. Start with `start-shared.bat` (Windows) or `./start.sh --share` (macOS / Linux).
3. Create an account for each department head on the Users tab, then send them the printed link,
   for example `https://planner-pc.company.local:4000/request`.

If your company publishes internal tools through an HTTPS reverse proxy (IIS, nginx, F5), keep the
planner on this computer only and set `TRUST_PROXY=1` instead.

Notes:
- Your computer must stay on with the server running while requests come in. Otherwise ask IT to
  run the folder on an internal server.
- Ask IT to allow port 4000 only from the office network or VPN. Never expose it to the internet.
- Windows may ask to allow Node.js through the firewall. Allow it on private networks only.

## Where data is stored

| File in `data/` | Contents |
| --- | --- |
| `plan.json` | Departments, plan lines, assumptions, scenarios (encrypted) |
| `roster.json` | The imported employee file with names and salaries (encrypted) |
| `requests.json` | Department head requests and your decisions (encrypted) |
| `users.json` | Accounts, with password hashes only (encrypted) |
| `config.json` | What the request form shows (encrypted) |
| `audit.log` | Who did what and when, hash-chained so edits are detectable. Contains no salaries |
| `backups/` | One encrypted copy of each file per day, kept 30 days |

To back up, copy the `data` folder **and** keep the key file safe. To move the planner to another
computer, copy the folder and the key file. The **Full backup (.json)** button on Import & export
exports everything in one unencrypted file: store it as carefully as the employee file itself.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4000` | Port to listen on |
| `HOST` | `127.0.0.1` | `0.0.0.0` shares it on the network (same as `--share`); needs HTTPS |
| `TLS_CERT` / `TLS_KEY` | `certs/server.crt` / `certs/server.key` | HTTPS certificate and key |
| `TLS_PFX` / `TLS_PFX_PASSPHRASE` | `certs/server.pfx` | HTTPS certificate as a .pfx file |
| `TRUST_PROXY` | off | `1` when an HTTPS reverse proxy on this computer forwards to the planner |
| `DATA_DIR` | `./data` | Where the encrypted files are kept |
| `DATA_KEY_FILE` | `~/.manpower-planner/data.key` | Encryption key file (created on first run) |
| `DATA_KEY` | none | The key itself (32 bytes, base64), for example from a secrets manager |
| `SESSION_IDLE_MINUTES` | `30` | Server sign-out after this much inactivity |
| `SESSION_MAX_HOURS` | `10` | Sign out after this long regardless |
| `BACKUP_RETENTION_DAYS` | `30` | How long daily backups are kept |
| `ALLOW_HTTP` | off | `1` allows network sharing without HTTPS. Not for real data |

Run `npm test` (or `node --test test/security.test.js`) to check the security controls.

## Importing your employee file

Import & export → **Employee master file** accepts `.xlsx`, `.xls`, `.xlsm` or `.csv` with one row per
employee and any column layout. You match the columns in step 2 and check the result before
importing. The Excel reader (`public/xlsx.full.min.js`, SheetJS Community Edition, Apache-2.0) is
bundled and runs in an isolated background worker, so no internet access is needed.

If a file will not load:
- **Password-protected workbook:** open it in Excel, remove the protection or use *File → Save As →
  CSV UTF-8*, then import the copy.
- **Any other problem:** open “Can't upload the file? Paste from Excel instead”, select the sheet in
  Excel (`Ctrl+A`, `Ctrl+C`) and paste it into the box.
