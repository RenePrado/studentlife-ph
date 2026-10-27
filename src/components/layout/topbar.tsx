"use client";

import { useTheme } from "@/components/theme-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Moon, Search, Sun, LogOut, UserRound, Settings, LifeBuoy, ArrowRight } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { allNavItems } from "@/lib/nav-config";
import { resolveAvatarUrl } from "@/lib/api-client";

export function Topbar() {
  const router = useRouter();
  const { setMobileSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const lower = searchQuery.trim().toLowerCase();
      const match = allNavItems.find(
        (item) =>
          item.label.toLowerCase().includes(lower) ||
          item.href.toLowerCase().includes(lower)
      );
      if (match) {
        router.push(match.href);
        setSearchQuery("");
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allNavItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchQuery]);

  const searchRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/60 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Search */}
      <div ref={searchRef} className="relative hidden flex-1 max-w-sm sm:block">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          placeholder="Search pages..."
          className="h-8 border-transparent bg-muted/50 pl-9 text-sm focus-visible:border-border"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onKeyDown={handleSearch}
          onFocus={() => setSearchOpen(true)}
        />
        {searchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No pages found for &quot;{searchQuery}&quot;
              </p>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {item.href}
                    <ArrowRight className="size-3" />
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted">
                <Avatar className="size-7">
                  {user?.avatarUrl && <AvatarImage src={resolveAvatarUrl(user.avatarUrl)} alt={user?.fullName || "Student"} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {(user?.fullName || "S").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:block">{user?.fullName?.split(" ")[0] || "Student"}</span>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserRound className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/profile" />}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Help & Support coming soon!")}>
                <LifeBuoy className="size-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
