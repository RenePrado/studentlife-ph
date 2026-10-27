"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthListener() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return null;
}
