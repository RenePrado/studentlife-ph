"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
