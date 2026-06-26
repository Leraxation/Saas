# CPO Command Center — Power BI Service (Browser) Setup Guide

This guide is written for **Power BI Service in the browser** — no desktop app needed.
The `.bim` file in `Model/` can be ignored; everything you need is in the steps below.

---

## Overview of the approach

```
Excel file on OneDrive
        ↓
  Dataflow (Power Query Online)   ← paste from Queries/PowerQuery_All_Tables.m
        ↓
  Semantic Model (Dataset)        ← paste DAX from Measures/ files
        ↓
  Report (Command Center page)    ← apply Theme + build visuals
```

---

## Step 1 — Upload your Excel to OneDrive

1. Go to **onedrive.live.com** (personal) or your work OneDrive
2. Upload `CPO_Command_Center.xlsx` to any folder
3. Copy the file URL — you'll need it in Step 2

> **Why OneDrive?** Power BI Service can refresh automatically from OneDrive.
> A file on your desktop won't refresh after the first upload.

---

## Step 2 — Create a Dataflow

A Dataflow loads and shapes the data using Power Query, exactly like the queries
in `Queries/PowerQuery_All_Tables.m`.

1. In Power BI Service, open your **Workspace**
2. Click **+ New → Dataflow**
3. Choose **Define new tables**
4. For each of the 6 tables, click **+ Add new table → Blank query**
5. In the **Advanced Editor**, replace the default text with the matching query
   from `Queries/PowerQuery_All_Tables.m` (copy the block for each table)
6. Name each query exactly: `ACTION_TRACKER`, `EMAIL_INTELLIGENCE`, `HR_ALERTS`,
   `HR_METRICS`, `PROJECTS_TRACKER`, `DASHBOARD_SUMMARY`

### Setting the file path inside the Dataflow

In the `ACTION_TRACKER` query (and all others), the `FilePath` reference points to
your OneDrive file. Replace `File.Contents(FilePath)` with the Web.Contents
version for OneDrive:

```m
// Replace this line in every query:
Source = Excel.Workbook(File.Contents(FilePath), null, true),

// With this (paste your actual OneDrive share link):
Source = Excel.Workbook(Web.Contents("https://1drv.ms/x/YOUR_SHARE_LINK"), null, true),
```

> **Get the OneDrive link:** Right-click the file in OneDrive → Share → Copy link.
> Use the direct download link format ending in `&download=1`.

7. Click **Save & Close** → name the Dataflow **CPO Command Center**
8. Click **Refresh now** — all 6 tables should load green

---

## Step 3 — Create the Semantic Model

1. In your Workspace, find the Dataflow you just created
2. Click **"..."** next to it → **Create report** — this auto-creates a dataset
   OR
   Go to **+ New → Semantic model** → connect to your Dataflow

---

## Step 4 — Add DAX Measures via the web model editor

Power BI Service has a built-in web DAX editor (no desktop needed).

1. In your Workspace, find the Semantic Model (dataset)
2. Click **"..."** → **Open data model**
   *(If you don't see this, go to Settings → Preview features → enable "Model view")*
3. In the model editor, click **Home → New measure**
4. Paste each measure from the `Measures/` files one at a time

### Setting display folders (so the Fields pane matches the command center sections)

After creating each measure:
1. Select the measure in the model editor
2. In the **Properties** panel on the right, find **Display folder**
3. Type the folder name exactly as shown at the top of each `.dax` file:
   - `1. Executive Summary`
   - `2. Outlook Intelligence`
   - `3. Action Tracker`
   - `4. HR Command Center`
   - `5. Project Delivery`
   - `6. Compliance Monitor`

The numbered prefix forces the folders to appear in order in the Fields pane.

---

## Step 5 — Apply the dark theme

1. Open a new Report in your Workspace
2. Click **View → Themes → Browse for themes**
3. Upload `Theme/CPO_CommandCenter_Theme.json`
4. Click **Apply to all pages**

---

## Step 6 — Build the Command Center page

### Header — 6 KPI Cards

Place these across the top of the canvas. Use the **Card** visual.

| Card label | Measure to drag in |
|---|---|
| Urgent Issues | `[Urgent Issues]` |
| Projects at Risk | `[Projects at Risk]` |
| Contract Expiring | `[Contracts Expiring]` |
| Approvals Pending | `[Approvals Pending]` |
| HR Alerts | `[HR Alerts]` |
| Financial Alerts | `[Financial Alerts]` |

Card formatting: font size 32, colour `#4FC3F7`, background `#1C2333`.

---

### Outlook Intelligence panel

- Visual: **Table**
- Table: `EMAIL_INTELLIGENCE`
- Columns: `Sender`, `Subject`, `Priority`, `Urgency Flag`, `Follow-up`
- Conditional formatting on **Urgency Flag** (background colour):
  - Rules: `Urgent` → `#E53E3E` (red) | `Normal` → `#2D3748` (dark)

---

### Action Tracker panel

- Visual: **Table**
- Table: `ACTION_TRACKER`
- Columns: `Action ID`, `Description`, `Owner`, `Due Category`, `RAG Status`
- Conditional formatting on **RAG Status** (background colour):
  - `Red` → `#E53E3E` | `Amber` → `#D69E2E` | `Green` → `#38A169`
- Small KPI cards above the table: `[Due Today]`, `[Due This Week]`, `[Red Actions]`

---

### HR Command Center panel

| Visual | Config |
|---|---|
| Card | `[Headcount]` |
| Card | `[Open Vacancies]` |
| Card | `[Grievances Open]` |
| Gauge | Value: `[Omanisation %]`, Target: `[Omanisation Target %]`, Max: `0.6` |
| Card | `[Turnover Rate]` |
| Card | `[Critical HR Alerts]` |

---

### Project Delivery Status panel

- Visual: **Table** from `PROJECTS_TRACKER`
- Columns: `Project`, `Owner`, `Status`, `Progress`, `Risk`
- Conditional formatting on **Status**:
  - `On Track` → `#38A169` | `In Progress` → `#4FC3F7`
  - `At Risk` → `#D69E2E` | `Delayed` → `#E53E3E`
- Add **Data bars** on `Progress` (blue, range 0–100)

---

### Compliance Monitor panel

- Visual: **Table** from `ACTION_TRACKER`
- Add a visual-level filter: `Function` is one of `Policy`, `Legal`, `HR Ops`, `Employee Relations`
- Columns: `Description`, `Owner`, `Function`, `RAG Status`, `Due Date`
- KPI cards: `[Compliance Actions Open]`, `[Compliance Red Actions]`

---

## Refreshing data

When you update the Excel file on OneDrive:
1. Go to your Workspace → find the **Dataflow**
2. Click **"..."** → **Refresh now**
3. The Semantic Model and Report update automatically

To set up **automatic scheduled refresh**:
1. Dataflow → Settings → Scheduled refresh → On → pick a time (e.g. 8 AM daily)

---

## Fields pane — what you'll see after setup

```
_Measures
├── 1. Executive Summary        (6 measures — header KPI cards)
├── 2. Outlook Intelligence     (5 measures — email panel)
├── 3. Action Tracker           (10 measures — RAG + due buckets)
├── 4. HR Command Center        (13 measures — HR KPIs + alerts)
├── 5. Project Delivery         (8 measures — portfolio metrics)
└── 6. Compliance Monitor       (6 measures — risk/policy items)
```
