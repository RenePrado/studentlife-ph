import type { NavGroup } from "@/types";

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Calendar", href: "/calendar", icon: "CalendarDays" },
    ],
    defaultOpen: true,
  },
  {
    label: "Academics",
    items: [
      { label: "Academic Planner", href: "/planner", icon: "BookOpen" },
      { label: "Tasks", href: "/tasks", icon: "CheckSquare" },
      { label: "Attendance", href: "/attendance", icon: "ClipboardCheck" },
    ],
    defaultOpen: true,
  },
  {
    label: "AI Tools",
    items: [
      { label: "AI Study Planner", href: "/ai-study-planner", icon: "Sparkles" },
      { label: "AI Document Analyzer", href: "/ai-document-analyzer", icon: "FileText" },
      { label: "AI Quiz Generator", href: "/ai-quiz", icon: "HelpCircle" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    label: "Productivity",
    items: [
      { label: "Flashcards", href: "/flashcards", icon: "Layers" },
      { label: "Pomodoro Timer", href: "/pomodoro", icon: "Timer" },
      { label: "Notes", href: "/notes", icon: "StickyNote" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    label: "Finance",
    items: [
      { label: "Budget Tracker", href: "/budget", icon: "PieChart" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    label: "Career",
    items: [
      { label: "Resume Builder", href: "/resume", icon: "FileUser" },
      { label: "Internship Tracker", href: "/internship", icon: "Briefcase" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/profile", icon: "UserRound" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);
