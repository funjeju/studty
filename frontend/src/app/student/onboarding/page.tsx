"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { submitProfile, LearningProfile } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

// ─── 성향 정의 ────────────────────────────────────────────────────────────────
const TRAITS = [
  {
    id: "V_visual",
    label: "시각형",
    emoji: "👁",
    persona: "그림 탐험가 튜터",
    desc: "그림, 도표, 영상으로 배울 때 가장 잘 이해해요",
    detail: "지도나 그림을 보면 머릿속에 쏙쏙 들어와요. 색깔과 모양으로 기억하는 걸 좋아해요.",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-300",
    btnClass: "bg-purple-600 hover:bg-purple-700",
  },
  {
    id: "A_auditory",
    label: "청각형",
    emoji: "👂",
    persona: "이야기 마법사 튜터",
    desc: "설명을 듣고 소리 내어 말하면서 배울 때 잘 기억해요",
    detail: "선생님 설명을 들으면 금방 이해돼요. 리듬감 있는 노래나 이야기로 외우면 더 잘 기억해요.",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    btnClass: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "R_reading",
    label: "읽기형",
    emoji: "📚",
    persona: "독서 탐정 튜터",
    desc: "글을 읽고 노트에 정리하면서 배울 때 효과적이에요",
    detail: "책이나 교과서를 꼼꼼히 읽는 걸 좋아해요. 노트에 정리하면 더 잘 이해돼요.",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-300",
    btnClass: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "K_kinesthetic",
    label: "체험형",
    emoji: "🖐",
    persona: "체험 모험가 튜터",
    desc: "직접 해보고 몸으로 익히면서 배울 때 가장 신나요",
    detail: "직접 실험하거나 해보면서 배울 때 가장 재미있어요. 몸을 움직이면서 공부하는 걸 좋아해요.",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-300",
    btnClass: "bg-orange-600 hover:bg-orange-700",
  },
];

