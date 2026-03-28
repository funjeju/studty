"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurriculumMap, getSubjects, CurriculumUnit, api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

const SUBJECT_EMOJI: Record<string, string> = {
  "국어": "📖", "수학": "🔢", "사회": "🌍", "과학": "🔬",
  "도덕": "💛", "영어": "🗣️", "음악": "🎵", "미술": "🎨", "체육": "⚽",
  "바른 생활": "🌟", "슬기로운 생활": "🧐", "즐거운 생활": "😄",
  "실과": "🛠️", "정보": "💻", "기술·가정": "🏠", "역사": "🏛️",
  "한문": "🈲", "환경": "🌿", "보건": "💊", "진로와 직업": "🎯",
  "스포츠 생활": "🏃", "음악 감상과 비평": "🎧", "미술 창작": "🖌️",
  "연극": "🎭", "논술": "✍️", "철학": "🤔", "심리학": "🧠",
  "생활 외국어": "💬",
};

export default function CurriculumPage() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const grade = authUser?.grade ?? 3;

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);

  useEffect(() => {
    if (!authUser) { router.replace("/auth?role=student"); return; }
    getSubjects(grade)
      .then((r) => setSubjects(r.subjects))
      .catch(() => toast.error("과목 목록을 불러오지 못했습니다."))
      .finally(() => setLoadingSubjects(false));
  }, []);

  const handleSelectSubject = async (subject: string) => {
    setSelectedSubject(subject);
    setUnits([]);
    setLoadingMap(true);
    try {
      // 1순위: 담임 선생님 커리큘럼 (학교+학년+반 매칭)
      const school = authUser?.school || "";
      const classNum = authUser?.classNum || 0;
      if (school && classNum) {
        try {
          const res = await api.get(
            `/curriculum/class?school=${encodeURIComponent(school)}&grade=${grade}&class_num=${classNum}&subject=${encodeURIComponent(subject)}`
          );
          setUnits(res.data.units);
          toast.success("선생님이 구성한 커리큘럼을 불러왔어요!");
          return;
        } catch {
          // 선생님 커리큘럼 없으면 AI 생성으로 폴백
        }
      }
      // 2순위: AI 생성 커리큘럼
      const map = await getCurriculumMap(grade, subject);
      setUnits(map.units);
      if (!map.cached) toast.success("AI가 커리큘럼을 생성했어요!");
    } catch {
      toast.error("커리큘럼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingMap(false);
    }
  };

  const handleSelectUnit = (unit: CurriculumUnit) => {
    // URL로 차시 정보 전달
    const params = new URLSearchParams({
      subject: selectedSubject!,
      chacha_num: String(unit.chacha_num),
      topic: unit.topic,
      learning_goals: unit.learning_goals.join(","),
      core_concepts: unit.core_concepts.join(","),
    });
    router.push(`/student/quest?${params.toString()}`);
  };

  if (!authUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {selectedSubject ? (
            <button onClick={() => { setSelectedSubject(null); setUnits([]); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">
            {selectedSubject ? `${grade}학년 ${selectedSubject}` : `${grade}학년 복습하기`}
          </span>
          <Badge variant="outline" className="ml-auto">{authUser.name}</Badge>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 과목 선택 */}
        {!selectedSubject && (
          <>
            <p className="text-slate-500 text-sm mb-4">어떤 과목을 복습할까요?</p>
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSelectSubject(subject)}
                    className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
                  >
                    <div className="text-3xl mb-2">{SUBJECT_EMOJI[subject] ?? "📚"}</div>
                    <p className="text-sm font-semibold text-slate-700">{subject}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 차시 목록 */}
        {selectedSubject && (
          <>
            {loadingMap ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 text-sm">AI가 {grade}학년 {selectedSubject} 교육과정을 분석하고 있어요...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-500 text-sm mb-4">어떤 단원을 복습할까요?</p>
                {units.map((unit) => (
                  <Card
                    key={unit.chacha_num}
                    className="hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleSelectUnit(unit)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-700 font-bold text-sm">{unit.chacha_num}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 mb-0.5">{unit.chapter}</p>
                        <p className="font-semibold text-slate-800 text-sm">{unit.topic}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {unit.core_concepts.slice(0, 3).map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs px-1.5 py-0">{c}</Badge>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
