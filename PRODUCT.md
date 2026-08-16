# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The product owner, and only them: a single person managing their own Microsoft/Outlook account. This is not a multi-tenant product — no login/signup flow exists, and PeopleOS's department/org-constellation view is a personal, exploratory feature on the owner's own data, not a team-facing surface for other accounts.

## Product Purpose

A personal workspace that puts the owner's Outlook inbox, calendar, and tasks in one place, adds an AI-generated daily briefing over that data, and bundles in other personal tools (a PeopleOS org-constellation view, a YouTube DJ mixer at `/mixer`) the owner wanted alongside it. Success is this being the owner's own daily-use surface, not a product other people sign up for.

## Positioning

Not a single-pitch SaaS tool — a personal utility bundle. Its reason to exist is being the owner's own multi-purpose workspace (Outlook consolidation + AI briefing + PeopleOS + mixer) rather than winning on one differentiator against Outlook or Teams. Repo is named "Saas" but the confirmed direction (as of this record) is personal-tool, not multi-user SaaS — flagged as a durable fact worth re-checking if that changes.

## Operating Context

- Data source auto-selected by which environment variables are set, in priority order: **Graph API** (`MICROSOFT_REFRESH_TOKEN`, live read/write) → **Power Automate** (`UPSTASH_REDIS_REST_URL`, synced every 15 min via Upstash Redis, read-only) → **Demo** (sample data, nothing configured).
- No login screen in any mode — the dashboard opens directly into the owner's data.
- Power Automate mode exists specifically to route around corporate admin-consent blocks on direct Graph app registration.
- Deployed on Vercel; webhook endpoints (`/api/webhooks/{emails,calendar,tasks}`) receive pushes from Power Automate flows, authenticated via an `x-webhook-secret` header.
- AI briefing (`components/AiBriefing.tsx`, `app/api/ai/brief`) is gated on `ANTHROPIC_API_KEY` being set.

## Capabilities and Constraints

- Built with Next.js 16, Tailwind CSS, and Microsoft Graph (`Mail.Read`, `Calendars.Read`, `Tasks.ReadWrite`, `User.Read`).
- Core dashboard surfaces: emails list, calendar widget (next 7 days), tasks list, stats row, insights panel, AI briefing.
- `/mixer`: dual-deck DJ mixer for YouTube (crossfader, tempo/pitch, tap-BPM sync, hot cues, loops) via the official YouTube IFrame Player API — nothing downloaded or re-hosted.
- PeopleOS (`/people-os`): department stats and an org "constellation map" — currently a personal/exploratory feature, not confirmed as core to the product's purpose.
- Auth: `next-auth`, used for the Graph-connected mode; Power Automate and Demo modes work without it.
- Open decision: whether the product ever expands beyond single-user (see Users/Positioning) is explicitly undecided-toward-personal as of this record.

## Evidence on Hand

- `dashboard-preview.png` — a real screenshot of the dashboard, referenced in the README.
- No testimonials, case studies, customer references, or pricing exist or should be fabricated for this product.

## Product Principles

1. Consolidation over navigation — one page beats switching between Outlook, Teams, and a to-do app.
2. No login friction — the dashboard opens straight into data in every mode, including demo.
3. Personal tool, not a pitch — features get added because the owner wants them (mixer, PeopleOS), not to fit a single market story.
4. Corporate IT is an obstacle to route around, not negotiate with — Power Automate mode exists so admin-consent policies don't block real data.
5. Demo mode is a first-class fallback, not an afterthought — the app must always be fully usable with zero configuration.
