# Manpower Budget Planner

Manpower planning and budgeting for one budget year, with a request form for department heads.
It runs on your own computer (localhost), needs no internet connection and no database, and keeps
all data in the `data` folder next to this file.

## Start it

1. Install **Node.js LTS** (version 18 or later) from <https://nodejs.org>, once.
2. Copy this `manpower-planner` folder anywhere on your computer.
3. Start it:
   - **Windows:** double-click `start.bat`
   - **macOS / Linux:** run `./start.sh` in a terminal
   - **Any system:** open a terminal in this folder and run `node server.js`
4. The planner opens at **http://localhost:4000**. Keep the window open while you work. Press
   `Ctrl+C` in it to stop.

The planner starts with example data (3,100 generated employees, no real people). Load your own
employee file on **Import & export**.

## Let department heads submit requests

By default only your computer can reach the planner. To collect requests from colleagues on the
office network:

- **Windows:** double-click `start-shared.bat` and choose a planner PIN.
- **macOS / Linux:** `PLANNER_PIN=choose-a-pin ./start.sh --share`

The window prints a link such as `http://10.20.30.40:4000/request`. Send that link to department
heads. They see only the request form, never the plan, salaries or employee file. When you open
the planner you are asked for the PIN.

Notes:
- Your computer must stay on with the server running while requests come in.
- Windows may ask to allow Node.js through the firewall the first time. Allow it on private
  (office) networks only.
- If colleagues cannot connect, your IT team may need to allow incoming connections on port 4000,
  or host the folder on an internal server and run it there.
- For use outside the office network, ask IT to put it behind the company's sign-in (a reverse
  proxy with single sign-on). Do not expose it directly to the internet.

## Where data is stored

| File in `data/` | Contents |
| --- | --- |
| `plan.json` | Departments, plan lines, assumptions, scenarios |
| `roster.json` | The imported employee file (names and salaries) |
| `requests.json` | Department head requests and your decisions |
| `config.json` | What the request form shows (departments, deadline, note, rates for the cost estimate) |
| `backups/` | One copy of each file per day, made automatically |

To back up, copy the `data` folder. To move the planner to another computer, copy the whole
`manpower-planner` folder. The **Full backup (.json)** button on Import & export also exports
everything in one file.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4000` | Port to listen on |
| `HOST` | `127.0.0.1` | `0.0.0.0` shares it on the network (same as `--share`) |
| `PLANNER_PIN` | none | PIN required to open the planner. Strongly recommended when sharing |
| `DATA_DIR` | `./data` | Where the JSON files are kept |

## Importing your employee file

Import & export → **Employee master file** accepts `.xlsx`, `.xls`, `.xlsm` or `.csv` with one row per
employee and any column layout. You match the columns in step 2 and check the result before
importing. The Excel reader (`public/xlsx.full.min.js`, SheetJS Community Edition, Apache-2.0) is
bundled, so no internet access is needed.

If a file will not load:
- **Password-protected workbook:** open it in Excel, remove the protection or use *File → Save As →
  CSV UTF-8*, then import the copy.
- **Any other problem:** open “Can't upload the file? Paste from Excel instead”, select the sheet in
  Excel (`Ctrl+A`, `Ctrl+C`) and paste it into the box.
