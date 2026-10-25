"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, CheckSquare, Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Task } from "@/types";

const priorityDots: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

const columnsConfig = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formStatus, setFormStatus] = useState("todo");
  const [filter, setFilter] = useState("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "" });

  useEffect(() => {
    fetchTasks();
  }, []);

  // Reset form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingTask) {
        setForm({
          title: editingTask.title || "",
          description: editingTask.description || "",
          priority: editingTask.priority || "medium",
          dueDate: editingTask.due_date?.split("T")[0] || "",
        });
        setFormStatus(editingTask.status || "todo");
      } else {
        setForm({ title: "", description: "", priority: "medium", dueDate: "" });
      }
    }
  }, [showForm, editingTask]);

  const fetchTasks = async () => {
    try {
      const result = await api.get<Task[]>("/tasks");
      if (result.error) {
        console.error("Tasks error:", result.error);
        toast.error(`Failed to load tasks: ${result.error}`);
      } else {
        const tasksData = result.data || [];
        setTasks(tasksData.sort((a: Task, b: Task) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }));
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!form.title) { toast.error("Please enter a task title"); return; }
    setSaving(true);

    if (editingTask) {
      const result = await api.put(`/tasks/${editingTask.id}`, {
        title: form.title, description: form.description, priority: form.priority,
        due_date: form.dueDate || null, status: formStatus,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task updated!");
        setShowForm(false);
        setEditingTask(null);
        fetchTasks();
      }
    } else {
      const result = await api.post("/tasks", {
        title: form.title, description: form.description, priority: form.priority,
        due_date: form.dueDate || null, status: formStatus,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task added!");
        setShowForm(false);
        fetchTasks();
      }
    }
    setSaving(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    const result = await api.delete(`/tasks/${id}`);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task deleted");
      fetchTasks();
    }
  };

  const handleStatusChange = async (id: string, direction: "left" | "right", currentStatus: string) => {
    const statuses = ["todo", "in-progress", "done"];
    const idx = statuses.indexOf(currentStatus || "todo");
    const newIdx = direction === "left" ? Math.max(0, idx - 1) : Math.min(statuses.length - 1, idx + 1);
    if (newIdx === idx) return;
    const result = await api.put(`/tasks/${id}`, { status: statuses[newIdx] });
    if (result.error) {
      toast.error(result.error);
    } else {
      fetchTasks();
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormStatus(task.status || "todo");
    setShowForm(true);
  };

  const filteredTasks = (() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    switch (filter) {
      case "today": return tasks.filter((t) => t.due_date && t.due_date.split("T")[0] === todayStr);
      case "week": return tasks.filter((t) => t.due_date && t.due_date.split("T")[0] <= weekEndStr && t.due_date.split("T")[0] >= todayStr);
      case "overdue": return tasks.filter((t) => t.due_date && t.due_date.split("T")[0] < todayStr && (t.status || "todo") !== "done");
      default: return tasks;
    }
  })();

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Task Manager"
        description="Organize your tasks with priorities, due dates, and progress tracking."
        action={
          <Button size="sm" onClick={() => { setFormStatus("todo"); setEditingTask(null); setShowForm(!showForm); }}>
            <Plus className="size-4" />
            Add Task
          </Button>
        }
      />

      {/* Task Form */}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{editingTask ? "Edit Task" : "Add New Task"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddTask} disabled={saving}>{saving ? "Saving..." : editingTask ? "Update Task" : "Add Task"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingTask(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Tabs defaultValue="all" onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="today">Due Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columnsConfig.map((col, ci) => {
          const colTasks = filteredTasks.filter((t) => (t.status || "todo") === col.id);
          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: ci * 0.08 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{col.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group rounded-md border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <div className="flex items-center gap-1">
                        <div className={`mt-1 size-2 shrink-0 rounded-full ${priorityDots[task.priority] || "bg-amber-500"}`} />
                        <button
                          onClick={() => handleEditTask(task)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, "left", task.status)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          title="Move left"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, "right", task.status)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          title="Move right"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.priority && (
                        <>
                          <span>·</span>
                          <span>{task.priority}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <EmptyState icon={CheckSquare} title="No tasks here" className="p-6" />
                )}
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={() => { setFormStatus(col.id); setEditingTask(null); setShowForm(true); }}>
                  <Plus className="size-3.5" />
                  Add task
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
