"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStudent } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentEntry() {
  const router = useRouter();
  const setStudent = useAppStore((s) => s.setStudent);
  const setRole = useAppStore((s) => s.setRole);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("3");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해 주세요");
      return;
    }
    setLoading(true);
    try {
      const student = await createStudent({ name: name.trim(), grade: Number(grade), school });
      setStudent(student);
      setRole("student");
      toast.success(`반가워요, ${student.name}!`);
      router.push("/student/onboarding");
    } catch {
      toast.error("서버 연결에 실패했습니다. 백엔드가 실행 중인지 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">학생 입장</CardTitle>
            <CardDescription>정보를 입력하고 학습을 시작해요!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="예: 김민준"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
            </div>
            <div className="space-y-2">
              <Label>학년</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">학교 (선택)</Label>
              <Input
                id="school"
                placeholder="예: 서울초등학교"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? "처리 중..." : "학습 시작하기"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
