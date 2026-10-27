"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { statusColors, type StatusAccent } from "@/lib/status-colors";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  accent?: StatusAccent;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, accent = "default", className }: StatCardProps) {
  const styles = statusColors[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        styles.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn("flex items-center justify-center rounded-md", accent !== "default" ? cn("size-7", styles.iconBg) : "")}>
          <Icon className={cn("size-4", styles.iconColor)} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {trend ? (
        <p
          className={cn(
            "mt-auto pt-1 text-xs font-medium",
            trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
        >
          {trend.value}
        </p>
      ) : (
        <span className="mt-auto" />
      )}
    </motion.div>
  );
}
