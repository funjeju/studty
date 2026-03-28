"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurriculumMap, getSubjects, CurriculumUnit, api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

const SUBJECT_EMOJI: Record<string, string> = {
  "국어": "📖", "수학": "🔢", "사회": "🌍", "과학": "🔬",
  "도덕": "💛", "영어": "🗣️", "음악": "🎵", "미술": "🎨", "체육": "⚽",
  "바른 생활": "🌟", "슬기로운 생활": "🧐", "즐거운 생활": "😄",
  "실과": "🛠️", "정보": "💻", "기술·가정": "🏠", "역사": "🏛️",
  "한문": "🈲", "환경": "🌿", "보건": "💊", "진로와 직업": "🎯",
  "스포츠 생활": "🏃", "음악 감상과 비평": "🎧", "미술 창작": "🖌️",
  "연극": "🎭", "논술": "✍️", "철학": "🤔", "심리학": "🧠", "생활 외국어": "💬",
};

const SUBJECT_GRADIENT: Record<string, string> = {
  "국어": "from-blue-500 to-indigo-500",
  "수학": "from-violet-500 to-purple-500",
  "사회": "from-amber-500 to-orange-500",
  "과학": "from-emerald-500 to-teal-500",
  "영어": "from-sky-500 to-blue-500",
  "도덕": "from-yellow-500 to-amber-500",
  "음악": "from-pink-500 to-rose-500",
  "미술": "from-fuchsia-500 to-violet-500",
  "체육": "from-green-500 to-emerald-500",
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
        } catch {}
      }
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

  const subjectGradient = selectedSubject ? (SUBJECT_GRADIENT[selectedSubject] || "from-blue-500 to-indigo-500") : "from-blue-500 to-indigo-500";

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-0">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {selectedSubject ? (
            <button
              onClick={() => { setSelectedSubject(null); setUnits([]); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
          ) : (
            <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
          )}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-white">
            {selectedSubject ? `${grade}학년 ${selectedSubject}` : `${grade}학년 복습하기`}
          </span>
          <div className="ml-auto px-3 py-1 rounded-full bg-white/5 border border-white/[0.08] text-xs text-slate-400">
            {authUser.name}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* 과목 선택 */}
        {!selectedSubject && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">어떤 과목을 복습할까요?</h2>
              <p className="text-sm text-slate-500">과목을 선택하면 AI가 커리큘럼을 분석해드려요</p>
            </div>
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {subjects.map((subject) => {
                  const gradient = SUBJECT_GRADIENT[subject] || "from-slate-600 to-slate-700";
                  return (
                    <button
                      key={subject}
                      onClick={() => handleSelectSubject(subject)}
                      className="group relative p-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 hover:-translate-y-0.5 text-center"
                    >
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-200`} />
                      <div className="relative z-10">
                        <div className="text-3xl mb-2">{SUBJECT_EMOJI[subject] ?? "📚"}</div>
                        <p className="text-sm font-semibold text-slate-200">{subject}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 차시 목록 */}
        {selectedSubject && (
          <>
            {loadingMap ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                  <div className="absolute inset-0 w-10 h-10 bg-blue-500/20 rounded-full blur-lg animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">교육과정 분석 중</p>
                  <p className="text-slate-500 text-sm">AI가 {grade}학년 {selectedSubject} 커리큘럼을 구성하고 있어요</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">어떤 단원을 복습할까요?</h2>
                  <p className="text-sm text-slate-500">{units.length}개 차시가 있어요</p>
                </div>
                <div className="space-y-2">
                  {units.map((unit, idx) => (
                    <button
                      key={unit.chacha_num}
                      onClick={() => handleSelectUnit(unit)}
                      className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subjectGradient} flex items-center justify-center shrink-0 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                        <span className="text-white font-bold text-sm">{unit.chacha_num}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">{unit.chapter}</p>
                        <p className="font-semibold text-slate-100 text-sm leading-tight">{unit.topic}</p>
                        {unit.core_concepts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {unit.core_concepts.slice(0, 3).map((c) => (
                              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.08] text-slate-400">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
