# CPO Command Center — Power BI Setup Guide

## What's in this folder

| Path | What it does |
|---|---|
| `Model/model.bim` | Complete data model (tables + measures + M queries) — import via Tabular Editor |
| `Queries/PowerQuery_All_Tables.m` | All Power Query M scripts — paste manually if not using Tabular Editor |
| `Measures/01–06_*.dax` | All DAX measures, one file per command center section |
| `Theme/CPO_CommandCenter_Theme.json` | Dark navy theme matching the command center screenshot |

---

## Step 1 — Import the data model (choose one path)

### Option A: Tabular Editor (recommended, ~5 min)
Tabular Editor is a free tool that lets you import a `.bim` file directly into
a Power BI Desktop model without touching the binary `.pbix` format.

1. Download **Tabular Editor 2** (free) from `tabulareditor.com`
2. Open **Power BI Desktop** → connect to your Excel file once manually to create a blank model
3. In Power BI Desktop → **External Tools** tab → **Tabular Editor**
4. In Tabular Editor: **File → Open → From File** → select `Model/model.bim`
5. Click **Save** (Ctrl+S) — this pushes the model back into Power BI Desktop
6. Back in Power BI Desktop: **Home → Refresh**

### Option B: Manual paste (no extra tools)
1. Open Power BI Desktop → **Get Data → Excel Workbook** → select your file
2. Import all 6 sheets: `ACTION_TRACKER`, `EMAIL_INTELLIGENCE`, `HR_ALERTS`,
   `HR_METRICS`, `PROJECTS_TRACKER`, `DASHBOARD_SUMMARY`
3. For each table, open **Power Query → Advanced Editor** and replace the
   contents with the matching query from `Queries/PowerQuery_All_Tables.m`
4. Create a blank query named **FilePath**, paste the file path string
5. Add measures manually from the `Measures/` files (see Step 3)

---

## Step 2 — Apply the file path

Open `Queries/PowerQuery_All_Tables.m` and update the **FilePath** query:

```m
// Change this to match where your Excel file actually lives:
"C:\Users\YourName\Documents\CPO_Command_Center.xlsx"
```

All six table queries reference `FilePath` — update it once and all tables refresh.

---

## Step 3 — Add DAX measures

If using Tabular Editor, the measures are already included in `model.bim`.

For manual entry in Power BI Desktop:
1. Create a hidden table called `_Measures`:
   - **Modeling → New Table** → `_Measures = {""}`
   - Right-click the table → **Hide in report view**
2. Select `_Measures` in the Fields pane → **New Measure**
3. Copy-paste each measure from the `Measures/` files
4. Set the **Display Folder** in the Properties pane to match the folder prefix
   (e.g. `1. Executive Summary`, `2. Outlook Intelligence`, etc.)

---

## Step 4 — Apply the dark theme

1. Power BI Desktop → **View** tab → **Themes → Browse for themes**
2. Select `Theme/CPO_CommandCenter_Theme.json`
3. Click **Apply** — the background, card colours, and table styles update automatically

---

## Step 5 — Build the Command Center page

Recreate the layout from the screenshot using these visuals:

### Header row — 6 KPI Cards
| Card title | Measure |
|---|---|
| Urgent Issues | `[Urgent Issues]` |
| Projects at Risk | `[Projects at Risk]` |
| Contract Expiring | `[Contracts Expiring]` |
| Approvals Pending | `[Approvals Pending]` |
| HR Alerts | `[HR Alerts]` |
| Financial Alerts | `[Financial Alerts]` |

Visual: **Card** visual. Set font to **Segoe UI Semibold 32pt**, colour `#4FC3F7`.

---

### Section: Outlook Intelligence
- **Table** visual from `EMAIL_INTELLIGENCE` table
- Columns: `Sender`, `Subject`, `Priority`, `Urgency Flag`, `Follow-up`
- Add **conditional formatting** on `Urgency Flag`:
  - `Urgent` → background `#E53E3E` (red)
  - `Normal` → background `#2D3748` (dark)

---

### Section: Action Tracker
- **Table** visual from `ACTION_TRACKER` table
- Columns: `Action ID`, `Description`, `Owner`, `Due Category`, `RAG Status`
- Conditional formatting on `RAG Status` background colour:
  - `Red` → `#E53E3E`
  - `Amber` → `#D69E2E`
  - `Green` → `#38A169`
- KPI cards above the table: `[Due Today]`, `[Due This Week]`, `[Red Actions]`

---

### Section: HR Command Center
- **Card** visuals: `[Headcount]`, `[Open Vacancies]`, `[Grievances Open]`
- **Gauge** visual for Omanisation:
  - Value: `[Omanisation %]`
  - Target: `[Omanisation Target %]`
  - Max: `0.60` (60%)
  - Colour needle red if `[Omanisation Gap] > 0.05`
- **Card** visual: `[Turnover Rate]`

---

### Section: Project Delivery Status
- **Table** visual from `PROJECTS_TRACKER`
- Columns: `Project`, `Owner`, `Status`, `Progress`, `Risk`
- Conditional formatting on `Status`:
  - `On Track` → `#38A169`
  - `In Progress` → `#4FC3F7`
  - `At Risk` → `#D69E2E`
  - `Delayed` → `#E53E3E`
- Add **Data Bars** on `Progress` column (blue, 0–100)

---

### Section: Compliance Monitor
- **Table** from `ACTION_TRACKER` filtered to Function IN {Policy, Legal, HR Ops, Employee Relations}
- KPI cards: `[Compliance Actions Open]`, `[Compliance Red Actions]`, `[Policy Actions Open]`

---

## Measure folder structure (Fields pane view)

When set up correctly, the Fields pane on `_Measures` shows:

```
_Measures
├── 1. Executive Summary
│   ├── Urgent Issues
│   ├── Projects at Risk
│   ├── Contracts Expiring
│   ├── Approvals Pending
│   ├── HR Alerts
│   └── Financial Alerts
├── 2. Outlook Intelligence
│   ├── Urgent Emails
│   ├── Pending Emails
│   ├── Emails Action Required
│   ├── Follow-up Required
│   └── Total Emails
├── 3. Action Tracker
│   ├── Total Actions / Open Actions
│   ├── Due Today / Due This Week
│   ├── Red / Amber / Green Actions
│   └── Action RAG % Red / Amber / Green
├── 4. HR Command Center
│   ├── Headcount / Omanisation % / Turnover Rate
│   ├── Open Vacancies / Probation / Grievances
│   ├── Performance Reviews Due
│   └── Critical / Contract / Probation / Performance Alerts
├── 5. Project Delivery
│   ├── Total / On Track / At Risk / Delayed / In Progress
│   ├── High Risk Projects
│   ├── Avg Project Progress
│   └── Selected Project Progress
└── 6. Compliance Monitor
    ├── Compliance Actions Open
    ├── Compliance Red Actions
    ├── Contract / Policy / Grievance Actions Open
    └── Compliance Health %
```

---

## Refreshing data

When you update the Excel file:
- Power BI Desktop: **Home → Refresh**
- Power BI Service (published): set a scheduled refresh pointing to the same Excel file
  (use OneDrive or SharePoint path for cloud refresh to work)