// ─── 문항 풀 (30개, 랜덤으로 15개 선택) ─────────────────────────────────────
const QUESTION_POOL = [
  { q_id: "v1", theme: "우주 탐험대", text: "우주선에서 새로운 행성을 발견했어요! 어떻게 기록하고 싶나요?", options: [{ opt_id: "o1", text: "그림이나 지도로 그려서 기록해요" }, { opt_id: "o2", text: "목소리로 녹음해서 설명해요" }, { opt_id: "o3", text: "노트에 자세히 써서 기록해요" }, { opt_id: "o4", text: "행성에 직접 내려가 탐험해요" }] },
  { q_id: "a1", theme: "마법 학교", text: "새로운 마법 주문을 배울 때 가장 잘 외워지는 방법은?", options: [{ opt_id: "o1", text: "주문 그림을 보면서 외워요" }, { opt_id: "o2", text: "리듬감 있게 소리 내어 외워요" }, { opt_id: "o3", text: "주문서를 읽고 또 읽어요" }, { opt_id: "o4", text: "직접 마법 지팡이를 흔들며 연습해요" }] },
  { q_id: "k1", theme: "요리사 챌린지", text: "새 요리법을 배울 때 어떻게 하면 잘 배울 수 있나요?", options: [{ opt_id: "o1", text: "완성된 요리 사진을 보면서 따라해요" }, { opt_id: "o2", text: "선생님이 설명하는 걸 들으면서 해요" }, { opt_id: "o3", text: "레시피 책을 꼼꼼히 읽어요" }, { opt_id: "o4", text: "바로 재료를 만지고 직접 해봐요" }] },
  { q_id: "r1", theme: "탐정 사무소", text: "범인을 찾을 때 가장 도움이 되는 건 무엇인가요?", options: [{ opt_id: "o1", text: "범행 현장 스케치와 사진" }, { opt_id: "o2", text: "목격자 진술 녹음" }, { opt_id: "o3", text: "사건 기록 문서 분석" }, { opt_id: "o4", text: "현장에 직접 가서 확인" }] },
  { q_id: "v2", theme: "시간 여행", text: "조선시대로 시간 여행을 했어요! 가장 기억에 남는 건?", options: [{ opt_id: "o1", text: "화려한 한복과 궁궐의 모습" }, { opt_id: "o2", text: "사람들이 나누는 이야기와 소리" }, { opt_id: "o3", text: "읽은 역사 기록들" }, { opt_id: "o4", text: "직접 체험한 전통 놀이" }] },
  { q_id: "a2", theme: "음악 밴드", text: "밴드에서 새 노래를 배울 때 가장 좋은 방법은?", options: [{ opt_id: "o1", text: "악보 그림을 보며 이해해요" }, { opt_id: "o2", text: "여러 번 들으면서 귀로 익혀요" }, { opt_id: "o3", text: "악보를 꼼꼼히 읽고 분석해요" }, { opt_id: "o4", text: "바로 악기를 잡고 연주해 봐요" }] },
  { q_id: "k2", theme: "스포츠 챔피언", text: "새로운 스포츠 기술을 배울 때 어떻게 하나요?", options: [{ opt_id: "o1", text: "선수들 경기 영상을 보고 따라해요" }, { opt_id: "o2", text: "코치의 설명을 집중해서 들어요" }, { opt_id: "o3", text: "규칙 책을 읽고 전략을 세워요" }, { opt_id: "o4", text: "일단 몸을 움직여 직접 해봐요" }] },
  { q_id: "r2", theme: "도서관 모험", text: "학교 프로젝트 발표를 준비할 때 가장 먼저 하는 건?", options: [{ opt_id: "o1", text: "발표 자료 디자인부터 구상해요" }, { opt_id: "o2", text: "친구들과 아이디어를 이야기해요" }, { opt_id: "o3", text: "관련 책과 자료를 찾아 읽어요" }, { opt_id: "o4", text: "실험이나 체험을 먼저 해봐요" }] },
  { q_id: "m1", theme: "나만의 동기", text: "공부할 때 가장 열심히 하게 만드는 것은?", options: [{ opt_id: "o1", text: "새로운 걸 알게 되는 게 신나서요" }, { opt_id: "o2", text: "좋은 성적을 받고 싶어서요" }, { opt_id: "o3", text: "친구들과 함께 공부하는 게 재미있어서요" }, { opt_id: "o4", text: "부모님이 기뻐하시는 모습이 보고 싶어서요" }] },
  { q_id: "m2", theme: "목표 설정", text: "어려운 문제를 풀었을 때 기분이 어떤가요?", options: [{ opt_id: "o1", text: "내가 성장한 것 같아서 뿌듯해요" }, { opt_id: "o2", text: "목표를 달성해서 기분이 좋아요" }, { opt_id: "o3", text: "친구들한테 자랑하고 싶어요" }, { opt_id: "o4", text: "칭찬받을 생각에 설레요" }] },
  { q_id: "m3", theme: "학습 환경", text: "가장 공부가 잘 되는 상황은?", options: [{ opt_id: "o1", text: "혼자 조용히 탐구할 때요" }, { opt_id: "o2", text: "목표나 상이 있을 때요" }, { opt_id: "o3", text: "친구들과 같이 할 때요" }, { opt_id: "o4", text: "선생님이 칭찬해 주실 때요" }] },
  { q_id: "m4", theme: "어려운 순간", text: "공부가 어렵고 포기하고 싶을 때 어떻게 하나요?", options: [{ opt_id: "o1", text: "이해할 때까지 끝까지 탐구해요" }, { opt_id: "o2", text: "목표를 다시 떠올리며 힘내요" }, { opt_id: "o3", text: "친구에게 도움을 요청해요" }, { opt_id: "o4", text: "잠깐 쉬고 나서 다시 해봐요" }] },
  { q_id: "v3", theme: "자연 관찰", text: "식물이 자라는 것을 공부할 때 어떤 방법이 가장 좋나요?", options: [{ opt_id: "o1", text: "성장 과정을 그림으로 그려요" }, { opt_id: "o2", text: "선생님 설명을 들으며 상상해요" }, { opt_id: "o3", text: "식물 도감을 읽고 기록해요" }, { opt_id: "o4", text: "직접 씨앗을 심어 길러봐요" }] },
  { q_id: "a3", theme: "이야기 시간", text: "역사 이야기를 배울 때 가장 기억에 잘 남는 방법은?", options: [{ opt_id: "o1", text: "역사 지도와 그림을 보며 이해해요" }, { opt_id: "o2", text: "선생님이 실감나게 이야기해 주는 걸 들어요" }, { opt_id: "o3", text: "역사책을 꼼꼼히 읽어요" }, { opt_id: "o4", text: "역할극으로 직접 체험해요" }] },
  { q_id: "k3", theme: "창작 활동", text: "미술 시간에 새 기법을 배울 때 가장 잘 배워지는 방법은?", options: [{ opt_id: "o1", text: "완성된 작품 사진을 보며 따라해요" }, { opt_id: "o2", text: "선생님 설명을 들으며 따라해요" }, { opt_id: "o3", text: "기법 설명서를 읽고 이해해요" }, { opt_id: "o4", text: "일단 붓을 잡고 그려봐요" }] },
  { q_id: "v4", theme: "지도 읽기", text: "길을 찾을 때 가장 편한 방법은?", options: [{ opt_id: "o1", text: "지도를 펼쳐 보며 길을 찾아요" }, { opt_id: "o2", text: "누군가 설명해 주는 말을 들어요" }, { opt_id: "o3", text: "글로 된 길 안내를 읽어요" }, { opt_id: "o4", text: "직접 걸어보면서 찾아요" }] },
  { q_id: "a4", theme: "외국어 배우기", text: "새로운 외국어 단어를 외울 때 가장 좋은 방법은?", options: [{ opt_id: "o1", text: "단어 카드를 만들어 그림과 함께 외워요" }, { opt_id: "o2", text: "소리 내어 여러 번 반복해요" }, { opt_id: "o3", text: "단어장에 써서 외워요" }, { opt_id: "o4", text: "실제로 사용하면서 배워요" }] },
  { q_id: "r3", theme: "과학 실험", text: "과학 실험을 할 때 어떻게 준비하나요?", options: [{ opt_id: "o1", text: "실험 과정을 그림으로 미리 그려봐요" }, { opt_id: "o2", text: "선생님 설명을 잘 들어요" }, { opt_id: "o3", text: "실험 순서서를 꼼꼼히 읽어요" }, { opt_id: "o4", text: "바로 해보면서 배워요" }] },
  { q_id: "k4", theme: "수학 풀기", text: "수학 문제를 풀 때 가장 잘 되는 방법은?", options: [{ opt_id: "o1", text: "그림으로 그려서 생각해요" }, { opt_id: "o2", text: "문제를 소리 내어 읽어요" }, { opt_id: "o3", text: "풀이 과정을 차근차근 써요" }, { opt_id: "o4", text: "손으로 직접 조작해보며 풀어요" }] },
  { q_id: "v5", theme: "동물 관찰", text: "동물 보고서를 쓸 때 가장 도움이 되는 것은?", options: [{ opt_id: "o1", text: "동물 사진과 그림" }, { opt_id: "o2", text: "선생님의 설명" }, { opt_id: "o3", text: "동물 백과사전" }, { opt_id: "o4", text: "동물원에서 직접 관찰" }] },
  { q_id: "a5", theme: "발표 연습", text: "발표 연습을 할 때 어떻게 해야 가장 잘 되나요?", options: [{ opt_id: "o1", text: "발표 자료를 보면서 연습해요" }, { opt_id: "o2", text: "큰 소리로 반복해서 읽어요" }, { opt_id: "o3", text: "발표 내용을 적어서 외워요" }, { opt_id: "o4", text: "친구 앞에서 직접 해봐요" }] },
  { q_id: "r4", theme: "독서 활동", text: "책을 읽고 내용을 잘 기억하는 방법은?", options: [{ opt_id: "o1", text: "머릿속에 장면을 그려봐요" }, { opt_id: "o2", text: "소리 내어 읽어요" }, { opt_id: "o3", text: "중요한 부분을 밑줄 긋고 정리해요" }, { opt_id: "o4", text: "내용을 몸으로 연기해봐요" }] },
  { q_id: "k5", theme: "체육 시간", text: "체육 시간에 새로운 게임 규칙을 배울 때?", options: [{ opt_id: "o1", text: "규칙을 그림으로 그려서 이해해요" }, { opt_id: "o2", text: "선생님 설명을 들으며 이해해요" }, { opt_id: "o3", text: "규칙서를 읽고 공부해요" }, { opt_id: "o4", text: "바로 해보면서 익혀요" }] },
  { q_id: "v6", theme: "지구 과학", text: "날씨 변화를 공부할 때 어떤 방법이 도움이 되나요?", options: [{ opt_id: "o1", text: "날씨 그래프와 지도를 보며 배워요" }, { opt_id: "o2", text: "날씨 예보를 들으며 배워요" }, { opt_id: "o3", text: "날씨 일기를 써서 기록해요" }, { opt_id: "o4", text: "밖에 나가서 직접 느껴봐요" }] },
  { q_id: "a6", theme: "음악 감상", text: "음악을 배울 때 어떻게 하면 가장 잘 이해되나요?", options: [{ opt_id: "o1", text: "악보를 보면서 이해해요" }, { opt_id: "o2", text: "직접 들어보며 느껴요" }, { opt_id: "o3", text: "음악에 대한 글을 읽어요" }, { opt_id: "o4", text: "악기로 직접 연주해봐요" }] },
  { q_id: "r5", theme: "역사 공부", text: "역사 연표를 외울 때 가장 좋은 방법은?", options: [{ opt_id: "o1", text: "타임라인을 그림으로 그려요" }, { opt_id: "o2", text: "중요한 사건을 소리 내어 말해요" }, { opt_id: "o3", text: "역사책을 반복해서 읽어요" }, { opt_id: "o4", text: "역사 체험 학습을 가봐요" }] },
  { q_id: "k6", theme: "조립 놀이", text: "레고나 조립 장난감을 만들 때 어떻게 하나요?", options: [{ opt_id: "o1", text: "완성 사진을 보며 만들어요" }, { opt_id: "o2", text: "누군가 방법을 알려주면 따라해요" }, { opt_id: "o3", text: "설명서를 읽고 순서대로 해요" }, { opt_id: "o4", text: "직접 해보면서 맞춰봐요" }] },
  { q_id: "v7", theme: "지리 탐험", text: "세계 지도를 공부할 때 어떤 방법이 가장 좋나요?", options: [{ opt_id: "o1", text: "지도를 색칠하면서 외워요" }, { opt_id: "o2", text: "나라 이름을 소리 내어 외워요" }, { opt_id: "o3", text: "지리책을 읽으며 공부해요" }, { opt_id: "o4", text: "직접 여행을 가본 곳을 중심으로 기억해요" }] },
  { q_id: "a7", theme: "받아쓰기", text: "받아쓰기 연습을 할 때 어떻게 하나요?", options: [{ opt_id: "o1", text: "단어의 모양을 시각적으로 기억해요" }, { opt_id: "o2", text: "소리 내어 여러 번 말하면서 외워요" }, { opt_id: "o3", text: "반복해서 써보며 외워요" }, { opt_id: "o4", text: "문장에서 직접 사용해보며 배워요" }] },
  { q_id: "r6", theme: "신문 읽기", text: "뉴스나 기사를 이해할 때 어떻게 하나요?", options: [{ opt_id: "o1", text: "기사의 사진과 제목을 먼저 봐요" }, { opt_id: "o2", text: "뉴스 방송을 들어요" }, { opt_id: "o3", text: "기사를 처음부터 끝까지 읽어요" }, { opt_id: "o4", text: "직접 경험해보거나 관찰해요" }] },
];

