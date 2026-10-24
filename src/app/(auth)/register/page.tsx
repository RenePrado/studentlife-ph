"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, tokenManager } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

const registerSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  school: z.string().min(2, "Enter your school name"),
  program: z.string().min(2, "Enter your program"),
  terms: z.boolean().refine((v) => v, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    authApi.googleOAuth();
  };

  const onSubmit = async (data: RegisterValues) => {
    try {
      const result = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        school: data.school,
        program: data.program,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data?.user && result.data?.accessToken && result.data?.refreshToken) {
        tokenManager.setTokens(result.data.accessToken, result.data.refreshToken);
        setUser(result.data.user);
        toast.success("Account created! Welcome to StudentLife PH.");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to create account");
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
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start managing your academic life today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              placeholder="Juan Dela Cruz"
              className="pl-9"
              {...register("fullName")}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="juan@student.edu.ph"
              className="pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Input
              id="school"
              placeholder="University of the Philippines"
              {...register("school")}
            />
            {errors.school && (
              <p className="text-xs text-destructive">{errors.school.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="program">Program</Label>
            <Input
              id="program"
              placeholder="BS Computer Science"
              {...register("program")}
            />
            {errors.program && (
              <p className="text-xs text-destructive">{errors.program.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-9"
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="pl-9"
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            {...register("terms")}
            className="mt-0.5 size-4 rounded border-border accent-primary"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-destructive">{errors.terms.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={googleLoading}>
        <GraduationCap className="size-4" />
        {googleLoading ? "Connecting..." : "Continue with Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </motion.div>
  );
}
