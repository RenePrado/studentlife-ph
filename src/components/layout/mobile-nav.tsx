"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, CheckSquare, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/ai-study-planner", label: "AI", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/80 backdrop-blur-md lg:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
