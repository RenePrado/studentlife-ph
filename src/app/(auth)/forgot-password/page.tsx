"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(email);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSent(true);
      setDevResetUrl(result.data?.devResetUrl ?? null);
      if (result.data?.devResetUrl) {
        toast.success("Reset link generated (dev mode). See below.");
      } else {
        toast.success("Reset link sent to your email");
      }
    } catch (err) {
      toast.error("Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Forgot Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 rounded-lg border border-border p-6 text-center">
          {devResetUrl ? (
            <>
              <p className="text-sm text-muted-foreground">
                <strong>Dev mode:</strong> no email server is configured. Use the link below to reset your password.
              </p>
              <Link href={devResetUrl}>
                <Button className="w-full">
                  <ArrowRight className="size-4" />
                  Open reset link
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Check your inbox and follow the instructions to reset your password.
            </p>
          )}
          <Link href="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="size-4" />
              Back to login
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleReset(); }}
              />
            </div>
          </div>

          <Button className="w-full" onClick={handleReset} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </motion.div>
  );
}
