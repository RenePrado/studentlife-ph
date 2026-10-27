"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  Sparkles,
  FileText,
  HelpCircle,
  Wallet,
  Layers,
  Timer,
  StickyNote,
  PieChart,
  FileUser,
  Briefcase,
  UserRound,
  GraduationCap,
  ChevronLeft,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/nav-config";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { resolveAvatarUrl } from "@/lib/api-client";
import { useEffect } from "react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  Sparkles,
  FileText,
  HelpCircle,
  Wallet,
  Layers,
  Timer,
  StickyNote,
  PieChart,
  FileUser,
  Briefcase,
  UserRound,
};

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuthStore();
  const initials = (user?.fullName || "S")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
        <Avatar className="size-7 shrink-0">
          {user?.avatarUrl && <AvatarImage src={resolveAvatarUrl(user.avatarUrl)} alt={user.fullName} />}
          <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-[10px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {user?.fullName || "Student"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user?.program || "No program"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function isGroupOpen(
  group: { label: string; collapsible?: boolean; defaultOpen?: boolean },
  collapsedGroups: Record<string, boolean>,
  pathname: string,
  groupItems: { href: string }[]
): boolean {
  // Non-collapsible groups are always open
  if (!group.collapsible) return true;

  // Auto-expand if current page is inside this group
  const isActive = groupItems.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  if (isActive) return true;

  // Check persisted state — collapsedGroups[label] === true means collapsed
  if (group.label in collapsedGroups) {
    return !collapsedGroups[group.label];
  }

  // Fall back to default
  return group.defaultOpen ?? false;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, collapsedGroups, toggleGroup, setGroupOpen, hydrate, _hasHydrated } = useUIStore();

  // Hydrate persisted state from localStorage after mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auto-expand group containing active page
  useEffect(() => {
    if (!_hasHydrated) return;
    navGroups.forEach((group) => {
      if (!group.collapsible) return;
      const isActive = group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      );
      if (isActive) {
        setGroupOpen(group.label, true);
      }
    });
  }, [pathname, setGroupOpen, _hasHydrated]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        sidebarCollapsed ? "w-[60px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-semibold tracking-tight text-sidebar-foreground"
            >
              StudentLife <span className="text-sidebar-primary">PH</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {/* Nav groups */}
        <div className="flex-1">
          {navGroups.map((group) => {
            const groupOpen = isGroupOpen(group, collapsedGroups, pathname, group.items);
            return (
              <div key={group.label} className="mb-3">
                {/* Group label / toggle */}
                {group.collapsible ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "mb-1 flex w-full items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    {!sidebarCollapsed && <span className="flex-1 text-left">{group.label}</span>}
                    {!sidebarCollapsed && (
                      <ChevronDown
                        className={cn(
                          "size-3 shrink-0 transition-transform duration-200",
                          groupOpen && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                ) : (
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70"
                      >
                        {group.label}
                      </motion.p>
                    )}
                  </AnimatePresence>
                )}

                {/* Items */}
                <AnimatePresence initial={false}>
                  {groupOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = iconMap[item.icon] ?? LayoutDashboard;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isActive
                                  ? "text-sidebar-foreground"
                                  : "text-muted-foreground hover:text-sidebar-foreground",
                                sidebarCollapsed && "justify-center px-2"
                              )}
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active"
                                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary"
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                              <Icon
                                className={cn(
                                  "size-4 shrink-0 transition-colors",
                                  isActive ? "text-sidebar-primary" : "text-muted-foreground/70 group-hover:text-sidebar-foreground"
                                )}
                              />
                              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Version tag footer */}
        {!sidebarCollapsed && (
          <div className="mt-auto px-3 py-2 text-[10px] text-muted-foreground/30">
            StudentLife PH v0.1.0
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground hover:text-sidebar-foreground"
        >
          <ChevronLeft
            className={cn("size-4 transition-transform", sidebarCollapsed && "rotate-180")}
          />
          {!sidebarCollapsed && <span className="ml-1.5 text-xs">Collapse</span>}
        </Button>
      </div>

      {/* User */}
      <SidebarUser collapsed={sidebarCollapsed} />
    </aside>
  );
}
