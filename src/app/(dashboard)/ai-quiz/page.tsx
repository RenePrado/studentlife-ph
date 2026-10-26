"use client";

import { useState } from "react";
import { Sparkles, HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuizQuestion {
  id: number;
  type: "Multiple Choice" | "True or False" | "Identification";
  question: string;
  options?: string[];
  correct: number | string;
  explanation: string;
}

export default function AIQuizPage() {
  const [stage, setStage] = useState<"setup" | "quiz" | "results">("setup");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizForm, setQuizForm] = useState({ topic: "", count: "10" });

  const question = quizQuestions[currentQ];
  const score = Object.entries(answers).filter(([id, ans]) => {
    const q = quizQuestions.find((q) => q.id === Number(id));
    if (!q) return false;
    if (typeof q.correct === "number") return ans === q.correct;
    return String(ans).toLowerCase().trim() === String(q.correct).toLowerCase().trim();
  }).length;

  const handleGenerate = async () => {
    if (!quizForm.topic) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate ${quizForm.count || 10} quiz questions about ${quizForm.topic}. Include a mix of multiple choice, true or false, and identification questions.`,
          type: "quiz",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = JSON.parse(data.response);
      setQuizQuestions(parsed.questions);
      setStage("quiz");
      toast.success("Quiz generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: number | string) => {
    setAnswers({ ...answers, [question.id]: answer });
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
      setShowExplanation(false);
    } else {
      setStage("results");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Quiz Generator"
        description="Generate quizzes from your notes and test your understanding."
      />

      <AnimatePresence mode="wait">
      {stage === "setup" && (
        <motion.div
          key="setup"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Quiz Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Topic / Subject</Label>
                <Input value={quizForm.topic} onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })} placeholder="e.g. Data Structures" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number of Questions</Label>
                <Input type="number" value={quizForm.count} onChange={(e) => setQuizForm({ ...quizForm, count: e.target.value })} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Question Types</Label>
              <div className="flex flex-wrap gap-2">
                {["Multiple Choice", "True or False", "Identification"].map((type) => (
                  <label key={type} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs">
                    <input type="checkbox" defaultChecked className="accent-primary" />
                    {type}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate} size="sm" disabled={loading}>
              <Sparkles className="size-4" />
              {loading ? "Generating..." : "Generate Quiz"}
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {stage === "quiz" && question && (
        <motion.div
          key="quiz"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Question {currentQ + 1} of {quizQuestions.length}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{question.type}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base font-medium">{question.question}</p>

            {/* Multiple Choice / True-False */}
            {(question.type === "Multiple Choice" || question.type === "True or False") && question.options && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isSelected = answers[question.id] === i;
                  const isCorrect = i === question.correct;
                  const showResult = showExplanation;
                  return (
                    <button
                      key={i}
                      onClick={() => !showExplanation && handleAnswer(i)}
                      disabled={showExplanation}
                      className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-all ${
                        showResult && isCorrect
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : showResult && isSelected && !isCorrect
                          ? "border-red-500/50 bg-red-500/5"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      {opt}
                      {showResult && isCorrect && <CheckCircle2 className="size-4 text-emerald-600" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="size-4 text-red-600" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Identification */}
            {question.type === "Identification" && (
              <div className="space-y-2">
                <Input
                  placeholder="Type your answer..."
                  className="h-8 text-sm"
                  disabled={showExplanation}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAnswer((e.target as HTMLInputElement).value);
                  }}
                />
                {!showExplanation && (
                  <Button size="sm" onClick={() => {
                    const input = document.querySelector("input[placeholder='Type your answer...']") as HTMLInputElement;
                    if (input?.value) handleAnswer(input.value);
                  }}>
                    Submit Answer
                  </Button>
                )}
                {showExplanation && (
                  <div className="rounded-md border border-border p-3 text-sm">
                    <span className="text-muted-foreground">Correct Answer: </span>
                    <span className="font-medium text-emerald-600">{question.correct}</span>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {showExplanation && (
              <div className="rounded-md bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">Explanation</p>
                <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
              </div>
            )}

            {showExplanation && (
              <Button onClick={nextQuestion} size="sm">
                {currentQ < quizQuestions.length - 1 ? "Next Question" : "View Results"}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}

      {stage === "results" && (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Card className="border-primary/20">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-3xl font-semibold text-primary">{score}/{quizQuestions.length}</span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {score === quizQuestions.length ? "Perfect!" : score >= quizQuestions.length / 2 ? "Good job!" : "Keep studying!"}
                </p>
                <p className="text-xs text-muted-foreground">
                  You scored {Math.round((score / quizQuestions.length) * 100)}%
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStage("setup"); setCurrentQ(0); setAnswers({}); setShowExplanation(false); setQuizQuestions([]); }}>
                  <RotateCcw className="size-4" />
                  New Quiz
                </Button>
                <Button size="sm" onClick={() => { setStage("quiz"); setCurrentQ(0); setAnswers({}); setShowExplanation(false); }}>
                  <RotateCcw className="size-4" />
                  Retry Quiz
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Answer Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quizQuestions.map((q, i) => {
                const userAnswer = answers[q.id];
                const isCorrect = typeof q.correct === "number"
                  ? userAnswer === q.correct
                  : String(userAnswer).toLowerCase().trim() === String(q.correct).toLowerCase().trim();
                return (
                  <div key={q.id} className={`rounded-md border p-3 ${isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                    <div className="flex items-start gap-2.5">
                      {isCorrect ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-600" /> : <XCircle className="mt-0.5 size-3.5 text-red-600" />}
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-medium">{i + 1}. {q.question}</p>
                        <p className="text-[10px] text-muted-foreground">Correct: {typeof q.correct === "number" && q.options ? q.options[q.correct] : q.correct}</p>
                        {!isCorrect && userAnswer !== undefined && (
                          <p className="text-[10px] text-red-600">Your answer: {typeof userAnswer === "number" && q.options ? q.options[userAnswer] : userAnswer}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
