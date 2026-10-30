---
name: awesome-design
description: >-
  Library of 84 DESIGN.md files extracted from real production websites (Linear, Vercel, Supabase,
  Raycast, Notion, Apple, Nike, Stripe-style SaaS and more), each documenting typography scales,
  colour tokens, spacing, motion and component rules. Use when the user wants a page or component
  to "look like <brand>", asks for a reference design system, needs a typography scale or motion
  spec grounded in a real product, or when starting a new surface and wanting a concrete visual
  language instead of a generic layout. Pair with the impeccable and taste-skill skills.
---

# Awesome DESIGN.md

A curated, read-only library of `DESIGN.md` documents, one per real-world site, under
`design-md/<site>/DESIGN.md`. Each file is a plain-text design system: brand voice, colour
tokens, type scale, spacing rhythm, radii, shadows, motion timings, and component patterns.

Source: https://github.com/VoltAgent/awesome-design-md (MIT). Do not edit files under
`design-md/`; refresh them from upstream instead.

## How to use

1. **Find the closest reference.** List the library and pick one or two sites whose audience and
   mode match the surface you are building (dashboard: `linear.app`, `raycast`, `vercel`;
   developer product: `supabase`, `resend`, `warp`; consumer: `apple`, `nike`, `oura`):

   ```bash
   ls .claude/skills/awesome-design/design-md
   ```

2. **Read the whole DESIGN.md** for the chosen site before writing any UI code. Pull the concrete
   values: font families and scale, colour tokens, spacing unit, radius, shadow and motion rules.

   ```bash
   cat .claude/skills/awesome-design/design-md/linear.app/DESIGN.md
   ```

3. **Adapt, do not clone.** Use the reference to set this project's own tokens (Tailwind config,
   CSS variables, component defaults). Never copy a brand's logo, wordmark, name or proprietary
   imagery. Swap the brand colour for the project's own and keep the structure, scale and rhythm.

4. **Record the decision.** When a reference is adopted for the project, write or update the
   project's own `DESIGN.md` at the repo root (the `impeccable document` command does this) so
   later work stays consistent.

## Tips

- Compare two candidates with `diff` on their typography sections to see which scale fits the
  density you need.
- Dashboards and admin screens: prefer references with tight spacing scales and 13 to 14px body
  text. Marketing pages: prefer references with large display sizes and generous whitespace.
- Each folder also has a `README.md` with a short description of the site and its design mood.
