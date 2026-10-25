"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle, CalendarClock, Plus, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { AttendanceRecord } from "@/types";

const statusConfig: Record<string, { color: string; label: string }> = {
  present: { color: "bg-emerald-500", label: "Present" },
  late: { color: "bg-amber-500", label: "Late" },
  absent: { color: "bg-red-500", label: "Absent" },
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [attForm, setAttForm] = useState({ subjectCode: "", date: "", status: "present" });

  useEffect(() => {
    fetchRecords();
  }, []);

  // Reset form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingRecord) {
        setAttForm({
          subjectCode: editingRecord.subject_code || "",
          date: editingRecord.date || "",
          status: editingRecord.status || "present",
        });
      } else {
        setAttForm({ subjectCode: "", date: "", status: "present" });
      }
    }
  }, [showForm, editingRecord]);

  const fetchRecords = async () => {
    try {
      const result = await api.get<AttendanceRecord[]>("/attendance");
      if (result.error) {
        console.error("Attendance error:", result.error);
        toast.error(`Failed to load attendance: ${result.error}`);
      } else {
        const recordsData = result.data || [];
        setRecords(recordsData.sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      toast.error("Failed to load attendance. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!attForm.subjectCode || !attForm.date) { toast.error("Please enter subject code and date"); return; }
    setSaving(true);

    if (editingRecord) {
      const result = await api.put(`/attendance/${editingRecord.id}`, {
        subject_code: attForm.subjectCode, date: attForm.date, status: attForm.status,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Record updated!");
        setShowForm(false);
        setEditingRecord(null);
        fetchRecords();
      }
    } else {
      const result = await api.post("/attendance", {
        subject_code: attForm.subjectCode, date: attForm.date, status: attForm.status,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Attendance recorded!");
        setShowForm(false);
        fetchRecords();
      }
    }
    setSaving(false);
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Delete this attendance record?")) return;
    const result = await api.delete(`/attendance/${id}`);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Record deleted");
      fetchRecords();
    }
  };

  const totalClasses = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  const subjectMap = records.reduce((acc: Record<string, AttendanceRecord[]>, r) => {
    const key = r.subject_code || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const subjectStats = Object.entries(subjectMap).map(([code, recs]) => {
    const present = recs.filter((r) => r.status === "present").length;
    const late = recs.filter((r) => r.status === "late").length;
    const absent = recs.filter((r) => r.status === "absent").length;
    const total = recs.length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { code, present, late, absent, total, percentage };
  });

  const atRisk = subjectStats.find((s) => s.percentage < 80);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <PageHeader
        title="Attendance Tracker"
        description="Monitor your attendance across all subjects and get risk alerts."
        action={
          <Button size="sm" onClick={() => { setEditingRecord(null); setShowForm(!showForm); }}>
            <Plus className="size-4" />
            Record Attendance
          </Button>
        }
      />

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{editingRecord ? "Edit Attendance" : "Record Attendance"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject Code</Label>
                    <Input value={attForm.subjectCode} onChange={(e) => setAttForm({ ...attForm, subjectCode: e.target.value })} placeholder="e.g. CS 210" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={handleAddRecord} disabled={saving}>{saving ? "Saving..." : editingRecord ? "Update" : "Record"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Alert */}
      {atRisk && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Attendance Risk Warning</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your attendance in <strong>{atRisk.code}</strong> is at {atRisk.percentage}%.
              You are approaching the institutional limit of 70%.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards - only show when data exists */}
      {totalClasses > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Classes" value={totalClasses} icon={CheckCircle2} />
          <StatCard label="Present" value={presentCount} icon={CheckCircle2} trend={{ value: `${Math.round((presentCount / totalClasses) * 100)}%`, positive: true }} />
          <StatCard label="Late" value={lateCount} icon={Clock} trend={{ value: `${Math.round((lateCount / totalClasses) * 100)}%`, positive: false }} />
          <StatCard label="Absent" value={absentCount} icon={XCircle} trend={{ value: `${Math.round((absentCount / totalClasses) * 100)}%`, positive: false }} />
        </div>
      )}

      {totalClasses === 0 && (
        <EmptyState icon={CalendarClock} title="No attendance records yet" description="Start tracking your class attendance to see your stats here." />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per-subject attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectStats.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No attendance records" description="Track your class attendance to see stats here." className="py-6" />
            ) : (
              subjectStats.map((s) => (
                <div key={s.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.code}</span>
                    <span className={`text-sm font-semibold tabular-nums ${s.percentage < 80 ? "text-destructive" : "text-primary"}`}>
                      {s.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      className={`h-full rounded-full ${s.percentage < 80 ? "bg-destructive" : "bg-primary"}`}
                    />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{s.present} present</span>
                    <span>{s.late} late</span>
                    <span>{s.absent} absent</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {records.length === 0 ? (
              <EmptyState icon={Clock} title="No records yet" description="Your attendance history will appear here." className="py-6" />
            ) : (
              records.slice(0, 10).map((r, i) => {
                const config = statusConfig[r.status] || statusConfig.present;
                return (
                  <div key={r.id || i} className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/30">
                    <div className={`size-2 rounded-full ${config.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.subject_code || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => handleEditRecord(r)} className="text-muted-foreground hover:text-primary" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => handleDeleteRecord(r.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
