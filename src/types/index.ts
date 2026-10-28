// Domain types for StudentLife PH.
//
// These types mirror the actual backend API responses (snake_case column
// names from PostgreSQL). Interfaces without database backing are marked
// accordingly. UI-only types (NavItem/NavGroup) are kept at the bottom.

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "done";
export type AttendanceStatus = "present" | "late" | "absent";
export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "accepted";
export type EventType = "class" | "assignment" | "exam" | "personal" | "event";
export type ExpenseCategory =
  | "food"
  | "transport"
  | "school"
  | "entertainment"
  | "health"
  | "other";

// ---- DB-backed types (mirror backend route responses) ----

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  school?: string;
  program?: string;
  monthly_allowance?: number;
  created_at: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  user_id: string;
  code?: string;
  name: string;
  units?: number;
  room?: string;
  professor?: string;
  grade?: number;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  subject_code?: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  date: string;
  created_at: string;
  updated_at?: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  category?: string;
  question: string;
  answer: string;
  is_favorite?: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  duration: number;
  subject?: string;
  completed: boolean;
  session_date: string;
  created_at: string;
}

export interface InternshipApplication {
  id: string;
  user_id: string;
  company: string;
  position: string;
  location?: string;
  status: ApplicationStatus;
  applied_date?: string;
  interview_date?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ExperienceEntry {
  id: string;
  user_id: string;
  role: string;
  company: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  created_at: string;
}

export interface ProjectEntry {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  link?: string;
  created_at: string;
}

export interface SkillEntry {
  id: string;
  user_id: string;
  skill: string;
  created_at: string;
}

// ---- AI-generated response shapes (NOT persisted in the DB) ----

export interface QuizQuestion {
  id: number;
  type: "Multiple Choice" | "True or False" | "Identification";
  question: string;
  options?: string[];
  correct: number | string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject?: string;
  questions: QuizQuestion[];
  score?: number;
  completedAt?: string;
}

export interface AIConversation {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface StudyPlanItem {
  id: string;
  subject: string;
  topic: string;
  duration: number;
  date: string;
  completed: boolean;
}

// ---- UI-only types (no DB backing, used for navigation config) ----

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}
