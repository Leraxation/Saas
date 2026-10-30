# Project skills

Design, QA and 3D skills vendored into this repo so every Claude Code session on it has the same
toolset. Each folder is a self-contained skill with a `SKILL.md` entry file.

| Skill | Invoke | What it does | Upstream (pinned commit) |
|---|---|---|---|
| `taste-skill` | describe the page work; auto-triggers | Art direction for landing pages, product pages and app screens. Deals researched directions from a library of 247 studied sites, enforces a no-slop house style, and runs a look-and-fix loop on real-browser screenshots. | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) @ `12af471` |
| `impeccable` | `/impeccable <command> [target]` | 24 design commands (`polish`, `critique`, `audit`, `bolder`, `layout`, …) plus a deterministic detector with 60+ rules for layout, padding, spacing and AI-slop tells. | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) v4.8.0 @ `df3a4ab` |
| `playwright-cli` | ask to open, test or screenshot a page | Drives a real browser from the shell: open, click, fill, snapshot, screenshot. Used to render what was just written and catch visual bugs. | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) @ `86f5616` |
| `awesome-design` | ask for a page that "looks like <brand>" | 84 `DESIGN.md` files extracted from real sites (Linear, Vercel, Supabase, Raycast, Apple, Nike, …) with typography scales, tokens and motion rules. | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) @ `fcc7028` |
| `img2threejs` | attach an image and ask for a 3D version | Rebuilds the object in a reference image as procedural, animation-ready Three.js code through a staged, quality-gated pipeline. | [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) v2.0.0 @ `3e7099e` |

`../agents/` holds the four Impeccable sub-agents (finish reviewer, documenter, asset producer,
manual-edit applier) that the `impeccable` skill delegates to.

## Runtime requirements

| Skill | Needs |
|---|---|
| `taste-skill` | Node 18+ and a Chrome, Edge or Chromium binary (set `CHROME_PATH` if it is not on the default path). |
| `impeccable` | Nothing extra. `scripts/impeccable` downloads a checksummed engine binary into `~/.impeccable/bin/` on first run. |
| `playwright-cli` | `@playwright/cli` is a dev dependency, so `npx playwright-cli …` works after `npm install`. Browsers come from `npx playwright install chrome` or an existing Chrome. |
| `awesome-design` | Nothing. Plain markdown. |
| `img2threejs` | Node 18+, Python 3.10+, Git. Vision review uses whatever browser or screenshot tool the session has. |

## Enabling the Impeccable design hook

Impeccable can scan every UI file an agent edits and hand findings back before the work is called
done. That requires hooks in `.claude/settings.json`, which this install did not write. To turn it
on, merge `.claude/impeccable-hooks.example.json` into `.claude/settings.json` (or copy it there if
no settings file exists yet) and reload Claude Code. Alternatively run `npx impeccable install
--providers=claude --scope=project` from the repo root and accept the hook prompt.

## Running in a root container (Claude Code on the web, CI)

Chromium refuses to start as root without `--no-sandbox`:

- **playwright-cli**: start the browser with a config such as
  `.claude/skills/playwright-cli/root-container.config.json`:
  `npx playwright-cli open --config=.claude/skills/playwright-cli/root-container.config.json http://localhost:3000`
- **taste-skill inspector**: `CHROME_PATH` must point to a Chromium build and the environment must
  allow it to run; on a root container run the inspector through `playwright-cli` screenshots instead,
  or run it on a developer machine.

## Updating

Each skill is a plain copy of the upstream folder noted above. To update one, clone the upstream
repo at the new version and replace the folder:

```bash
git clone --depth 1 https://github.com/pbakaus/impeccable /tmp/impeccable
rm -rf .claude/skills/impeccable && cp -r /tmp/impeccable/.claude/skills/impeccable .claude/skills/
cp /tmp/impeccable/.claude/agents/*.md .claude/agents/
```

For `awesome-design` and `img2threejs` keep the local `SKILL.md` / folder layout and refresh the
`design-md/` or upstream contents underneath it.
