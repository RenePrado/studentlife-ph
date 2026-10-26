"use client";

import { useEffect, useState } from "react";
import { Plus, Briefcase, MapPin, Calendar, Building2, Clock, Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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
import type { InternshipApplication } from "@/types";

const statusConfig: Record<string, { dot: string; label: string; step: number }> = {
  wishlist: { dot: "bg-muted-foreground", label: "Wishlist", step: 0 },
  applied: { dot: "bg-blue-500", label: "Applied", step: 1 },
  interview: { dot: "bg-amber-500", label: "Interview", step: 2 },
  offer: { dot: "bg-emerald-500", label: "Offer", step: 3 },
  rejected: { dot: "bg-red-500", label: "Rejected", step: -1 },
  accepted: { dot: "bg-emerald-600", label: "Accepted", step: 4 },
};

const pipelineSteps = ["Applied", "Interview", "Offer"];

export default function InternshipPage() {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<InternshipApplication | null>(null);
  const [saving, setSaving] = useState(false);
  const [appForm, setAppForm] = useState({
    company: "", position: "", location: "", status: "applied",
    appliedDate: "", notes: "",
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  // Reset form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingApp) {
        setAppForm({
          company: editingApp.company || "",
          position: editingApp.position || "",
          location: editingApp.location || "",
          status: editingApp.status || "applied",
          appliedDate: editingApp.applied_date?.split("T")[0] || "",
          notes: editingApp.notes || "",
        });
      } else {
        setAppForm({ company: "", position: "", location: "", status: "applied", appliedDate: "", notes: "" });
      }
    }
  }, [showForm, editingApp]);

  const fetchApplications = async () => {
    const { data, error } = await api.get<InternshipApplication[]>("/internships");
    if (error) {
      const errorMsg = String(error);
      console.error("Internships error:", errorMsg);
      toast.error(`Failed to load applications: ${errorMsg}`);
    }
    setApplications(data || []);
    setLoading(false);
  };

  const handleAddApplication = async () => {
    if (!appForm.company || !appForm.position) { toast.error("Please enter company and position"); return; }
    setSaving(true);

    if (editingApp) {
      const { error } = await api.put("/internships/" + editingApp.id, {
        company: appForm.company, position: appForm.position,
        location: appForm.location || null, status: appForm.status,
        applied_date: appForm.appliedDate || null, notes: appForm.notes || null,
      });
      if (error) {
        const errorMsg = String(error);
        toast.error(`Failed to update: ${errorMsg}`);
      } else {
        toast.success("Application updated!");
        setShowForm(false);
        setEditingApp(null);
        fetchApplications();
      }
    } else {
      const { error } = await api.post("/internships", {
        company: appForm.company, position: appForm.position,
        location: appForm.location || null, status: appForm.status,
        applied_date: appForm.appliedDate || null, notes: appForm.notes || null,
      });
      if (error) {
        const errorMsg = String(error);
        toast.error(`Failed to save application: ${errorMsg}`);
      } else {
        toast.success("Application added!");
        setShowForm(false);
        fetchApplications();
      }
    }
    setSaving(false);
  };

  const handleEditApplication = (app: InternshipApplication) => {
    setEditingApp(app);
    setShowForm(true);
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Delete this application?")) return;
    const { error } = await api.delete("/internships/" + id);
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to delete: ${errorMsg}`);
    } else {
      toast.success("Application deleted");
      fetchApplications();
    }
  };

  const handleReviveApplication = async (id: string) => {
    const { error } = await api.put("/internships/" + id, { status: "applied" });
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to revive: ${errorMsg}`);
    } else {
      toast.success("Application moved back to Applied");
      fetchApplications();
    }
  };

  const handleStatusChange = async (id: string, direction: "left" | "right", currentStatus: string) => {
    const flow = ["applied", "interview", "offer", "accepted"];
    const idx = flow.indexOf(currentStatus);
    if (idx === -1) return;
    const newIdx = direction === "left" ? Math.max(0, idx - 1) : Math.min(flow.length - 1, idx + 1);
    if (newIdx === idx) return;
    const { error } = await api.put("/internships/" + id, { status: flow[newIdx] });
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to update status: ${errorMsg}`);
    } else {
      fetchApplications();
    }
  };

  const counts = {
    applied: applications.filter((a) => a.status === "applied").length,
    interview: applications.filter((a) => a.status === "interview").length,
    offer: applications.filter((a) => a.status === "offer").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Internship (OJT) Tracker"
        description="Monitor your internship applications and interview schedules."
        action={
          <Button size="sm" onClick={() => { setEditingApp(null); setShowForm(!showForm); }}>
            <Plus className="size-4" />
            Add Application
          </Button>
        }
      />

      {/* Application Form */}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{editingApp ? "Edit Application" : "Add New Application"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Input value={appForm.company} onChange={(e) => setAppForm({ ...appForm, company: e.target.value })} placeholder="e.g. Google" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Input value={appForm.position} onChange={(e) => setAppForm({ ...appForm, position: e.target.value })} placeholder="e.g. Software Engineer Intern" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <Input value={appForm.location} onChange={(e) => setAppForm({ ...appForm, location: e.target.value })} placeholder="e.g. Makati, PH" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select value={appForm.status} onChange={(e) => setAppForm({ ...appForm, status: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="wishlist">Wishlist</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Applied Date</Label>
                  <Input type="date" value={appForm.appliedDate} onChange={(e) => setAppForm({ ...appForm, appliedDate: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <textarea value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} placeholder="Optional notes about the application" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddApplication} disabled={saving}>{saving ? "Saving..." : editingApp ? "Update Application" : "Add Application"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingApp(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary - only show when data exists */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Applications" value={applications.length} icon={Briefcase} />
          <StatCard label="Interviews" value={counts.interview} icon={Clock} trend={{ value: counts.interview > 0 ? "Upcoming" : "None", positive: counts.interview > 0 }} />
          <StatCard label="Offers" value={counts.offer} icon={Briefcase} trend={{ value: counts.offer > 0 ? `${counts.offer} received` : "None", positive: counts.offer > 0 }} />
          <StatCard label="Rejected" value={counts.rejected} icon={Briefcase} />
        </div>
      )}

      {applications.length === 0 && (
        <EmptyState icon={Briefcase} title="No applications yet" description='Click "Add Application" to start tracking your internship journey.' />
      )}

      {/* Application Pipeline - only show when data exists */}
      {applications.length > 0 && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pipelineSteps.map((step) => {
          const stepNum = pipelineSteps.indexOf(step) + 1;
          const stepApps = applications.filter((a) => (statusConfig[a.status]?.step || 0) === stepNum);
          const config = statusConfig[step.toLowerCase() as keyof typeof statusConfig];
          return (
            <div key={step} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${config?.dot || "bg-muted"}`} />
                  <span className="text-sm font-semibold">{step}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{stepApps.length}</span>
              </div>
              <div className="space-y-2">
                {stepApps.map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Card className="group cursor-pointer transition-colors hover:border-primary/30">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Building2 className="size-4 text-primary" />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">{config?.label || step}</span>
                            <button onClick={() => handleEditApplication(app)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-primary" title="Edit">
                              <Pencil className="size-3.5" />
                            </button>
                            <button onClick={() => handleStatusChange(app.id, "left", app.status)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" title="Move left">
                              <ChevronLeft className="size-3.5" />
                            </button>
                            <button onClick={() => handleStatusChange(app.id, "right", app.status)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" title="Move right">
                              <ChevronRight className="size-3.5" />
                            </button>
                            <button onClick={() => handleDeleteApplication(app.id)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive" title="Delete">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{app.company}</p>
                          <p className="text-xs text-muted-foreground">{app.position}</p>
                        </div>
                        <div className="space-y-1 text-[10px] text-muted-foreground">
                          {app.location && (
                            <p className="flex items-center gap-1.5">
                              <MapPin className="size-3" />
                              {app.location}
                            </p>
                          )}
                          {app.applied_date && (
                            <p className="flex items-center gap-1.5">
                              <Calendar className="size-3" />
                              Applied {new Date(app.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                          {app.interview_date && (
                            <p className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                              <Clock className="size-3" />
                              Interview: {new Date(app.interview_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                        {app.notes && (
                          <p className="rounded-md border border-border p-2 text-[10px] text-muted-foreground">{app.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {stepApps.length === 0 && (
                  <EmptyState icon={Briefcase} title="No applications" className="p-6" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Rejected Section */}
      {counts.rejected > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="size-3.5 text-muted-foreground" />
              Rejected Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {applications.filter((a) => a.status === "rejected").map((app) => (
              <div key={app.id} className="group flex items-center justify-between rounded-md border border-border p-3 opacity-60">
                <div>
                  <p className="text-sm font-medium">{app.company} — {app.position}</p>
                  {app.notes && <p className="text-[10px] text-muted-foreground">{app.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-red-500" />
                  <span className="text-[10px] text-muted-foreground">Rejected</span>
                  <button
                    onClick={() => handleReviveApplication(app.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-primary text-xs"
                    title="Move back to Applied"
                  >
                    Revive
                  </button>
                  <button onClick={() => handleDeleteApplication(app.id)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive" title="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
