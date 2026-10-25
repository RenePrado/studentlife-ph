"use client";

import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Timer, Coffee, Brain, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { PomodoroSession, Subject } from "@/types";

const modes = [
  { id: "focus", label: "Focus", duration: 25 * 60, icon: Brain, color: "text-primary" },
  { id: "short-break", label: "Short Break", duration: 5 * 60, icon: Coffee, color: "text-emerald-600" },
  { id: "long-break", label: "Long Break", duration: 15 * 60, icon: Coffee, color: "text-blue-600" },
];

const defaultDurations: Record<string, number> = {
  focus: 25,
  "short-break": 5,
  "long-break": 15,
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PomodoroPage() {
  const [mode, setMode] = useState("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [customDurations, setCustomDurations] = useState<Record<string, number>>(defaultDurations);
  const [settingsInput, setSettingsInput] = useState(defaultDurations);

  const currentMode = modes.find((m) => m.id === mode)!;
  const currentDuration = (customDurations[mode] || defaultDurations[mode]) * 60;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await api.get<PomodoroSession[]>("/pomodoro-sessions");
    if (error) {
      const errorMsg = String(error);
      console.error("Pomodoro error:", errorMsg);
      toast.error(`Failed to load sessions: ${errorMsg}`);
    }
    setSessions(data || []);

    const today = new Date().toISOString().split("T")[0];
    const todaySessions = (data || []).filter((s: PomodoroSession) => s.session_date === today);
    setSessionsCompleted(todaySessions.length);
    setLoading(false);
  };

  const saveSession = async () => {
    const { error } = await api.post("/pomodoro-sessions", {
      duration: currentDuration,
      subject: selectedSubject || null,
      completed: true,
      session_date: new Date().toISOString().split("T")[0],
    });

    if (error) {
      const errorMsg = String(error);
      console.error("Pomodoro save error:", errorMsg);
      toast.error(`Failed to save session: ${errorMsg}`);
    }
    else fetchSessions();
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await api.get<Subject[]>("/subjects");
      if (error) {
        toast.error("Failed to load subjects for the timer.");
      }
      setSubjects(data || []);
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    // Timer reached zero — handle completion as a side effect (not inside
    // a state updater, which would double-fire in StrictMode).
    if (timeLeft <= 0) {
      setIsRunning(false);
      setTimeLeft(currentDuration);
      if (mode === "focus") {
        setSessionsCompleted((s) => s + 1);
        saveSession();
      }
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft, mode, currentDuration]);

  const switchMode = (newMode: string) => {
    setMode(newMode);
    setTimeLeft((customDurations[newMode] || defaultDurations[newMode]) * 60);
    setIsRunning(false);
  };

  const reset = () => {
    setTimeLeft(currentDuration);
    setIsRunning(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((currentDuration - timeLeft) / currentDuration) * 100;

  // Build weekly stats from sessions
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const dailyStats = weekDays.map((day, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const daySessions = sessions.filter((s) => s.session_date === dateStr);
    return { day, sessions: daySessions.length, minutes: daySessions.reduce((sum, s) => sum + (s.duration || 0), 0) };
  });

  const maxSessions = Math.max(...dailyStats.map((d) => d.sessions), 1);
  const weekTotal = dailyStats.reduce((sum, d) => sum + d.sessions, 0);
  const focusMinutes = sessions
    .filter((s) => s.session_date === today.toISOString().split("T")[0])
    .reduce((sum, s) => sum + Math.round((s.duration || 0) / 60), 0);

  // Group session history by date for the history card.
  const groupedHistory: Record<string, { sessions: number; totalMinutes: number }> = {};
  sessions.forEach((s) => {
    const dateStr = s.session_date ? new Date(s.session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    if (!groupedHistory[dateStr]) groupedHistory[dateStr] = { sessions: 0, totalMinutes: 0 };
    groupedHistory[dateStr].sessions += 1;
    groupedHistory[dateStr].totalMinutes += Math.round((s.duration || 0) / 60);
  });
  const historyList = Object.entries(groupedHistory).slice(0, 7).map(([date, data]) => ({ date, ...data }));

  const handleSaveSettings = () => {
    const newDurations: Record<string, number> = {
      focus: settingsInput.focus || 25,
      "short-break": settingsInput["short-break"] || 5,
      "long-break": settingsInput["long-break"] || 15,
    };
    setCustomDurations(newDurations);
    setTimeLeft(newDurations[mode] * 60);
    setIsRunning(false);
    toast.success("Timer settings updated!");
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-64 w-full max-w-md mx-auto rounded-lg" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pomodoro Timer"
        description="Stay focused with structured work and break intervals."
      />

      {/* Mode Tabs */}
      <div className="flex justify-center gap-2">
        {modes.map((m) => (
          <Button
            key={m.id}
            variant={mode === m.id ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode(m.id)}
          >
            <m.icon className="size-4" />
            {m.label}
          </Button>
        ))}
      </div>

      {/* Subject Selector */}
      {mode === "focus" && subjects.length > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="pomodoro-subject" className="text-xs text-muted-foreground">Subject:</Label>
            <select
              id="pomodoro-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.code ? `${s.code} — ` : ""}{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex size-56 items-center justify-center">
          <svg className="size-56 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
            <circle
              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2"
              strokeDasharray="282.7"
              strokeDashoffset={282.7 - (282.7 * progress) / 100}
              className="text-primary transition-all"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <Timer className={`size-5 mb-2 ${currentMode.color}`} />
            <span className="text-4xl font-semibold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">{currentMode.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        {/* Session count */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`size-2 rounded-full transition-colors ${
                i < sessionsCompleted % 4 || (sessionsCompleted > 0 && sessionsCompleted % 4 === 0) ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {sessionsCompleted} sessions completed today
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's Sessions" value={sessionsCompleted} icon={Timer} />
        <StatCard label="Focus Time" value={`${focusMinutes}m`} icon={Brain} trend={{ value: sessionsCompleted > 0 ? "Active" : "Idle", positive: sessionsCompleted > 0 }} />
        <StatCard label="This Week" value={weekTotal} icon={Timer} />
        <StatCard label="Total Sessions" value={sessions.length} icon={Brain} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3 pt-4" style={{ height: 140 }}>
              {dailyStats.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.sessions / maxSessions) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                      className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                    />
                  </div>
                  <span className="text-[10px] font-medium">{d.day}</span>
                  <span className="text-[10px] text-muted-foreground">{d.sessions}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Session History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyList.length === 0 ? (
              <EmptyState icon={Timer} title="No sessions yet" description="Start the timer to track your study sessions!" className="py-6" />
            ) : (
              historyList.map((s) => (
                <div key={s.date} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.date}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sessions} sessions · {s.totalMinutes} min</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{s.sessions}x</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings className="size-3.5 text-primary" />
            Timer Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Focus Duration (min)</Label>
              <Input
                type="number"
                value={settingsInput.focus}
                onChange={(e) => setSettingsInput({ ...settingsInput, focus: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Short Break (min)</Label>
              <Input
                type="number"
                value={settingsInput["short-break"]}
                onChange={(e) => setSettingsInput({ ...settingsInput, "short-break": parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Long Break (min)</Label>
              <Input
                type="number"
                value={settingsInput["long-break"]}
                onChange={(e) => setSettingsInput({ ...settingsInput, "long-break": parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button size="sm" className="mt-4" onClick={handleSaveSettings}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
