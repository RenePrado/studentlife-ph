"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, FileText, BookOpen, ListChecks, FileEdit, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AINotesPage() {
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewerLoading, setReviewerLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    summary: string;
    keyConcepts: string[];
    topics: { title: string; explanation: string }[];
  } | null>(null);

  const handleFileUpload = async (file: File) => {
    const allowed = ["text/plain", "text/markdown", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(txt|md|pdf|docx?|csv)$/i)) {
      toast.error("Please upload a TXT, MD, PDF, or DOCX file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setFileName(file.name);

    if (file.type === "text/plain" || file.type === "text/markdown" || file.name.match(/\.(txt|md|csv)$/i)) {
      const text = await file.text();
      setNoteText(text);
      toast.success(`Loaded ${file.name}`);
    } else if (file.name.match(/\.pdf$/i) || file.name.match(/\.docx?$/i)) {
      toast.loading("Extracting text...", { id: "extract" });
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setNoteText(data.text);
        toast.success(`Extracted text from ${file.name}`, { id: "extract" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Extraction failed: ${msg}`, { id: "extract" });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleAnalyze = async () => {
    if (!noteText.trim()) {
      toast.error("Please upload a file or paste your notes first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze these lecture notes: ${noteText}`,
          type: "notes",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = JSON.parse(data.response);
      setResult(parsed);
      setAnalyzed(true);
      toast.success("Notes analyzed!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReviewer = async () => {
    setReviewerLoading(true);
    try {
      const promptText = noteText || "Data Structures: binary trees, BST, tree traversals, graph representations, BFS, DFS";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a comprehensive reviewer with practice questions and answers from these notes: ${promptText}`,
          type: "reviewer",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReviewer(data.response || "No reviewer generated.");
      toast.success("Reviewer generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate reviewer.");
    } finally {
      setReviewerLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result && !reviewer) return;
    const content = `
      <html><head><title>AI Notes - Study Reviewer</title></head><body>
      <h1>Lecture Summary</h1>
      <p>${result?.summary || ""}</p>
      <h2>Key Concepts</h2>
      <ul>${result?.keyConcepts?.map((c) => `<li>${c}</li>`).join("") || ""}</ul>
      <h2>Topic Explanations</h2>
      ${result?.topics?.map((t) => `<h3>${t.title}</h3><p>${t.explanation}</p>`).join("") || ""}
      ${reviewer ? `<h2>Reviewer</h2><pre style="white-space: pre-wrap;">${reviewer}</pre>` : ""}
      </body></html>`;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-notes-reviewer.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Document Analyzer"
        description="Upload documents (PDF, DOCX, TXT) and get AI-powered summaries, key concepts, and reviewers."
      />

      {/* Upload Area */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Upload Your Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center transition-colors hover:border-primary/40 ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="size-6 text-muted-foreground/50" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports TXT, MD, CSV — PDF/DOCX paste content manually</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Choose File
            </Button>
            {fileName && (
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
                <FileText className="size-3.5 text-primary" />
                <span className="font-medium">{fileName}</span>
                <button onClick={() => { setFileName(""); setNoteText(""); }} className="text-muted-foreground hover:text-destructive">
                  <X className="size-3" />
                </button>
              </div>
            )}
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Or paste your lecture notes here..."
              className="min-h-[120px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={handleAnalyze} size="sm" className="mt-2" disabled={loading}>
              <FileText className="size-4" />
              {loading ? "Analyzing..." : "Analyze Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {analyzed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Lecture Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{result?.summary || "No summary available."}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Key Concepts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Key Concepts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result?.keyConcepts?.map((concept, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-md border border-border p-3">
                      <span className="text-xs font-medium text-primary tabular-nums">{i + 1}</span>
                      <p className="text-xs">{concept}</p>
                    </div>
                  )) || <p className="py-6 text-center text-sm text-muted-foreground">No concepts extracted.</p>}
                </CardContent>
              </Card>

              {/* Topic Explanations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Topic Explanations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result?.topics.map((t, i) => (
                    <div key={i} className="space-y-1 rounded-md border border-border p-3">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.explanation}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Generate Reviewer */}
            <Card className="border-primary/20">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <FileEdit className="size-6 text-primary" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Generate a Reviewer</p>
                  <p className="text-xs text-muted-foreground">
                    Create a comprehensive reviewer from your notes with practice questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleGenerateReviewer} disabled={reviewerLoading}>
                    <Sparkles className="size-4" />
                    {reviewerLoading ? "Generating..." : "Generate Reviewer"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="size-4" />
                    Download PDF
                  </Button>
                </div>
                {reviewer && (
                  <div className="mt-4 w-full rounded-md border border-border p-4 text-left">
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{reviewer}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
