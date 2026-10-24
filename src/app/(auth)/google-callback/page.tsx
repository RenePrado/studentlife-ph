"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { authApi, tokenManager } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    if (!accessToken || !refreshToken) {
      setError("No token received from Google sign-in.");
      toast.error("Google sign-in failed: no token returned.");
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }

    (async () => {
      tokenManager.setTokens(accessToken, refreshToken);
      const result = await authApi.getMe();
      if (result.data?.user) {
        setUser(result.data.user);
        toast.success("Signed in with Google!");
        // Strip the tokens from the URL before landing on the dashboard.
        router.replace("/dashboard");
      } else {
        tokenManager.clearTokens();
        setError("Failed to fetch your profile. Please sign in again.");
        toast.error("Google sign-in failed. Please try again.");
        setTimeout(() => router.replace("/login"), 1500);
      }
    })();
  }, [searchParams, router, setUser]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <GraduationCap className="size-6" />
          </motion.div>
          <h1 className="text-lg font-semibold tracking-tight">Completing sign in</h1>
          <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
        </>
      )}
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <GoogleCallbackHandler />
    </Suspense>
  );
}
