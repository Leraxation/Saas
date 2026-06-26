// ============================================================
// POWER QUERY — CPO Command Center
// How to import these queries in Power BI Desktop:
//   1. Home → Transform Data → Advanced Editor
//   2. Paste each section below as a new blank query
//   3. Name each query exactly as shown in the header comment
//   4. Set FilePath query first, then refresh all
// ============================================================


// ── QUERY: FilePath (Parameter) ──────────────────────────────
// Change this to the actual location of your Excel workbook.
// All other queries reference this single value — update here only.
let
    Source = "C:\Users\YourName\Documents\CPO_Command_Center.xlsx"
in
    Source


// ── QUERY: ACTION_TRACKER ────────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="ACTION_TRACKER", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"Action ID",    type text},
                   {"Description",  type text},
                   {"Owner",        type text},
                   {"Function",     type text},
                   {"Priority",     type text},
                   {"Status",       type text},
                   {"Due Date",     type date},
                   {"Notes",        type text},
                   {"Due Category", type text},
                   {"RAG Status",   type text}
               })
in
    Typed


// ── QUERY: EMAIL_INTELLIGENCE ────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="EMAIL_INTELLIGENCE", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"Email ID",        type text},
                   {"Sender",          type text},
                   {"Subject",         type text},
                   {"Priority",        type text},
                   {"Action Required", type text},
                   {"Status",          type text},
                   {"Date",            type date},
                   {"Urgency Flag",    type text},
                   {"Follow-up",       type text}
               })
in
    Typed


// ── QUERY: HR_ALERTS ─────────────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="HR_ALERTS", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"Alert ID",       type text},
                   {"Type",           type text},
                   {"Employee",       type text},
                   {"Date",           type date},
                   {"Status",         type text},
                   {"Risk Level",     type text},
                   {"Alert Category", type text}
               })
in
    Typed


// ── QUERY: HR_METRICS ────────────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="HR_METRICS", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"Metric", type text},
                   {"Value",  type number},
                   {"Notes",  type text}
               })
in
    Typed


// ── QUERY: PROJECTS_TRACKER ──────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="PROJECTS_TRACKER", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"Project",  type text},
                   {"Owner",    type text},
                   {"Status",   type text},
                   {"Progress", Int64.Type},
                   {"Risk",     type text},
                   {"Notes",    type text}
               })
in
    Typed


// ── QUERY: DASHBOARD_SUMMARY ─────────────────────────────────
let
    Source   = Excel.Workbook(File.Contents(FilePath), null, true),
    Sheet    = Source{[Item="DASHBOARD_SUMMARY", Kind="Sheet"]}[Data],
    Headers  = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true]),
    Typed    = Table.TransformColumnTypes(Headers, {
                   {"KPI",      type text},
                   {"Value",    Int64.Type},
                   {"Category", type text}
               })
in
    Typed
