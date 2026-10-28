import { create } from "zustand";

const GROUPS_STORAGE_KEY = "slph-sidebar-groups";

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  collapsedGroups: Record<string, boolean>;
  _hasHydrated: boolean;
  hydrate: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleGroup: (label: string) => void;
  setGroupOpen: (label: string, open: boolean) => void;
}

function loadCollapsedGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveCollapsedGroups(groups: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Silently fail
  }
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  collapsedGroups: {},
  _hasHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    set({ collapsedGroups: loadCollapsedGroups(), _hasHydrated: true });
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleGroup: (label) =>
    set((state) => {
      const updated = { ...state.collapsedGroups, [label]: !state.collapsedGroups[label] };
      saveCollapsedGroups(updated);
      return { collapsedGroups: updated };
    }),
  setGroupOpen: (label, open) =>
    set((state) => {
      // open=true means expanded (not collapsed), so collapsedGroups[label] = !open
      const updated = { ...state.collapsedGroups, [label]: !open };
      saveCollapsedGroups(updated);
      return { collapsedGroups: updated };
    }),
}));
