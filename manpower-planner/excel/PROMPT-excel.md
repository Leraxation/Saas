# Prompt: data-driven manpower budget workbook in Excel

Copy everything below the line into Claude (or give it to an Excel developer). Replace the
`[brackets]` first.

---

Build me an Excel workbook (.xlsx, no macros) for manpower planning and budgeting at [Company]
for FY[2027]: about [3,100] employees in about [11] departments, currency [OMR].

## Core principle: the workbook is driven by my data
1. **No dummy, sample or hard-coded figures.** The delivered file is empty until I paste my HR
   export. Every result cell shows zero, and Overview shows a clear "No data yet" message until
   then.
2. **Everything is calculated from the Data sheet** with live formulas (SUMIFS, COUNTIFS, INDEX/MATCH,
   SUMPRODUCT). Nothing is typed into result cells, and no values are pasted from elsewhere.
3. **Traceable:** every department figure is a SUMIFS/COUNTIFS over the Data sheet, so filtering
   Data by department shows the rows behind any number.
4. **Assumptions are not data.** Each assumption sits in its own labelled Settings cell with a
   named range, a unit, a source note and a "Confirmed? Yes/No" column. Formulas use the names,
   never literal numbers. Overview shows how many assumptions are still unconfirmed.
5. **Reconciled:** Overview compares the totals by department with the raw Data totals (headcount,
   monthly gross pay, staff cost) and checks that the monthly phasing equals the budget. It shows
   ✓ or ✗ with the difference, so a department missing from the list can't go unnoticed.

## Sheets
1. **Guide:** steps, colour legend (blue = input, yellow = assumption to confirm, grey =
   calculated, green = link), capacity, and one example row of the Data format (not in Data).
2. **Overview:** data source (rows, active employees, rows with issues, unconfirmed assumptions),
   key figures (FY budget, prior year and change, headcount today → closing, Omanisation today and
   at year end vs target, average FTE, cost per FTE), budget bridge table with a waterfall chart
   (payroll run-rate today → increment → named leavers → planned hires → other exits →
   contingency → FY budget, with a check that the steps equal the budget), reconciliation table,
   and a chart of budget by department.
3. **Settings:** FY, increment % and effective month, bonus months, employer social protection
   (Omani and expatriate, on basic or gross), expatriate end-of-service %, ticket, medical
   (Omani and expatriate), training, recruitment (Omani and expatriate), contingency, Omanisation
   target, retirement ages, and switches "Treat retirements as exits" and "Treat contract ends as
   exits".
4. **Departments:** I type the department names (exactly as in my export), overtime %, prior-year
   budget and ceiling. Calculated: headcount, Omani count and %, women, monthly gross, named
   leavers, reaching retirement age, contracts ending, planned hires and exits, closing headcount,
   staff cost, plan cost, contingency, FY budget, change vs prior year, ceiling status, closing
   Omani %. Plus a count of departments that appear in Data but are missing from this list.
5. **Data:** I paste my export into input columns A–P: Employee ID, name, department*, section, job
   title, grade, nationality*, gender, date of birth, joining date, contract end date, basic*,
   allowances total, employment status, optional planned exit month and personal increment %.
   Calculated columns, pre-filled for [5,000] rows and showing blank on empty rows:
   - Omani flag, active flag (status words such as resigned, terminated, vacant)
   - age and service at 1 January
   - retirement month and contract-end month in the year, and last month on payroll
   - increment rate, and paid months including the increment from its effective month
   - department overtime %
   - annual basic, allowances, overtime, bonus, social protection, end-of-service, and tickets /
     medical / training
   - FY cost, run-rate cost, full-year cost with increment, monthly gross today
   - a **Check** column that flags missing basic, an unknown department, or dates stored as text
6. **Plan:** up to [300] lines of planned hires and other exits (type, department from a dropdown,
   position, nationality, number, month, basic, allowances, reason or request reference), costed
   the same way, including recruitment.
7. **Budget by Dept:** department × cost line (basic, allowances, overtime, bonus, social
   protection, end-of-service, benefits, plan lines, recruitment, contingency, total), with a
   check against the Departments sheet.
8. **Monthly:** cost and headcount for each month Jan–Dec, contingency included, a line chart and a
   check against the budget.

## Calculation rules
- Paid months for a period from month *a* to month *b*, with increment *r* effective from month
  *i*: `MAX(0, MIN(b, i−1) − a + 1) + MAX(0, b − MAX(a, i) + 1) × (1 + r)`.
- Employees: *a* = 1; *b* = the earliest of their planned exit month, retirement month (if the
  switch is Yes), contract-end month (if the switch is Yes) and 12; zero if not active.
- Plan hires: *a* = start month, *b* = 12. Plan exits: *a* = exit month + 1, *b* = 12, with a
  negative sign.
- Run-rate = active staff at today's pay × 12 months with all on-costs and no increment.

## Quality bar
- Arial font; inputs in blue; key assumptions on yellow fill; calculated columns in grey; OMR
  shown as `#,##0` and zeros as "-"; percentages stored as fractions.
- Data validation on months (1–12), Hire/Exit, Omani/Expatriate, department dropdowns and
  Yes/No switches.
- Conditional formatting: Check column issues in red, over-ceiling departments in red,
  Omanisation below target in amber, reconciliation ✓ in green and ✗ in red.
- Only functions that work in Excel 2016 and later (no XLOOKUP, FILTER, UNIQUE or dynamic
  arrays), so the file works on every company PC.
- Before delivering, fill a test copy with synthetic data, compare every key figure with an
  independent calculation, and confirm zero formula errors. Deliver the template empty.
- Ask me to confirm any assumption or business rule that changes the figures before building.