const THEME_COLORS: Record<string, string> = {
  "우주 탐험대": "from-indigo-500 to-purple-600",
  "마법 학교": "from-violet-500 to-pink-500",
  "요리사 챌린지": "from-orange-400 to-red-500",
  "탐정 사무소": "from-slate-600 to-slate-800",
  "시간 여행": "from-amber-500 to-orange-600",
  "음악 밴드": "from-pink-500 to-rose-600",
  "스포츠 챔피언": "from-green-500 to-teal-600",
  "도서관 모험": "from-cyan-500 to-blue-600",
  "나만의 동기": "from-yellow-500 to-amber-600",
  "목표 설정": "from-emerald-500 to-green-600",
  "학습 환경": "from-teal-500 to-cyan-600",
  "어려운 순간": "from-red-500 to-rose-600",
  "자연 관찰": "from-lime-500 to-green-600",
  "이야기 시간": "from-blue-500 to-indigo-600",
  "창작 활동": "from-fuchsia-500 to-purple-600",
  "지도 읽기": "from-sky-500 to-blue-600",
  "외국어 배우기": "from-violet-400 to-purple-500",
  "과학 실험": "from-green-400 to-emerald-500",
  "수학 풀기": "from-blue-400 to-indigo-500",
  "동물 관찰": "from-amber-400 to-yellow-500",
  "발표 연습": "from-rose-400 to-pink-500",
  "독서 활동": "from-indigo-400 to-blue-500",
  "체육 시간": "from-orange-500 to-red-400",
  "지구 과학": "from-teal-400 to-cyan-500",
  "음악 감상": "from-pink-400 to-rose-500",
  "역사 공부": "from-amber-600 to-orange-700",
  "조립 놀이": "from-slate-400 to-gray-600",
  "지리 탐험": "from-green-600 to-teal-700",
  "받아쓰기": "from-blue-600 to-indigo-700",
  "신문 읽기": "from-gray-500 to-slate-700",
};

