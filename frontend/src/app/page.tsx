import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Users, Star, Brain, Zap } from "lucide-react";

const roles = [
  {
    title: "학생",
    description: "오늘의 수업을 복습하고 나만의 학습 스타일을 발견해요",
    icon: BookOpen,
    href: "/auth?role=student",
    color: "bg-blue-500",
    badge: "초등학생",
  },
  {
    title: "선생님",
    description: "수업 내용을 업로드하고 학생들의 이해도를 확인해요",
    icon: GraduationCap,
    href: "/auth?role=teacher",
    color: "bg-green-500",
    badge: "교사",
  },
  {
    title: "학부모",
    description: "아이의 오늘 학습 결과와 코칭 가이드를 확인해요",
    icon: Users,
    href: "/auth?role=parent",
    color: "bg-purple-500",
    badge: "보호자",
  },
];

const features = [
  { icon: Brain, text: "학습 성향 분석", desc: "VARK 기반 개인화" },
  { icon: Star, text: "AI 맞춤 설명", desc: "성향별 우회 설명" },
  { icon: Zap, text: "망각 곡선 복습", desc: "최적 타이밍 알림" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AI-EBS 복습 시스템</span>
          </div>
          <Badge variant="secondary">MVP v1.0</Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
          초등학교 3학년 기준 MVP
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
          학교 수업을<br />
          <span className="text-blue-600">AI가 개인화 복습</span>으로 완성해요
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8">
          학습 성향 분석 → 자동 복습 생성 → 메타인지 피드백 → AI 맞춤 설명 →
          망각 곡선 스케줄링
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border text-sm">
              <f.icon className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{f.text}</span>
              <span className="text-slate-400">{f.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-center text-slate-500 text-sm font-medium mb-6 uppercase tracking-widest">
          시작하기
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card
              key={role.title}
              className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-slate-200"
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center mb-3`}>
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">{role.badge}</Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={role.href}>
                  <Button className="w-full group-hover:bg-slate-900 transition-colors">
                    입장하기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
