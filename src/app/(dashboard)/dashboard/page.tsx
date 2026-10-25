"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckSquare,
  Wallet,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { pluralize } from "@/lib/pluralize";
import type { Subject, Task, Expense, AttendanceRecord, User } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mt-3 flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
    >
      {label}
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function EmptyInline({
  icon: Icon,
  message,
  ctaLabel,
  ctaHref,
}: {
  icon: typeof BookOpen;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon className="size-5 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          {ctaLabel}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const [subjectsRes, tasksRes, expensesRes, profileRes, attendanceRes] = await Promise.all([
          api.get<Subject[]>("/subjects"),
          api.get<Task[]>("/tasks"),
          api.get<Expense[]>("/expenses"),
          api.get<User>("/profiles"),
          api.get<AttendanceRecord[]>("/attendance"),
        ]);

        setSubjects(subjectsRes.data || []);
        const tasksData = tasksRes.data || [];
        setTasks(tasksData.sort((a: Task, b: Task) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }));
        const expensesData = expensesRes.data || [];
        setExpenses(expensesData.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setProfile(profileRes.data || null);
        setAttendance(attendanceRes.data || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  // Fetch AI nudge in a separate effect — runs once after data loads,
  // not on every user object change.
  useEffect(() => {
    if (!user?.id || tasks.length === 0 && subjects.length === 0 && expenses.length === 0 && attendance.length === 0) return;
    if (nudge) return; // already fetched this session

    const pending = tasks.filter((t) => t.status !== "done").length;
    const dueSoon = tasks.filter((t) => t.due_date && t.status !== "done").length;
    const present = attendance.filter((a) => a.status === "present").length;
    const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthSpend = expenses
      .filter((e) => new Date(e.date) >= monthStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Give me one short nudge for today.",
        type: "dashboard-nudge",
        context: `Pending tasks: ${pending}. Due soon: ${dueSoon}. Attendance rate: ${attRate ?? "no data"}. Spent this month: ₱${monthSpend}. Subjects: ${subjects.length}.`,
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.response) setNudge(d.response.trim()); })
      .catch(() => { /* nudge is non-critical */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tasks, subjects, expenses, attendance]);

  const firstName = profile?.full_name?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Student";
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;
  const dueSoonCount = tasks.filter((t) => t.due_date && t.status !== "done").length;

  // This month expenses (calendar month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter((e) => new Date(e.date) >= monthStart);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
  const isSparseAttendance = attendance.length > 0 && attendance.length <= 2;

  const upcomingTasks = tasks.filter((t) => t.status !== "done");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description="Here's what's happening with your academic life today."
          action={
            <Button size="sm" nativeButton={false} render={<Link href="/ai-study-planner" />}>
              <Sparkles className="size-4" />
              Get AI Study Plan
            </Button>
          }
        />
      </motion.div>

      {/* AI Nudge */}
      {nudge && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2.5 rounded-lg border border-l-accent-brand/70 bg-accent-brand/5 px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-accent-brand" />
            <p className="text-sm text-accent-brand">{nudge}</p>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Pending Tasks"
            value={pendingTasks}
            icon={CheckSquare}
            accent={pendingTasks > 0 ? "warning" : "default"}
            trend={dueSoonCount > 0 ? { value: `${pluralize(dueSoonCount, "task")} due soon`, positive: false } : undefined}
          />
          <StatCard label="Completed Tasks" value={doneCount} icon={CheckCircle2} accent="positive" />
          <StatCard label="Total Subjects" value={subjects.length} icon={BookOpen} />
          <StatCard label="Spent This Month" value={`₱${monthTotal.toLocaleString()}`} icon={Wallet} />
        </div>
      </motion.div>

      {/* Row 1: Schedule + Deadlines */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <EmptyInline
                  icon={BookOpen}
                  message="No subjects yet."
                  ctaLabel="Add subjects"
                  ctaHref="/planner"
                />
              ) : (
                <>
                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
                    {subjects.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-md border border-border p-2.5 transition-colors hover:bg-muted/30"
                      >
                        <span className="w-14 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{item.code}</span>
                        <div className="h-8 w-0.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.room || "No room"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {subjects.length > 6 && <ViewAllLink href="/planner" label="View all subjects" />}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 className="size-5 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">All caught up — no pending tasks.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
                    {upcomingTasks.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-md border border-border p-2.5 transition-colors hover:bg-muted/30"
                      >
                        <div className={`size-2 shrink-0 rounded-full ${item.priority === "urgent" ? "bg-red-500" : item.priority === "high" ? "bg-orange-500" : item.priority === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-xs capitalize text-muted-foreground">{item.priority || "medium"}</p>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {upcomingTasks.length > 5 && <ViewAllLink href="/tasks" label="View all tasks" />}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Progress + Attendance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assignment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <EmptyInline
                  icon={CheckSquare}
                  message="No tasks yet."
                  ctaLabel="Add tasks"
                  ctaHref="/tasks"
                />
              ) : (
                <>
                  <div className="max-h-[280px] space-y-3 overflow-y-auto">
                    {tasks.map((item) => {
                      const progress = item.status === "done" ? 100 : item.status === "in-progress" ? 50 : 0;
                      return (
                        <div key={item.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium">{item.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{progress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                              className="h-full rounded-full bg-primary"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {tasks.length > 0 && tasks.length <= 5 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {doneCount} of {tasks.length} completed
                    </p>
                  )}
                  {tasks.length > 5 && <ViewAllLink href="/tasks" label="View all tasks" />}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <EmptyInline
                  icon={CalendarClock}
                  message="No attendance records yet."
                  ctaLabel="Track attendance"
                  ctaHref="/attendance"
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      {isSparseAttendance && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                          Not enough data
                          <span title={`Based on ${pluralize(attendance.length, "record")} — more data needed for accuracy`}>
                            <Info className="size-2.5" />
                          </span>
                        </span>
                      )}
                      <span className={`tabular-nums ${isSparseAttendance ? "text-lg font-medium text-muted-foreground/70" : "text-2xl font-semibold"}`}>
                        {attendanceRate}%
                      </span>
                      <span className="text-xs text-muted-foreground">attendance rate</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{pluralize(attendance.length, "session")}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    {presentCount > 0 && <div className="bg-emerald-500/80" style={{ width: `${(presentCount / attendance.length) * 100}%` }} />}
                    {lateCount > 0 && <div className="bg-amber-500/80" style={{ width: `${(lateCount / attendance.length) * 100}%` }} />}
                    {absentCount > 0 && <div className="bg-red-500/80" style={{ width: `${(absentCount / attendance.length) * 100}%` }} />}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {pluralize(presentCount, "present")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      {pluralize(lateCount, "late")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-red-500" />
                      {pluralize(absentCount, "absent")}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Expenses + AI Recommendations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <EmptyInline
                  icon={Wallet}
                  message="No expenses recorded yet."
                  ctaLabel="Record expense"
                  ctaHref="/budget"
                />
              ) : (
                <>
                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
                    {expenses.slice(0, 10).map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 rounded-md border border-border p-2.5 transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{exp.category}</p>
                          <p className="truncate text-xs text-muted-foreground">{exp.description || "No description"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums">₱{Number(exp.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground/80">
                            {exp.date ? new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {expenses.length > 5 && <ViewAllLink href="/budget" label="View all expenses" />}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Priority Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.slice(0, 2).map((task, i) => (
                  <div
                    key={task.id}
                    className={`rounded-md p-3 ${i === 0 ? "bg-muted/30" : "border border-border"}`}
                  >
                    <p className="text-sm font-medium">
                      {i === 0 ? "Focus on " : ""}{task.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.due_date
                        ? `Due ${new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                        : "No due date set."}
                      {i === 0 ? " Prioritize this today." : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyInline
                  icon={CheckSquare}
                  message="No pending tasks."
                  ctaLabel="Add tasks"
                  ctaHref="/tasks"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
