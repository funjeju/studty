import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Users, Brain, Zap, Sparkles, ArrowRight, Star } from "lucide-react";

const roles = [
  {
    title: "학생",
    subtitle: "오늘의 복습 시작",
    description: "AI가 내 학습 스타일에 딱 맞는 복습 자료를 만들어줘요",
    icon: BookOpen,
    href: "/auth?role=student",
    gradient: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/25",
    border: "hover:border-blue-400/50",
    tag: "학생",
    emoji: "🎒",
    accent: "text-blue-400",
  },
  {
    title: "선생님",
    subtitle: "수업 자료 관리",
    description: "수업 내용을 AI가 분석해 학생 맞춤 복습 자료를 자동 생성해요",
    icon: GraduationCap,
    href: "/auth?role=teacher",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/25",
    border: "hover:border-emerald-400/50",
    tag: "교사",
    emoji: "📚",
    accent: "text-emerald-400",
  },
  {
    title: "학부모",
    subtitle: "아이 학습 확인",
    description: "자녀의 오늘 학습 결과와 AI 맞춤 코칭 가이드를 받아보세요",
    icon: Users,
    href: "/auth?role=parent",
    gradient: "from-violet-500 to-purple-500",
    glow: "shadow-violet-500/25",
    border: "hover:border-violet-400/50",
    tag: "보호자",
    emoji: "💜",
    accent: "text-violet-400",
  },
];

const features = [
  { icon: Brain, text: "VARK 학습 성향 분석", color: "text-blue-500 bg-blue-50" },
  { icon: Star, text: "AI 맞춤 설명 생성", color: "text-amber-500 bg-amber-50" },
  { icon: Zap, text: "망각 곡선 복습", color: "text-violet-500 bg-violet-50" },
  { icon: Sparkles, text: "메타인지 피드백", color: "text-emerald-500 bg-emerald-50" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050814] text-white overflow-hidden relative">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">AI-EBS 복습 시스템</span>
          </div>
          <Badge className="bg-white/5 text-slate-400 border-white/10 text-xs">MVP v1.0</Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 mb-8 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-blue-400" />
          초등학교 AI 맞춤 학습 플랫폼
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 leading-[1.08]">
          학교 수업을
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI가 완성해요
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-md mx-auto mb-12 leading-relaxed">
          학습 성향 분석 → 맞춤 복습 생성 → 메타인지 피드백 → 망각 곡선 스케줄링
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-20">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 backdrop-blur-sm"
            >
              <div className={`w-5 h-5 rounded-full ${f.color} flex items-center justify-center`}>
                <f.icon className="w-3 h-3" />
              </div>
              {f.text}
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <p className="text-center text-slate-600 text-xs font-semibold mb-8 uppercase tracking-[0.2em]">
          역할 선택
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Link key={role.title} href={role.href} className="group block">
              <div
                className={`relative h-full p-7 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm transition-all duration-300 group-hover:bg-white/[0.06] group-hover:border-white/[0.12] group-hover:-translate-y-1 group-hover:shadow-2xl ${role.glow} ${role.border}`}
              >
                {/* Top gradient line */}
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />

                <div className="text-4xl mb-5">{role.emoji}</div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">{role.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium">
                    {role.tag}
                  </span>
                </div>

                <p className={`text-sm font-semibold mb-2 bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}>
                  {role.subtitle}
                </p>

                <p className="text-sm text-slate-500 leading-relaxed mb-7">{role.description}</p>

                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-400 group-hover:text-white transition-colors duration-200">
                  시작하기
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