const MOTIVATION_INFO: Record<string, { label: string; emoji: string }> = {
  intrinsic: { label: "내적 동기형", emoji: "✨" },
  achievement: { label: "성취 지향형", emoji: "🏆" },
  social: { label: "사회적 동기형", emoji: "👫" },
  external: { label: "외적 동기형", emoji: "🌟" },
};

function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

type Phase = "select" | "quiz" | "result";

export default function OnboardingPage() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const setProfile = useAppStore((s) => s.setProfile);
  const [phase, setPhase] = useState<Phase>("select");
  const [questions, setQuestions] = useState<typeof QUESTION_POOL>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LearningProfile | null>(null);

  useEffect(() => {
    setQuestions(shuffleAndPick(QUESTION_POOL, 15));
  }, []);

  if (!authUser) {
    router.replace("/auth?role=student");
    return null;
  }

  // ─── 직접 성향 선택 ────────────────────────────────────────────────────────
  const handleDirectSelect = async (traitId: string) => {
    const trait = TRAITS.find((t) => t.id === traitId)!;
    setLoading(true);
    try {
      const profile: LearningProfile = {
        primary_trait: traitId,
        secondary_trait: traitId,
        motivation_type: "intrinsic",
        tutor_persona: trait.persona,
        confidence_score: 1.0,
      };
      await setDoc(doc(db, "learning_profiles", authUser.uid), {
        student_id: authUser.uid,
        ...profile,
      });
      setProfile(profile);
      setResult(profile);
      setPhase("result");
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // ─── 퀴즈 답변 ────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!selected) { toast.error("하나를 선택해 주세요!"); return; }
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.q_id]: selected };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      return;
    }

    setLoading(true);
    try {
      const formatted = questions.map((q) => ({
        q_id: q.q_id,
        opt_id: newAnswers[q.q_id] || "o4",
      }));
      const profile = await submitProfile({ student_id: authUser.uid, answers: formatted });
      setProfile(profile);
      setResult(profile);
      setPhase("result");
    } catch {
      toast.error("프로필 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Phase: select ─────────────────────────────────────────────────────────
  if (phase === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">학습 성향 파악</p>
            <h1 className="text-2xl font-bold text-slate-900">나의 학습 스타일은?</h1>
            <p className="text-slate-500 text-sm mt-2">평소 공부할 때 나와 가장 비슷한 유형을 골라주세요</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {TRAITS.map((trait) => (
              <button
                key={trait.id}
                onClick={() => handleDirectSelect(trait.id)}
                disabled={loading}
                className={`p-4 rounded-2xl border-2 ${trait.border} ${trait.bg} text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
              >
                <div className="text-3xl mb-2">{trait.emoji}</div>
                <p className={`font-bold text-base ${trait.color}`}>{trait.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{trait.detail}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setPhase("quiz")}
            disabled={loading}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-white transition-all text-sm font-medium"
          >
            🤔 잘 모르겠어요 → 성향 테스트 해보기 (15문항)
          </button>
        </div>
      </div>
    );
  }

  // ─── Phase: quiz ──────────────────────────────────────────────────────────
  if (phase === "quiz" && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = (currentIdx / questions.length) * 100;
    const isLast = currentIdx === questions.length - 1;
    const gradient = THEME_COLORS[q.theme] || "from-blue-500 to-indigo-600";

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="w-full">
          <Progress value={progress} className="h-2 rounded-none" />
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary">{currentIdx + 1} / {questions.length}</Badge>
              <Badge className={`bg-gradient-to-r ${gradient} text-white border-0`}>{q.theme}</Badge>
            </div>

            <Card className="shadow-lg mb-4">
              <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg`}>
                <CardTitle className="text-lg leading-relaxed">{q.text}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {q.options.map((opt) => (
                  <button
                    key={opt.opt_id}
                    onClick={() => setSelected(opt.opt_id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 text-sm font-medium ${
                      selected === opt.opt_id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mr-2 font-bold text-slate-400">
                      {opt.opt_id === "o1" ? "A" : opt.opt_id === "o2" ? "B" : opt.opt_id === "o3" ? "C" : "D"}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={handleNext} disabled={!selected || loading}>
              {loading ? "분석 중..." : isLast ? "나의 학습 성향 보기" : "다음 질문"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase: result ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const primaryTrait = TRAITS.find((t) => t.id === result.primary_trait);
    const secondaryTrait = TRAITS.find((t) => t.id === result.secondary_trait && t.id !== result.primary_trait);
    const motivation = MOTIVATION_INFO[result.motivation_type] ?? { label: result.motivation_type, emoji: "💡" };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center mb-2">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900">분석 완료!</h1>
            <p className="text-slate-500 text-sm mt-1">{authUser.name}의 학습 성향이에요</p>
          </div>

          {primaryTrait && (
            <Card className={`border-2 ${primaryTrait.border} ${primaryTrait.bg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{primaryTrait.emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">주요 학습 유형</p>
                    <p className={`text-xl font-bold ${primaryTrait.color}`}>{primaryTrait.label}</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm">{primaryTrait.desc}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            {secondaryTrait && (
              <Card className="border">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">보조 유형</p>
                  <p className="font-semibold text-slate-700">{secondaryTrait.emoji} {secondaryTrait.label}</p>
                </CardContent>
              </Card>
            )}
            <Card className="border">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">동기 유형</p>
                <p className="font-semibold text-slate-700">{motivation.emoji} {motivation.label}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="text-xs text-indigo-600 font-medium">나의 AI 튜터</p>
                <p className="text-lg font-bold text-indigo-800">{result.tutor_persona}</p>
              </div>
              {result.confidence_score < 1 && (
                <Badge className="ml-auto bg-indigo-600">{Math.round(result.confidence_score * 100)}% 일치</Badge>
              )}
            </CardContent>
          </Card>

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg" onClick={() => router.push("/student/curriculum")}>
            과목 선택하기 →
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
