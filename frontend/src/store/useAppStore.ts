import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Student, LearningProfile } from "@/lib/api";

interface AppState {
  student: Student | null;
  profile: LearningProfile | null;
  currentRole: "student" | "teacher" | "parent" | null;
  setStudent: (s: Student) => void;
  setProfile: (p: LearningProfile) => void;
  setRole: (r: "student" | "teacher" | "parent") => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      student: null,
      profile: null,
      currentRole: null,
      setStudent: (student) => set({ student }),
      setProfile: (profile) => set({ profile }),
      setRole: (currentRole) => set({ currentRole }),
      reset: () => set({ student: null, profile: null, currentRole: null }),
    }),
    { name: "ebs-app-store" }
  )
);
