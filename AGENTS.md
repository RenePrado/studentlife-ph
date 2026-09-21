<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Status Color System

Dashboard cards use a consistent color system to signal urgency/status. Definitions live in `src/lib/status-colors.ts`.

| Color | CSS Variable | Tailwind Class | Meaning | Example Usage |
|-------|-------------|----------------|---------|---------------|
| Mint green (primary) | `--primary` | `border-l-primary/70`, `bg-primary/10`, `text-primary` | On track, actionable today | Today's Classes card border |
| Amber | Tailwind `amber-500` | `border-l-amber-500/70`, `bg-amber-500/10`, `text-amber-500` | Attention needed | Pending Tasks card border (when > 0) |
| Red | Tailwind `red-500` | `border-l-red-500/70`, `bg-red-500/10`, `text-red-500` | Urgent | Urgent priority dots, danger accent |
| Emerald | Tailwind `emerald-500` | `border-l-emerald-500/70`, `bg-emerald-500/10`, `text-emerald-500` | Good / positive status | Attendance present bar, progress bars |
| Teal (accent-brand) | `--accent-brand` | `bg-accent-brand/5`, `text-accent-brand` | AI/brand feature signals | AI nudge callouts, AI Recommendations card |

### Guidelines
- **Borders** use `/70` opacity to stay consistent with the muted dark palette.
- **Icon backgrounds** use `/10` opacity for a subtle tint.
- **Bar segments** use `/80` opacity (slightly more visible than borders since they're thicker).
- **Legend dots** stay full opacity (tiny, need to be distinguishable).
- `--primary` (mint green) is for positive status signals (progress bars, on-track borders).
- `--accent-brand` (muted teal) is for AI/brand feature signals (AI nudge callouts, AI Recommendations card).
- Do NOT use `--primary` for AI features or `--accent-brand` for status — keep them separate.
- A `HelpCircle` icon with a `title` tooltip next to the stat cards row explains the color meanings to users.
