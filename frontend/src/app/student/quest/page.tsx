"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getLessonSession, submitFeedback, LessonSession, QuestionItem, CurriculumUnit } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Brain, CheckCircle2, ChevronRight, Lightbulb, BookOpen, Home, CalendarCheck, Loader2, Play, ExternalLink } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

type Branch = "기초" | "표준" | "심화";

function scoreToBranch(correct: number, total: number): Branch {
  if (total === 0) return "표준";
  const rate = correct / total;
  if (rate <= 0.4) return "기초";
  if (rate <= 0.7) return "표준";
  return "심화";
}

const BRANCH_CFG: Record<Branch, { label: string; color: string; bg: string; desc: string }> = {
  기초: { label: "기초 다지기", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", desc: "차근차근 개념부터 다시 살펴봐요" },
  표준: { label: "표준 복습", color: "text-green-700", bg: "bg-green-50 border-green-200", desc: "배운 내용을 정리하고 확인해봐요" },
  심화: { label: "심화 도전", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", desc: "이미 잘 알고 있어요! 더 깊이 이해해봐요" },
};

const TRAIT_EMOJI: Record<string, string> = {
  V_visual: "👁", A_auditory: "👂", R_reading: "📚", K_kinesthetic: "🖐",
};

type Phase = "loading" | "intro" | "pre_test" | "branch_reveal" | "review" | "post_test" | "post_result" | "spaced_repetition" | "complete";

type SRResult = { concept: string; next_review_date: string; explanation?: string | null; understanding?: Understanding };

type Understanding = "완전이해" | "알쏭달쏭" | "완전모름";

const UNDERSTANDING_CFG: Record<Understanding, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  완전이해: { label: "완전이해", emoji: "🟢", color: "text-green-700", bg: "bg-green-50 hover:bg-green-100", border: "border-green-400" },
  알쏭달쏭: { label: "알쏭달쏭", emoji: "🟡", color: "text-amber-700", bg: "bg-amber-50 hover:bg-amber-100", border: "border-amber-400" },
  완전모름: { label: "완전모름", emoji: "🔴", color: "text-red-700", bg: "bg-red-50 hover:bg-red-100", border: "border-red-400" },
};

function QuestionCard({ question, qNum, total, onAnswer }: {
  question: QuestionItem; qNum: number; total: number;
  onAnswer: (ok: boolean, understanding: Understanding) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const check = () => {
    if (!selected) return;
    const ok = question.options?.find((o) => o.text === selected)?.is_correct ?? false;
    setIsCorrect(ok);
    setAnswered(true);
  };

  const pickUnderstanding = (level: Understanding) => {
    onAnswer(isCorrect, level);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Badge variant="secondary">{qNum} / {total}</Badge>
        <Badge variant="outline">{question.concept_tag}</Badge>
      </div>
      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg leading-relaxed">{question.text}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {question.options?.map((opt, i) => {
            let cls = "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
            if (answered) {
              if (opt.is_correct) cls = "border-green-500 bg-green-50";
              else if (opt.text === selected) cls = "border-red-400 bg-red-50";
            } else if (selected === opt.text) cls = "border-blue-500 bg-blue-50";
            return (
              <button key={i} onClick={() => !answered && setSelected(opt.text)} disabled={answered}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ${cls}`}>
                <span className="mr-2 font-bold text-slate-400">{["①","②","③","④"][i]}</span>
                {opt.text}
                {answered && opt.is_correct && <CheckCircle2 className="inline ml-2 w-4 h-4 text-green-600" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {!answered ? (
        <Button className="w-full" size="lg" onClick={check} disabled={!selected}>정답 확인</Button>
      ) : (
        <div className="space-y-3">
          <div className={`p-3 rounded-xl text-center font-semibold ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {isCorrect ? "정답! 🎉" : "아쉬워요! 정답을 확인하세요."}
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 border">
            <p className="text-sm font-semibold text-slate-600 text-center">이 개념, 얼마나 이해했나요?</p>
            <div className="grid grid-cols-3 gap-2">
              {(["완전이해", "알쏭달쏭", "완전모름"] as Understanding[]).map((level) => {
                const cfg = UNDERSTANDING_CFG[level];
                return (
                  <button key={level} onClick={() => pickUnderstanding(level)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all font-medium text-sm ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    <span className="text-xl">{cfg.emoji}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestContent() {
  const router = useRouter();
  const params = useSearchParams();
  const authUser = useAuthStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);

  const [session, setSession] = useState<LessonSession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [branch, setBranch] = useState<Branch>("표준");
  const [preIdx, setPreIdx] = useState(0);
  const [preCorrect, setPreCorrect] = useState(0);
  const [postIdx, setPostIdx] = useState(0);
  const [postCorrect, setPostCorrect] = useState(0);
  const [srResults, setSrResults] = useState<SRResult[]>([]);
  const [srLoading, setSrLoading] = useState(false);
  // concept_tag → 학생이 직접 선택한 이해도
  const [understandingMap, setUnderstandingMap] = useState<Record<string, Understanding>>({});

  const startedAtRef = useRef<number>(Date.now());
  const actKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authUser) { router.replace("/auth?role=student"); return; }
    (async () => {
      const subject = params.get("subject") ?? undefined;
      const chachaNum = params.get("chacha_num");
      const topic = params.get("topic") ?? undefined;
      const learningGoals = params.get("learning_goals") ?? undefined;
      const coreConcepts = params.get("core_concepts") ?? undefined;
      let unit: CurriculumUnit | undefined;
      if (subject && chachaNum && topic) {
        unit = { chacha_num: Number(chachaNum), chapter: "", topic,
          learning_goals: learningGoals ? learningGoals.split(",") : [],
          core_concepts: coreConcepts ? coreConcepts.split(",") : [] };
      }
      try {
        const data = await getLessonSession(authUser!.uid, unit, subject);
        setSession(data);
        setPhase("intro");
        startedAtRef.current = Date.now();

        // 복습 시작 기록 저장
        const today = new Date().toISOString().slice(0, 10);
        const actKey = `${authUser!.uid}_${today}_${data.lesson_id}`;
        actKeyRef.current = actKey;
        await setDoc(doc(db, "student_activity", actKey), {
          student_id: authUser!.uid,
          student_name: authUser!.name || "",
          date: today,
          lesson_id: data.lesson_id,
          subject: data.lesson_topic,
          viewed: true,
          started_at: new Date().toISOString(),
          duration_sec: 0,
        }, { merge: true });
      } catch {
        toast.error("수업 세션을 불러오지 못했습니다.");
        setPhase("intro");
      }
    })();
  }, []);

  const handlePreAnswer = async (ok: boolean, understanding: Understanding) => {
    const conceptTag = session?.pre_test?.[preIdx]?.concept_tag;
    if (conceptTag) setUnderstandingMap((m) => ({ ...m, [conceptTag]: understanding }));
    const nc = ok ? preCorrect + 1 : preCorrect;
    const ni = preIdx + 1;
    const total = session?.pre_test?.length ?? 0;
    if (ni >= total) {
      setBranch(scoreToBranch(nc, total)); setPreCorrect(nc); setPhase("branch_reveal");
      if (actKeyRef.current) {
        try { await setDoc(doc(db, "student_activity", actKeyRef.current), { pre_correct: nc, pre_total: total }, { merge: true }); } catch { /* silent */ }
      }
    } else { setPreCorrect(nc); setPreIdx(ni); }
  };

  const handlePostAnswer = async (ok: boolean, understanding: Understanding) => {
    const postTests = session?.post_test?.length ? session.post_test : session?.questions ?? [];
    const conceptTag = postTests[postIdx]?.concept_tag;
    if (conceptTag) setUnderstandingMap((m) => ({ ...m, [conceptTag]: understanding }));
    const nc = ok ? postCorrect + 1 : postCorrect;
    const ni = postIdx + 1;
    if (ni >= postTests.length) {
      setPostCorrect(nc); setPhase("post_result");
      if (actKeyRef.current) {
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        try {
          await setDoc(doc(db, "student_activity", actKeyRef.current), {
            post_correct: nc, post_total: postTests.length, duration_sec: durationSec,
          }, { merge: true });
        } catch { /* silent */ }
      }
    } else { setPostCorrect(nc); setPostIdx(ni); }
  };

  const handleGoToSpacedRepetition = async () => {
    setPhase("spaced_repetition");
    setSrLoading(true);
    const postTests = session?.post_test?.length ? session.post_test : session?.questions ?? [];
    const total = postTests.length;
    const rate = total > 0 ? postCorrect / total : 0;
    // 학생이 직접 선택한 이해도 우선, 없으면 점수 기반 폴백
    const scoreFallback: Understanding = rate >= 0.7 ? "완전이해" : rate >= 0.4 ? "알쏭달쏭" : "완전모름";
    const concepts = session?.core_concepts ?? [];
    // concept_tag와 core_concepts 매핑: post_test 문제의 concept_tag를 기준으로 core_concepts에 매핑
    const conceptUnderstanding = (concept: string): Understanding => {
      // 해당 concept과 일치하는 concept_tag 문제에서 선택한 이해도 찾기
      const direct = understandingMap[concept];
      if (direct) return direct;
      // concept_tag가 concept을 포함하는 경우
      const match = Object.entries(understandingMap).find(([tag]) =>
        tag.includes(concept) || concept.includes(tag)
      );
      return match ? match[1] : scoreFallback;
    };
    try {
      const results = await Promise.all(
        concepts.map((concept) => {
          const level = conceptUnderstanding(concept);
          // 백엔드 스키마에서 "완전모름" → "모름" 매핑
          const apiLevel = level === "완전모름" ? "모름" : level;
          return submitFeedback({ student_id: authUser!.uid, concept_tag: concept, understanding_level: apiLevel })
            .then((res): SRResult => ({ concept, next_review_date: res.next_review_date as string, explanation: res.explanation, understanding: level }))
            .catch((): SRResult => ({ concept, next_review_date: "확인 불가", understanding: level }));
        })
      );
      setSrResults(results);
    } catch {
      toast.error("복습 일정을 저장하지 못했습니다.");
    } finally {
      setSrLoading(false);
    }
  };

  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><Brain className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-3" /><p className="text-slate-500">수업 내용을 불러오는 중...</p></div>
    </div>
  );

  if (phase === "intro" && session) {
    const hasPreTest = (session.pre_test?.length ?? 0) > 0;
    const postCount = (session.post_test?.length ? session.post_test : session.questions).length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={session.source === "teacher_upload" ? "default" : "secondary"}>
                  {session.source === "teacher_upload" ? "선생님 수업" : "AI 복습"}
                </Badge>
                {profile && <Badge variant="outline">{TRAIT_EMOJI[profile.primary_trait]} {profile.tutor_persona}</Badge>}
              </div>
              <CardTitle className="text-2xl">{session.lesson_topic}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 font-medium mb-1">오늘 배운 내용</p>
                <p className="text-slate-700">{session.lesson_summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.core_concepts.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
              </div>
              <Separator />
              <div className="text-sm text-slate-500 space-y-1 bg-slate-50 rounded-lg p-3">
                {hasPreTest && <p>① 사전 테스트 ({session.pre_test.length}문제) — 현재 수준 파악</p>}
                <p>{hasPreTest ? "②" : "①"} 개념 복습 — 성향별 맞춤 설명</p>
                <p>{hasPreTest ? "③" : "②"} 사후 테스트 ({postCount}문제) — 이해도 확인</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => setPhase(hasPreTest ? "pre_test" : "review")}>
                복습 시작! <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "pre_test" && session?.pre_test?.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Progress value={(preIdx / session.pre_test.length) * 100} className="h-2 rounded-none [&>div]:bg-blue-400" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <p className="text-center text-sm font-medium text-slate-500 mb-4">사전 테스트 — 얼마나 알고 있나요?</p>
            <QuestionCard key={`pre-${preIdx}`} question={session.pre_test[preIdx]} qNum={preIdx+1} total={session.pre_test.length} onAnswer={handlePreAnswer} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "branch_reveal") {
    const cfg = BRANCH_CFG[branch];
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className={`rounded-2xl border-2 p-8 ${cfg.bg}`}>
            <p className="text-5xl mb-3">{branch === "기초" ? "📘" : branch === "표준" ? "📗" : "📕"}</p>
            <h2 className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</h2>
            <p className="text-slate-600 mt-2">{cfg.desc}</p>
            <p className="text-sm text-slate-400 mt-2">사전 테스트 {preCorrect}/{session?.pre_test?.length} 정답</p>
          </div>
          <Button className="w-full" size="lg" onClick={() => setPhase("review")}>
            복습 시작 <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "review" && session) {
    const cfg = BRANCH_CFG[branch];
    const defs = session.concept_definitions ?? [];
    const traitKey = profile?.primary_trait?.split("_")[0]?.toLowerCase() as keyof NonNullable<typeof session.vark_tips> | undefined;
    const varkTip = traitKey && session.vark_tips ? session.vark_tips[traitKey] : null;
    const VARK_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
      v: { label: "시각형 학습", icon: "👁", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
      a: { label: "청각형 학습", icon: "👂", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
      r: { label: "읽기형 학습", icon: "📚", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
      k: { label: "체험형 학습", icon: "🖐", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
    };
    const varkUI = traitKey ? VARK_CFG[traitKey] : null;
    const videoQuery = session.video_search_query || `${session.lesson_topic} 개념 설명`;
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`;
    const ebsUrl = `https://www.ebs.co.kr/search?searchKeyword=${encodeURIComponent(videoQuery)}`;

    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${cfg.bg}`}>
            <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
            {profile && <span className="text-sm text-slate-500 ml-auto">{TRAIT_EMOJI[profile.primary_trait]} {profile.tutor_persona} 모드</span>}
          </div>

          {/* 핵심 요약 */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="w-5 h-5 text-blue-500" />핵심 요약</CardTitle></CardHeader>
            <CardContent><p className="text-slate-700 leading-relaxed">{session.lesson_summary}</p></CardContent>
          </Card>

          {/* VARK 맞춤 설명 */}
          {varkTip && varkUI && (
            <Card className={`border ${varkUI.bg}`}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{varkUI.icon}</span>
                  <span className={`text-sm font-bold ${varkUI.color}`}>{varkUI.label} 맞춤 설명</span>
                </div>
                <p className={`text-sm leading-relaxed ${varkUI.color}`}>{varkTip}</p>
              </CardContent>
            </Card>
          )}

          {/* 영상 자료 */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-red-500" />
              <p className="text-sm font-semibold text-slate-700">관련 영상 찾기</p>
            </div>
            <p className="text-xs text-slate-400">검색어: {videoQuery}</p>
            <div className="flex gap-2">
              <a href={ebsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  <span>📺</span> EBS 영상 보기
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  <span>▶</span> 유튜브 검색
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
              </a>
            </div>
          </div>

          {/* 개념 정리 */}
          {defs.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">개념 정리</p>
              {defs.map((d, i) => (
                <Card key={i} className="border-l-4 border-l-blue-400">
                  <CardContent className="pt-4 space-y-1">
                    <p className="font-semibold text-blue-700">{d.concept}</p>
                    <p className="text-slate-700 text-sm">{d.definition}</p>
                    {branch !== "심화" && <p className="text-slate-500 text-xs bg-slate-50 rounded p-2">예시: {d.example}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {branch === "기초" && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1"><Lightbulb className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-amber-700">기초 다지기 팁</span></div>
                <p className="text-sm text-amber-700">개념을 충분히 읽고 예시를 통해 이해해보세요. 틀려도 괜찮아요!</p>
              </CardContent>
            </Card>
          )}
          <Button className="w-full" size="lg" onClick={() => setPhase("post_test")}>
            사후 테스트 시작 <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "post_test" && session) {
    const postTests = session.post_test?.length ? session.post_test : session.questions;
    if (!postTests?.length) { setPhase("complete"); return null; }
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Progress value={(postIdx / postTests.length) * 100} className="h-2 rounded-none [&>div]:bg-green-400" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <p className="text-center text-sm font-medium text-slate-500 mb-4">사후 테스트 — 이제 얼마나 알게 됐나요?</p>
            <QuestionCard key={`post-${postIdx}`} question={postTests[postIdx]} qNum={postIdx+1} total={postTests.length} onAnswer={handlePostAnswer} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "post_result" && session) {
    const postTests = session.post_test?.length ? session.post_test : session.questions;
    const total = postTests.length;
    const rate = total > 0 ? postCorrect / total : 0;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className={`rounded-2xl border-2 p-6 text-center ${BRANCH_CFG[scoreToBranch(postCorrect, total)].bg}`}>
            <p className="text-4xl mb-2">{rate >= 0.7 ? "🎉" : rate >= 0.4 ? "👍" : "💪"}</p>
            <h2 className={`text-xl font-bold ${BRANCH_CFG[scoreToBranch(postCorrect, total)].color}`}>
              {rate >= 0.7 ? "훌륭해요!" : rate >= 0.4 ? "잘했어요!" : "조금 더 복습해봐요!"}
            </h2>
            <p className="text-slate-600 text-sm mt-1">사후 테스트 {postCorrect}/{total} 정답</p>
          </div>
          <div className="bg-white rounded-xl p-4 border space-y-2">
            {(session.pre_test?.length ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">사전 테스트</span>
                <span className="font-semibold">{preCorrect}/{session.pre_test.length}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">사후 테스트</span>
              <span className="font-semibold text-green-600">{postCorrect}/{total}</span>
            </div>
            {(session.pre_test?.length ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">향상도</span>
                <span className="font-semibold text-blue-600">
                  {postCorrect > preCorrect ? `+${postCorrect - preCorrect}문제` : "유지"}
                </span>
              </div>
            )}
          </div>
          <Button className="w-full" size="lg" onClick={handleGoToSpacedRepetition}>
            다음 복습 일정 확인 <CalendarCheck className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "spaced_repetition") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center pt-4 pb-2">
            <CalendarCheck className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold">망각곡선 복습 일정</h2>
            <p className="text-sm text-slate-500">AI가 이해도에 맞게 복습 날짜를 잡아줬어요</p>
          </div>
          {srLoading ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-slate-500">복습 일정 계산 중...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {srResults.map((r, i) => {
                const uCfg = r.understanding ? UNDERSTANDING_CFG[r.understanding] : null;
                const borderColor = r.understanding === "완전이해" ? "border-l-green-400" : r.understanding === "알쏭달쏭" ? "border-l-amber-400" : "border-l-red-400";
                return (
                  <Card key={i} className={`border-l-4 ${borderColor}`}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">{r.concept}</p>
                        {uCfg && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${uCfg.border} ${uCfg.color} ${uCfg.bg}`}>
                            {uCfg.emoji} {uCfg.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        📅 다음 복습: <span className="font-semibold text-slate-600">{r.next_review_date !== "확인 불가" ? r.next_review_date : "—"}</span>
                      </p>
                      {r.explanation && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-700">AI 보충 설명</span>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed">{r.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <Button className="w-full" size="lg" disabled={srLoading} onClick={() => setPhase("complete")}>
            복습 완료! <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "complete") return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-4">🎊</div>
        <h1 className="text-2xl font-bold mb-2">복습 완료!</h1>
        <p className="text-slate-500 mb-6">{authUser?.name}이(가) 오늘 수업을 복습했어요.<br />학부모님께 학습 결과가 전송됩니다.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/student/curriculum")} size="lg">다른 과목 복습하기</Button>
          <Link href="/"><Button variant="outline"><Home className="mr-2 w-4 h-4" />홈으로</Button></Link>
        </div>
      </div>
    </div>
  );

  return null;
}

export default function QuestPage() {
  return <Suspense><QuestContent /></Suspense>;
}
