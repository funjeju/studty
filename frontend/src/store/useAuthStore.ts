"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppUser } from "@/lib/auth";

interface AuthState {
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: "ebs-auth-store" }
  )
);
