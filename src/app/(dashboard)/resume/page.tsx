"use client";

import { useEffect, useState } from "react";
import { Plus, FileUser, Sparkles, Briefcase, GraduationCap, Wrench, FolderGit2, Trash2 } from "lucide-react";
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
import type { ExperienceEntry, ProjectEntry, SkillEntry, User } from "@/types";

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState("edit");
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showProjForm, setShowProjForm] = useState(false);
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [showEduForm, setShowEduForm] = useState(false);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingExp, setSavingExp] = useState(false);
  const [savingProj, setSavingProj] = useState(false);
  const [savingEdu, setSavingEdu] = useState(false);
  const [personalForm, setPersonalForm] = useState({ fullName: "", phone: "", location: "", bio: "" });
  const [eduForm, setEduForm] = useState({ school: "", program: "" });
  const [expForm, setExpForm] = useState({ role: "", company: "", startDate: "", endDate: "", description: "" });
  const [projForm, setProjForm] = useState({ name: "", description: "", link: "" });
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync personal form when profile loads
  useEffect(() => {
    if (profile) {
      setPersonalForm({
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
      });
      setEduForm({
        school: profile.school || "",
        program: profile.program || "",
      });
    }
  }, [profile]);

  // Reset experience form when closing
  useEffect(() => {
    if (!showExpForm) setExpForm({ role: "", company: "", startDate: "", endDate: "", description: "" });
  }, [showExpForm]);
  useEffect(() => {
    if (!showProjForm) setProjForm({ name: "", description: "", link: "" });
  }, [showProjForm]);
  useEffect(() => {
    if (!showSkillInput) setSkillInput("");
  }, [showSkillInput]);

  const fetchProfile = async () => {
    const { data: profileData, error: profileError } = await api.get("/profiles");
    if (profileError) { console.error("Resume profile error:", profileError); toast.error(`Failed to load profile: ${profileError}`); }
    setProfile(profileData || {});

    const [expRes, projRes] = await Promise.all([
      api.get("/resume-experience"),
      api.get("/resume-projects"),
    ]);
    setExperiences(expRes.data || []);
    setProjects(projRes.data || []);

    const { data: skillData } = await api.get<SkillEntry[]>("/resume-skills");
    if (skillData) setSkills(skillData);

    setLoading(false);
  };

  const handleSaveEducation = async () => {
    setSavingEdu(true);
    const { error } = await api.put("/profiles", {
      school: eduForm.school || null,
      program: eduForm.program || null,
    });

    if (error) { toast.error(`Failed to save education: ${String(error)}`); }
    else { toast.success("Education saved"); setShowEduForm(false); fetchProfile(); }
    setSavingEdu(false);
  };

  const handleClearEducation = async () => {
    if (!window.confirm("Clear education info?")) return;
    const { error } = await api.put("/profiles", { school: null, program: null });
    if (error) { toast.error(`Failed to clear: ${String(error)}`); }
    else { toast.success("Education cleared"); fetchProfile(); }
  };

  const handleAddExperience = async () => {
    if (!expForm.role || !expForm.company) { toast.error("Please enter role and company"); return; }
    setSavingExp(true);

    const { data, error } = await api.post("/resume-experience", {
      role: expForm.role, company: expForm.company,
      start_date: expForm.startDate || null, end_date: expForm.endDate || null,
      description: expForm.description || null,
    });

    if (error) { console.error("Experience save error:", String(error)); toast.error(`Failed to save: ${String(error)}`); }
    else { toast.success("Experience added!"); setShowExpForm(false); setExperiences([...experiences, ...(data || [])]); }
    setSavingExp(false);
  };

  const handleAddProject = async () => {
    if (!projForm.name) { toast.error("Please enter project name"); return; }
    setSavingProj(true);

    const { data, error } = await api.post("/resume-projects", {
      name: projForm.name,
      description: projForm.description || null, link: projForm.link || null,
    });

    if (error) { console.error("Project save error:", String(error)); toast.error(`Failed to save: ${String(error)}`); }
    else { toast.success("Project added!"); setShowProjForm(false); setProjects([...projects, ...(data || [])]); }
    setSavingProj(false);
  };

  const handleAddSkill = async () => {
    const skill = skillInput.trim();
    if (!skill) { toast.error("Please enter a skill"); return; }
    if (skills.some((s) => s.skill === skill)) { toast.error("Skill already added"); return; }

    const { data, error } = await api.post<SkillEntry>("/resume-skills", { skill });

    if (error) { console.error("Skill save error:", String(error)); toast.error(`Failed to save skill: ${String(error)}`); }
    else if (data) { toast.success("Skill added!"); setSkills([...skills, data]); setShowSkillInput(false); }
  };

  const handleRemoveSkill = async (id: string) => {
    const { error } = await api.delete("/resume-skills/" + id);
    if (error) { toast.error(`Failed to delete: ${String(error)}`); }
    else { setSkills(skills.filter((s) => s.id !== id)); }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!window.confirm("Delete this experience entry?")) return;
    const { error } = await api.delete("/resume-experience/" + id);
    if (error) { toast.error(`Failed to delete: ${String(error)}`); }
    else { setExperiences(experiences.filter((e) => e.id !== id)); toast.success("Experience removed"); }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    const { error } = await api.delete("/resume-projects/" + id);
    if (error) { toast.error(`Failed to delete: ${String(error)}`); }
    else { setProjects(projects.filter((p) => p.id !== id)); toast.success("Project removed"); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await api.put("/profiles", {
      full_name: personalForm.fullName, phone: personalForm.phone,
      location: personalForm.location, bio: personalForm.bio,
    });

    if (error) { toast.error(`Failed to save: ${String(error)}`); }
    else { toast.success("Profile saved!"); fetchProfile(); }
    setSavingProfile(false);
  };

  const handleAiImprove = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Improve this professional summary for a resume. Make it more compelling and professional. Return only the improved text: ${personalForm.bio}`,
          type: "general",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPersonalForm({ ...personalForm, bio: data.response });
      toast.success("Summary improved!");
    } catch {
      toast.error("Failed to improve summary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestSkills = async () => {
    setAiLoading(true);
    try {
      const program = profile?.program || "Computer Science";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Suggest 5 technical skills for a ${program} student. Return as a JSON array of strings, e.g. ["Python", "React", "Git"]`,
          type: "general",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const suggested = JSON.parse(data.response);
      if (Array.isArray(suggested)) {
        const existingNames = new Set(skills.map((s) => s.skill));
        const newNames: string[] = suggested.filter((s: string) => !existingNames.has(s));
        // Persist each new skill and collect the created entries.
        const created = await Promise.all(
          newNames.map((name) => api.post<SkillEntry>("/resume-skills", { skill: name }))
        );
        const newEntries = created
          .filter((c) => c.data)
          .map((c) => c.data as SkillEntry);
        if (newEntries.length > 0) setSkills([...skills, ...newEntries]);
        toast.success(`Added ${newEntries.length} suggested skills!`);
      }
    } catch {
      toast.error("Failed to suggest skills. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const fullName = profile?.full_name || "";
  const email = profile?.email || "";
  const phone = profile?.phone || "";
  const location = profile?.location || "";
  const bio = profile?.bio || "";
  const school = profile?.school || "";
  const program = profile?.program || "";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Resume Builder"
        description="Create professional resumes with AI-powered improvements."
        action={
          <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
            <Plus className="size-4" />
            {savingProfile ? "Saving..." : "Save Resume"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Edit Mode */}
        <TabsContent value="edit" className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileUser className="size-3.5 text-primary" />
                  Personal Information
                </CardTitle>
                <Button variant="ghost" size="xs" onClick={handleAiImprove} disabled={aiLoading}>
                  <Sparkles className="size-3 text-primary" />
                  {aiLoading ? "Improving..." : "AI Improve"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={personalForm.fullName} onChange={(e) => setPersonalForm({ ...personalForm, fullName: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={email} disabled className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={personalForm.phone} onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <Input value={personalForm.location} onChange={(e) => setPersonalForm({ ...personalForm, location: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="col-span-full space-y-1.5">
                  <Label className="text-xs">Professional Summary</Label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={personalForm.bio}
                    onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GraduationCap className="size-3.5 text-primary" />
                  Education
                </CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowEduForm(!showEduForm)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {showEduForm ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">School</Label>
                      <Input value={eduForm.school} onChange={(e) => setEduForm({ ...eduForm, school: e.target.value })} placeholder="e.g. University of the Philippines" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Program</Label>
                      <Input value={eduForm.program} onChange={(e) => setEduForm({ ...eduForm, program: e.target.value })} placeholder="e.g. BS Computer Science" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEducation} disabled={savingEdu}>{savingEdu ? "Saving..." : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEduForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{school || "Add your school"}</p>
                      <p className="text-xs text-muted-foreground">{program || "Add your program"}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={handleClearEducation}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Briefcase className="size-3.5 text-primary" />
                  Experience
                </CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowExpForm(!showExpForm)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {showExpForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 rounded-md border border-primary/20 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role</Label>
                        <Input value={expForm.role} onChange={(e) => setExpForm({ ...expForm, role: e.target.value })} placeholder="e.g. Software Engineer" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Company</Label>
                        <Input value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} placeholder="e.g. Tech Corp" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Start Date</Label>
                        <Input type="month" value={expForm.startDate} onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">End Date</Label>
                        <Input type="month" value={expForm.endDate} onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="What did you do?" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddExperience} disabled={savingExp}>{savingExp ? "Adding..." : "Add"}</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowExpForm(false)}>Cancel</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {experiences.length === 0 && !showExpForm ? (
                <EmptyState icon={Briefcase} title="No experience yet" description="Click + to add your work experience." className="p-4" />
              ) : (
                experiences.map((exp) => (
                  <div key={exp.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{exp.role}</p>
                        <p className="text-xs text-muted-foreground">{exp.company}</p>
                        {exp.description && <p className="mt-1 text-xs text-muted-foreground">{exp.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDeleteExperience(exp.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wrench className="size-3.5 text-primary" />
                  Skills
                </CardTitle>
                <Button variant="ghost" size="xs" onClick={handleSuggestSkills} disabled={aiLoading}>
                  <Sparkles className="size-3 text-primary" />
                  {aiLoading ? "Suggesting..." : "Suggest Skills"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="gap-1 text-xs">
                    {skill.skill}
                    <button onClick={() => handleRemoveSkill(skill.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
                <AnimatePresence>
                  {showSkillInput ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2"
                    >
                      <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Skill name" className="h-8 w-32 text-sm" onKeyDown={(e) => { if (e.key === "Enter") handleAddSkill(); }} />
                      <Button size="xs" onClick={handleAddSkill}>Add</Button>
                      <Button size="xs" variant="outline" onClick={() => setShowSkillInput(false)}>Cancel</Button>
                    </motion.div>
                  ) : (
                    <Button variant="outline" size="xs" onClick={() => setShowSkillInput(true)}>
                      <Plus className="size-3" />
                      Add Skill
                    </Button>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderGit2 className="size-3.5 text-primary" />
                  Projects
                </CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowProjForm(!showProjForm)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {showProjForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 rounded-md border border-primary/20 p-4"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs">Project Name</Label>
                      <Input value={projForm.name} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} placeholder="e.g. Student Portal" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <textarea value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} placeholder="What does it do?" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Link (optional)</Label>
                      <Input value={projForm.link} onChange={(e) => setProjForm({ ...projForm, link: e.target.value })} placeholder="https://github.com/..." className="h-8 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddProject} disabled={savingProj}>{savingProj ? "Adding..." : "Add"}</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowProjForm(false)}>Cancel</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {projects.length === 0 && !showProjForm ? (
                <EmptyState icon={FolderGit2} title="No projects yet" description="Click + to add a project." className="p-4" />
              ) : (
                projects.map((proj) => (
                  <div key={proj.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{proj.name}</p>
                        {proj.description && <p className="text-xs text-muted-foreground">{proj.description}</p>}
                        {proj.link && <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Project</a>}
                      </div>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDeleteProject(proj.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Mode */}
        <TabsContent value="preview">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
          <Card className="mx-auto max-w-3xl">
            <CardContent className="p-8 sm:p-10">
              {/* Resume Preview */}
              <div className="space-y-6">
                <div className="border-b border-border pb-4 text-center">
                  <h1 className="text-2xl font-semibold">{fullName || "Your Name"}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[email, phone, location].filter(Boolean).join(" · ") || "Add your contact info"}
                  </p>
                </div>

                {bio && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Professional Summary</h2>
                    <p className="text-sm leading-relaxed">{bio}</p>
                  </div>
                )}

                {(school || program) && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Education</h2>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">{school}</p>
                        <p className="text-sm">{program}</p>
                      </div>
                    </div>
                  </div>
                )}

                {experiences.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Experience</h2>
                    <div className="space-y-3">
                      {experiences.map((exp) => (
                        <div key={exp.id}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{exp.role}</p>
                            <p className="text-xs text-muted-foreground">
                              {exp.start_date ? new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                              {exp.end_date ? ` — ${new Date(exp.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : exp.start_date ? " — Present" : ""}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">{exp.company}</p>
                          {exp.description && <p className="mt-1 text-sm leading-relaxed">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projects.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Projects</h2>
                    <div className="space-y-3">
                      {projects.map((proj) => (
                        <div key={proj.id}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{proj.name}</p>
                            {proj.link && <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View</a>}
                          </div>
                          {proj.description && <p className="mt-1 text-sm leading-relaxed">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {skills.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span key={skill.id} className="rounded-md border border-border px-2 py-0.5 text-xs">{skill.skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
