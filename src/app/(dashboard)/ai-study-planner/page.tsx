"use client";

import { useState } from "react";
import { Sparkles, Clock, BookOpen, Coffee, Lightbulb, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const priorityDots: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

interface StudyPlanItem {
  day: string;
  time: string;
  subject: string;
  topic: string;
  duration: string;
  priority: "high" | "medium" | "low";
}

interface StudyPlanResponse {
  schedule: StudyPlanItem[];
  breaks: { time: string; duration: string; type: string }[];
  tips: string[];
}

export default function AIStudyPlannerPage() {
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [plannerForm, setPlannerForm] = useState({ examDate: "", subject: "", hours: "", difficulty: "Moderate" });

  const handleGenerate = async () => {
    if (!plannerForm.subject) {
      toast.error("Please enter a subject");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a study plan for ${plannerForm.subject}. Exam date: ${plannerForm.examDate || "not set"}. Available hours per day: ${plannerForm.hours || 4}. Difficulty: ${plannerForm.difficulty}.`,
          type: "study-planner",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = JSON.parse(data.response);
      setPlan(parsed);
      setGenerated(true);
      toast.success("Study plan generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Study Planner"
        description="Get personalized study schedules powered by Google Gemini AI."
      />

      {/* Input Form */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Generate Your Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Exam Date</Label>
              <Input type="date" value={plannerForm.examDate} onChange={(e) => setPlannerForm({ ...plannerForm, examDate: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input value={plannerForm.subject} onChange={(e) => setPlannerForm({ ...plannerForm, subject: e.target.value })} placeholder="e.g. Data Structures" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Available Study Hours / Day</Label>
              <Input type="number" value={plannerForm.hours} onChange={(e) => setPlannerForm({ ...plannerForm, hours: e.target.value })} placeholder="e.g. 4" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Difficulty Level</Label>
              <select value={plannerForm.difficulty} onChange={(e) => setPlannerForm({ ...plannerForm, difficulty: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Easy</option>
                <option>Moderate</option>
                <option>Hard</option>
                <option>Very Hard</option>
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} size="sm" disabled={loading}>
            <Sparkles className="size-4" />
            {loading ? "Generating..." : "Generate Study Plan"}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Study Schedule */}
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="size-3.5" />
                Your Personalized Study Schedule
              </h2>
              <div className="space-y-6">
                {[...new Set(plan?.schedule.map((s) => s.day) || [])].map((day) => (
                  <div key={day} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{day}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {plan?.schedule
                        .filter((s) => s.day === day)
                        .map((s, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-border p-3 transition-colors hover:border-primary/30"
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                                <Clock className="size-3" />
                                {s.time}
                              </span>
                              <div className={`size-2 rounded-full ${priorityDots[s.priority] || "bg-amber-500"}`} />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <BookOpen className="size-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{s.subject}</span>
                              <span className="text-[10px] text-muted-foreground">· {s.duration}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{s.topic}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Break Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Break Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {plan?.breaks.map((b, i) => (
                    <div key={i} className="rounded-md border border-border p-4 text-center">
                      <Coffee className="mx-auto size-4 text-primary" />
                      <p className="mt-2 text-sm font-medium">{b.type}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{b.time}</p>
                      <p className="mt-1 text-xs font-medium text-primary">{b.duration}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Productivity Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Productivity Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan?.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-md border border-border p-3">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <p className="text-xs">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
