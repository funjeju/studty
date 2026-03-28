"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getParentDashboard, ParentDashboard } from "@/lib/api";
import { linkStudentToParent } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Heart, TrendingUp, AlertCircle, Calendar, ArrowLeft, Search, Link2 } from "lucide-react";
import Link from "next/link";

export default function ParentPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [studentId, setStudentId] = useState(user?.linkedStudentId || "");
  const [linkInput, setLinkInput] = useState("");
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  // 연동된 학생이 있으면 자동 로드
  useEffect(() => {
    if (user?.linkedStudentId) {
      setStudentId(user.linkedStudentId);
      handleLoad(user.linkedStudentId);
    }
  }, []);

  const handleLoad = async (sid?: string) => {
    const id = sid || studentId;
    if (!id.trim()) { toast.error("학생 ID를 입력해 주세요"); return; }
    setLoading(true);
    try {
      const data = await getParentDashboard(id.trim());
      setDashboard(data);
    } catch {
      toast.error("학생 정보를 찾을 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!user) { toast.error("먼저 로그인해 주세요"); return; }
    if (!linkInput.trim()) { toast.error("학생 ID를 입력해 주세요"); return; }
    setLinking(true);
    try {
      await linkStudentToParent(user.uid, linkInput.trim());
      setUser({ ...user, linkedStudentId: linkInput.trim() });
      setStudentId(linkInput.trim());
      toast.success("자녀가 연동되었습니다!");
      handleLoad(linkInput.trim());
    } catch (e: any) {
      toast.error(e.message || "연동에 실패했습니다.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Heart className="w-5 h-5 text-purple-600" />
          <span className="font-semibold">학부모 대시보드</span>
          {user && <Badge variant="outline" className="ml-auto">{user.name}</Badge>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 자녀 연동 (연동 안 된 경우) */}
        {!user?.linkedStudentId && (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-600" />
                자녀 계정 연동
              </CardTitle>
              <CardDescription>자녀의 학생 ID를 입력해 연동하세요. (자녀 앱 → 내 정보에서 확인)</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Input
                placeholder="학생 ID 붙여넣기"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLink()}
                className="flex-1"
              />
              <Button onClick={handleLink} disabled={linking} className="bg-purple-600 hover:bg-purple-700">
                {linking ? "연동 중..." : "연동하기"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 연동된 학생 ID 표시 + 수동 조회 */}
        <Card>
          <CardHeader>
            <CardTitle>오늘의 학습 결과 확인</CardTitle>
            {user?.linkedStudentId && (
              <CardDescription>연동된 자녀 ID: <code className="bg-slate-100 px-1 rounded text-xs">{user.linkedStudentId}</code></CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input
              placeholder="학생 ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              className="flex-1"
            />
            <Button onClick={() => handleLoad()} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "조회 중..." : "확인"}
            </Button>
          </CardContent>
        </Card>

        {dashboard && (
          <>
            {/* 코칭 메시지 */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-purple-700">오늘의 코칭 메시지</CardTitle>
                </div>
                <Badge variant="outline" className="w-fit">{dashboard.date}</Badge>
              </CardHeader>
              <CardContent>
                <blockquote className="text-slate-700 text-base leading-relaxed italic border-l-4 border-purple-300 pl-4">
                  "{dashboard.emotional_coaching_script}"
                </blockquote>
              </CardContent>
            </Card>

            {/* 학습 현황 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  오늘의 학습 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">완료한 퀘스트</span>
                  <span className="font-bold text-2xl text-green-600">{dashboard.completed_quests}개</span>
                </div>
                <Separator />
                {dashboard.strong_concepts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">잘 이해한 개념</p>
                    <div className="flex flex-wrap gap-2">
                      {dashboard.strong_concepts.map((c) => (
                        <Badge key={c} className="bg-green-100 text-green-700 hover:bg-green-100">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {dashboard.weak_concepts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> 더 공부가 필요한 개념
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {dashboard.weak_concepts.map((c) => (
                        <Badge key={c} className="bg-amber-100 text-amber-700 hover:bg-amber-100">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {dashboard.next_review_topics.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    앞으로 복습할 내용
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.next_review_topics.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        {t}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!dashboard && (
          <div className="text-center py-12 text-slate-400">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>자녀 ID를 연동하거나 입력하면 오늘의 학습 결과를 볼 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  );
}
