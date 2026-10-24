import { GraduationCap, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <GraduationCap className="size-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            StudentLife <span className="opacity-70">PH</span>
          </span>
        </div>
        <div className="relative space-y-6">
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium w-fit">
            <Sparkles className="size-3" />
            Powered by Google Gemini AI
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Study smarter.<br />
            Stay organized.<br />
            Succeed with AI.
          </h1>
          <p className="max-w-sm text-sm text-primary-foreground/70">
            The all-in-one productivity platform designed specifically for
            Filipino students. Manage your academic life from a single dashboard.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-xl font-semibold">18+</div>
              <div className="text-xs text-primary-foreground/60">Features</div>
            </div>
            <div>
              <div className="text-xl font-semibold">5</div>
              <div className="text-xs text-primary-foreground/60">AI Tools</div>
            </div>
            <div>
              <div className="text-xl font-semibold">Free</div>
              <div className="text-xs text-primary-foreground/60">To start</div>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-primary-foreground/50">
          &copy; 2025 StudentLife PH. Built for Filipino students.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-background p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              StudentLife <span className="text-primary">PH</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
