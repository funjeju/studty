"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signUp, signIn, UserRole } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Heart, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";

const ROLE_CONFIG = {
  student: {
    label: "학생",
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    btnClass: "bg-blue-600 hover:bg-blue-700",
  },
  teacher: {
    label: "선생님",
    icon: GraduationCap,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    btnClass: "bg-green-600 hover:bg-green-700",
  },
  parent: {
    label: "학부모",
    icon: Heart,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    btnClass: "bg-purple-600 hover:bg-purple-700",
  },
};

const REDIRECT: Record<UserRole, string> = {
  student: "/student/onboarding",
  teacher: "/teacher",
  parent: "/parent",
};

function AuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAppStore((s) => s.setProfile);

  const roleParam = (params.get("role") as UserRole) || "student";
  const role: UserRole = ["student", "teacher", "parent"].includes(roleParam) ? roleParam : "student";
  const cfg = ROLE_CONFIG[role];

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // 공통
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // 학생
  const [grade, setGrade] = useState("3");
  const [school, setSchool] = useState("");
  // 선생님
  const [teacherGrade, setTeacherGrade] = useState("3");
  const [classNum, setClassNum] = useState("1");
  const [subject, setSubject] = useState("");
  // 학부모 — 학생 ID 검증 단계
  const [parentStep, setParentStep] = useState<"verify" | "form">("verify");
  const [verifyStudentId, setVerifyStudentId] = useState("");
  const [verifiedStudentName, setVerifiedStudentName] = useState("");
  const [verifying, setVerifying] = useState(false);

  // 학부모 회원가입: 학생 ID 검증
  const handleVerifyStudent = async () => {
    if (!verifyStudentId.trim()) { toast.error("학생 ID를 입력해 주세요"); return; }
    setVerifying(true);
    try {
      const snap = await getDoc(doc(db, "students", verifyStudentId.trim()));
      if (!snap.exists()) {
        toast.error("등록된 학생을 찾을 수 없습니다. 학생 ID를 다시 확인해 주세요.");
        return;
      }
      const data = snap.data();
      setVerifiedStudentName(data.name);
      setParentStep("form");
      toast.success(`${data.name} 학생을 찾았습니다! 회원가입을 계속해 주세요.`);
    } catch {
      toast.error("확인 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { toast.error("이메일과 비밀번호를 입력해 주세요"); return; }
    setLoading(true);
    try {
      const user = await signIn(email, password);
      if (user.role !== role) {
        toast.error(`이 계정은 ${ROLE_CONFIG[user.role].label} 계정입니다. 올바른 입장 버튼을 눌러주세요.`);
        return;
      }
      setUser(user);
      toast.success(`안녕하세요, ${user.name}!`);

      // 학생인 경우 학습 프로필 확인 → 있으면 바로 과목 선택으로
      if (user.role === "student") {
        try {
          const profileSnap = await getDoc(doc(db, "learning_profiles", user.uid));
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as any);
            router.push("/student/curriculum");
            return;
          }
        } catch {
          // 프로필 조회 실패 시 온보딩으로
        }
      }

      router.push(REDIRECT[user.role]);
    } catch (e: any) {
      toast.error("로그인 실패: 이메일/비밀번호를 확인해 주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) { toast.error("모든 필수 항목을 입력해 주세요"); return; }
    if (password.length < 6) { toast.error("비밀번호는 6자 이상이어야 합니다"); return; }
    setLoading(true);
    try {
      const user = await signUp(email, password, role, {
        name,
        grade: role === "student" ? Number(grade) : role === "teacher" ? Number(teacherGrade) : undefined,
        classNum: Number(classNum),
        school: school || undefined,
        subject: role === "teacher" ? subject || undefined : undefined,
        linkedStudentId: role === "parent" ? verifyStudentId : undefined,
      });
      setUser(user);
      toast.success(`가입 완료! 반가워요, ${user.name}!`);
      router.push(REDIRECT[role]);
    } catch (e: any) {
      console.error("Signup error:", e.code, e.message, e);
      const msg = e.code === "auth/email-already-in-use"
        ? "이미 사용 중인 이메일입니다"
        : `[${e.code}] ${e.message || "회원가입에 실패했습니다"}`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: role === "student" ? "linear-gradient(135deg, #eff6ff, #eef2ff)"
        : role === "teacher" ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)"
        : "linear-gradient(135deg, #faf5ff, #fdf2f8)"
    }}>
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>

        <Card className={`shadow-lg border-2 ${cfg.border}`}>
          <CardHeader className="text-center pb-2">
            <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
              <cfg.icon className={`w-8 h-8 ${cfg.color}`} />
            </div>
            <CardTitle className="text-2xl">{cfg.label} {tab === "login" ? "로그인" : "회원가입"}</CardTitle>
            <CardDescription>
              {tab === "login" ? "기존 계정으로 로그인하세요" : "새 계정을 만들어 시작하세요"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); setParentStep("verify"); }}>
              <TabsList className="grid grid-cols-2 mb-5">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>

              {/* ─── 로그인 ─── */}
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>비밀번호</Label>
                  <Input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                </div>
                <Button className={`w-full ${cfg.btnClass}`} size="lg" onClick={handleLogin} disabled={loading}>
                  {loading ? "로그인 중..." : `${cfg.label}으로 로그인`}
                </Button>
              </TabsContent>

              {/* ─── 회원가입 ─── */}
              <TabsContent value="signup" className="space-y-4">

                {/* 학부모: Step 1 — 학생 ID 검증 */}
                {role === "parent" && parentStep === "verify" && (
                  <div className="space-y-4">
                    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
                      <p className={`text-sm font-semibold ${cfg.color} mb-1`}>먼저 자녀 계정을 확인해요</p>
                      <p className="text-xs text-slate-500">
                        자녀가 학생으로 가입했다면, 학생 앱 → 내 정보에서 학생 ID를 확인할 수 있습니다.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>자녀의 학생 ID *</Label>
                      <Input
                        placeholder="학생 ID 붙여넣기"
                        value={verifyStudentId}
                        onChange={(e) => setVerifyStudentId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyStudent()}
                      />
                    </div>
                    <Button className={`w-full ${cfg.btnClass}`} size="lg" onClick={handleVerifyStudent} disabled={verifying}>
                      {verifying ? "확인 중..." : "자녀 계정 확인하기"}
                    </Button>
                  </div>
                )}

                {/* 학부모: Step 2 — 검증 완료 후 회원가입 폼 */}
                {role === "parent" && parentStep === "form" && (
                  <>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700">{verifiedStudentName} 학생 확인 완료</p>
                        <p className="text-xs text-green-600">가입 후 자동으로 연동됩니다</p>
                      </div>
                    </div>
                    <SignupForm
                      role={role}
                      cfg={cfg}
                      name={name} setName={setName}
                      email={email} setEmail={setEmail}
                      password={password} setPassword={setPassword}
                      grade={grade} setGrade={setGrade}
                      school={school} setSchool={setSchool}
                      subject={subject} setSubject={setSubject}
                      loading={loading}
                      onSubmit={handleSignup}
                    />
                  </>
                )}

                {/* 학생 / 선생님 회원가입 폼 */}
                {role !== "parent" && (
                  <SignupForm
                    role={role}
                    cfg={cfg}
                    name={name} setName={setName}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    grade={grade} setGrade={setGrade}
                    school={school} setSchool={setSchool}
                    teacherGrade={teacherGrade} setTeacherGrade={setTeacherGrade}
                    classNum={classNum} setClassNum={setClassNum}
                    subject={subject} setSubject={setSubject}
                    loading={loading}
                    onSubmit={handleSignup}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignupForm({ role, cfg, name, setName, email, setEmail, password, setPassword,
  grade, setGrade, school, setSchool,
  teacherGrade, setTeacherGrade, classNum, setClassNum, subject, setSubject,
  loading, onSubmit }: any) {
  return (
    <>
      <div className="space-y-2">
        <Label>이름 *</Label>
        <Input placeholder="이름 입력" value={name} onChange={(e: any) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>이메일 *</Label>
        <Input type="email" placeholder="example@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>비밀번호 * (6자 이상)</Label>
        <Input type="password" placeholder="••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} />
      </div>

      {role === "student" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>학년</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map((g) => <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>반</Label>
              <Select value={classNum} onValueChange={setClassNum}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map((c) => <SelectItem key={c} value={String(c)}>{c}반</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>학교 (선택)</Label>
              <Input placeholder="학교명" value={school} onChange={(e: any) => setSchool(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {role === "teacher" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>담임 학년 *</Label>
              <Select value={teacherGrade} onValueChange={setTeacherGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map((g) => <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>담임 반 *</Label>
              <Select value={classNum} onValueChange={setClassNum}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map((c) => <SelectItem key={c} value={String(c)}>{c}반</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>학교 (선택)</Label>
              <Input placeholder="학교명" value={school} onChange={(e: any) => setSchool(e.target.value)} />
            </div>
          </div>
        </>
      )}

      <Button className={`w-full ${cfg.btnClass}`} size="lg" onClick={onSubmit} disabled={loading}>
        {loading ? "처리 중..." : `${cfg.label} 가입하기`}
      </Button>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}
