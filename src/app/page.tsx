import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  CheckSquare,
  Wallet,
  Bot,
  CalendarDays,
  Timer,
  Layers,
  FileText,
  Briefcase,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Sparkles,
    title: "AI Study Planner",
    description: "Get personalized study schedules based on exam dates and available hours.",
  },
  {
    icon: BookOpen,
    title: "Academic Planner",
    description: "Manage subjects, schedules, professors, and track your GPA in one place.",
  },
  {
    icon: CheckSquare,
    title: "Task Manager",
    description: "Organize tasks with priorities, due dates, and progress tracking.",
  },
  {
    icon: Wallet,
    title: "Budget Tracker",
    description: "Monitor allowance and expenses with AI-powered budgeting advice.",
  },
  {
    icon: Bot,
    title: "AI Career Assistant",
    description: "Get career guidance, interview prep, and resume feedback from AI.",
  },
  {
    icon: FileText,
    title: "AI Notes Assistant",
    description: "Upload lecture notes and get summaries, key concepts, and reviewers.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "AI-generated flashcards with spaced repetition for effective review.",
  },
  {
    icon: Timer,
    title: "Pomodoro Timer",
    description: "Stay focused with structured work and break intervals.",
  },
  {
    icon: Briefcase,
    title: "Internship Tracker",
    description: "Track OJT applications, interviews, and company details.",
  },
];

const stats = [
  { label: "Features", value: "18+" },
  { label: "AI-Powered", value: "5" },
  { label: "Built for", value: "Filipino Students" },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              StudentLife <span className="text-primary">PH</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Log in
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-36">
          <Badge variant="secondary" className="mb-6 gap-1.5 border-border">
            <Sparkles className="size-3 text-primary" />
            Powered by Google Gemini AI
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Study smarter. Stay organized.{" "}
            <span className="text-primary">Succeed with AI.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
            The all-in-one productivity platform for Filipino students. Plan your
            semester, track tasks, manage your budget, and get AI-powered study
            assistance — all in one place.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Get Started Free
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Log in
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to succeed
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            18+ features designed specifically for the Filipino student experience.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col items-start gap-3 bg-card p-6 transition-colors hover:bg-muted/30"
            >
              <feature.icon className="size-5 text-primary" />
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-lg border border-border p-12 text-center">
          <CalendarDays className="size-8 text-primary" />
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight">
            Ready to take control of your academic life?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Join StudentLife PH today and experience the future of student
            productivity. It&apos;s free to get started.
          </p>
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Create your account
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-3.5" />
            </div>
            <span className="text-sm font-medium">
              StudentLife <span className="text-primary">PH</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for Filipino students. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
