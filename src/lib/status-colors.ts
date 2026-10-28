/**
 * Shared status color system for dashboard cards.
 *
 * Color semantics:
 * - info (primary/mint): on track, actionable today
 * - warning (amber): attention needed
 * - danger (red): urgent
 * - positive (emerald): good / completed
 *
 * Borders use /70 opacity to stay consistent with the muted dark palette.
 * Icon backgrounds use /10 opacity for a subtle tint.
 */
export const statusColors = {
  info: {
    border: "border-l-2 border-l-primary/70",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    label: "On track",
  },
  warning: {
    border: "border-l-2 border-l-amber-500/70",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    label: "Attention",
  },
  danger: {
    border: "border-l-2 border-l-red-500/70",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    label: "Urgent",
  },
  positive: {
    border: "border-l-2 border-l-emerald-500/70",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    label: "Good",
  },
  default: {
    border: "",
    iconBg: "",
    iconColor: "text-muted-foreground/60",
    label: "",
  },
} as const;

export type StatusAccent = keyof typeof statusColors;
