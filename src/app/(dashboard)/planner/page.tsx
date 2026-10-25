"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, GraduationCap, Calculator, ClipboardList, FileEdit, MapPin, Calendar, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Subject, Task } from "@/types";

export default function PlannerPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ code: "", name: "", units: "", room: "", professor: "" });
  const [gradeInput, setGradeInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Reset subject form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingSubject) {
        setSubjectForm({
          code: editingSubject.code || "",
          name: editingSubject.name || "",
          units: editingSubject.units != null ? String(editingSubject.units) : "",
          room: editingSubject.room || "",
          professor: editingSubject.professor || "",
        });
      } else {
        setSubjectForm({ code: "", name: "", units: "", room: "", professor: "" });
      }
    }
  }, [showForm, editingSubject]);

  const fetchData = async () => {
    try {
      const [subjectsRes, tasksRes] = await Promise.all([
        api.get<Subject[]>("/subjects"),
        api.get<Task[]>("/tasks"),
      ]);

      if (subjectsRes.error) toast.error("Failed to load subjects");
      if (tasksRes.error) toast.error("Failed to load tasks");

      const tasksData = tasksRes.data || [];
      setSubjects(subjectsRes.data || []);
      setTasks(tasksData.sort((a: Task, b: Task) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }));
    } catch (error) {
      console.error("Failed to fetch planner data:", error);
      toast.error("Failed to load planner data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!subjectForm.code || !subjectForm.name) { toast.error("Please enter subject code and name"); return; }
    setSaving(true);

    if (editingSubject) {
      const result = await api.put(`/subjects/${editingSubject.id}`, {
        code: subjectForm.code, name: subjectForm.name,
        units: subjectForm.units ? parseFloat(subjectForm.units) : null,
        room: subjectForm.room || null, professor: subjectForm.professor || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subject updated!");
        setShowForm(false);
        setEditingSubject(null);
        fetchData();
      }
    } else {
      const result = await api.post("/subjects", {
        code: subjectForm.code, name: subjectForm.name,
        units: subjectForm.units ? parseFloat(subjectForm.units) : null,
        room: subjectForm.room || null, professor: subjectForm.professor || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subject added!");
        setShowForm(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Delete this subject? Grades will be lost.")) return;
    const result = await api.delete(`/subjects/${id}`);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subject deleted");
      fetchData();
    }
  };

  const handleSaveGrade = async (id: string) => {
    if (!gradeInput) { setEditingGrade(null); return; }
    const result = await api.put(`/subjects/${id}`, { grade: parseFloat(gradeInput) });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Grade saved");
      fetchData();
      setEditingGrade(null);
    }
  };

  const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);
  const gradedSubjects = subjects.filter((s) => s.grade != null);
  const gradedUnits = gradedSubjects.reduce((sum, s) => sum + (s.units || 0), 0);
  const gpa = gradedUnits > 0
    ? (gradedSubjects.reduce((sum, s) => sum + (s.grade || 0) * (s.units || 0), 0) / gradedUnits).toFixed(2)
    : "N/A";

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Academic Planner"
        description="Manage your semester, subjects, schedules, and grades."
        action={
          <Button size="sm" onClick={() => { setEditingSubject(null); setShowForm(!showForm); }}>
            <Plus className="size-4" />
            Add Subject
          </Button>
        }
      />

      {/* Subject Form */}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{editingSubject ? "Edit Subject" : "Add New Subject"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Code</Label>
                  <Input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="e.g. CS 210" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Name</Label>
                  <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g. Data Structures" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Units</Label>
                  <Input type="number" value={subjectForm.units} onChange={(e) => setSubjectForm({ ...subjectForm, units: e.target.value })} placeholder="e.g. 3" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Room</Label>
                  <Input value={subjectForm.room} onChange={(e) => setSubjectForm({ ...subjectForm, room: e.target.value })} placeholder="e.g. RH 201" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Professor</Label>
                  <Input value={subjectForm.professor} onChange={(e) => setSubjectForm({ ...subjectForm, professor: e.target.value })} placeholder="e.g. Prof. Cruz" className="h-8 text-sm" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddSubject} disabled={saving}>{saving ? "Saving..." : editingSubject ? "Update Subject" : "Add Subject"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingSubject(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="subjects">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="gpa">GPA</TabsTrigger>
        </TabsList>

        {/* Subjects */}
        <TabsContent value="subjects" className="mt-6">
          {subjects.length === 0 ? (
            <EmptyState icon={BookOpen} title="No subjects yet" description='Click "Add Subject" to get started.' />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject, i) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="h-full transition-colors hover:border-primary/30">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{subject.code}</p>
                          <p className="text-sm font-semibold">{subject.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {subject.units != null && (
                            <Badge variant="secondary" className="text-[10px]">{subject.units} units</Badge>
                          )}
                          <button onClick={() => handleEditSubject(subject)} className="text-muted-foreground hover:text-primary" title="Edit">
                            <Pencil className="size-3.5" />
                          </button>
                          <button onClick={() => handleDeleteSubject(subject.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {subject.professor && (
                          <p className="flex items-center gap-1.5">
                            <GraduationCap className="size-3" />
                            {subject.professor}
                          </p>
                        )}
                        {subject.room && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="size-3" />
                            {subject.room}
                          </p>
                        )}
                      </div>
                      {subject.grade != null ? (
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <span className="text-xs text-muted-foreground">Current Grade</span>
                          <span className="text-sm font-semibold text-primary">{Number(subject.grade).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="border-t border-border pt-3">
                          {editingGrade === subject.id ? (
                            <div className="flex items-center gap-2">
                              <Input type="number" step="0.01" placeholder="Enter grade" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="h-7 w-24 text-xs" autoFocus />
                              <Button size="xs" onClick={() => handleSaveGrade(subject.id)}>Save</Button>
                              <Button size="xs" variant="outline" onClick={() => setEditingGrade(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="xs" variant="outline" onClick={() => { setEditingGrade(subject.id); setGradeInput(""); }}>Add Grade</Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assignments */}
        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Assignment Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No tasks yet" description="Add some in the Task Manager." className="py-6" />
              ) : (
                tasks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.priority || "medium"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${item.status === "done" ? "bg-emerald-500" : item.status === "in-progress" ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-xs text-muted-foreground tabular-nums">{item.due_date ? new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPA */}
        <TabsContent value="gpa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">GPA Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-8">
                <p className="text-xs text-muted-foreground">Current Semester GPA</p>
                <p className="text-4xl font-semibold text-primary">{gpa}</p>
                {gpa !== "N/A" && Number(gpa) <= 1.5 && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Magna Cum Laude
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {subjects.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <p className="text-sm font-medium">{s.code} — {s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.units || 0} units</p>
                    </div>
                    {editingGrade === s.id ? (
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.01" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} placeholder="Grade" className="h-7 w-20 text-xs" autoFocus />
                        <Button size="xs" onClick={() => handleSaveGrade(s.id)}>Save</Button>
                        <Button size="xs" variant="outline" onClick={() => setEditingGrade(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{s.grade != null ? Number(s.grade).toFixed(2) : "N/A"}</span>
                        <button onClick={() => { setEditingGrade(s.id); setGradeInput(s.grade != null ? String(s.grade) : ""); }} className="text-muted-foreground hover:text-primary text-xs">
                          {s.grade != null ? "Edit" : "Add"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold">Total Units: {totalUnits}</span>
                  <span className="text-sm font-semibold text-primary">GPA: {gpa}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
