"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    gradient: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/20",
    accent: "text-blue-400",
    ring: "focus-visible:ring-blue-500/30",
    btn: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 shadow-lg shadow-blue-500/20",
    tabActive: "bg-blue-500/10 text-blue-300",
  },
  teacher: {
    label: "선생님",
    icon: GraduationCap,
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/20",
    accent: "text-emerald-400",
    ring: "focus-visible:ring-emerald-500/30",
    btn: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20",
    tabActive: "bg-emerald-500/10 text-emerald-300",
  },
  parent: {
    label: "학부모",
    icon: Heart,
    gradient: "from-violet-500 to-purple-500",
    glow: "shadow-violet-500/20",
    accent: "text-violet-400",
    ring: "focus-visible:ring-violet-500/30",
    btn: "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/20",
    tabActive: "bg-violet-500/10 text-violet-300",
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("3");
  const [school, setSchool] = useState("");
  const [classNum, setClassNum] = useState("1");
  const [teacherGrade, setTeacherGrade] = useState("3");
  const [subject, setSubject] = useState("");
  const [parentStep, setParentStep] = useState<"verify" | "form">("verify");
  const [verifyStudentId, setVerifyStudentId] = useState("");
  const [verifiedStudentName, setVerifiedStudentName] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerifyStudent = async () => {
    if (!verifyStudentId.trim()) { toast.error("학생 ID를 입력해 주세요"); return; }
    setVerifying(true);
    try {
      const snap = await getDoc(doc(db, "students", verifyStudentId.trim()));
      if (!snap.exists()) { toast.error("등록된 학생을 찾을 수 없습니다."); return; }
      const data = snap.data();
      setVerifiedStudentName(data.name);
      setParentStep("form");
      toast.success(`${data.name} 학생을 찾았습니다!`);
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
        toast.error(`이 계정은 ${ROLE_CONFIG[user.role].label} 계정입니다.`);
        return;
      }
      setUser(user);
      toast.success(`안녕하세요, ${user.name}!`);
      if (user.role === "student") {
        try {
          const profileSnap = await getDoc(doc(db, "learning_profiles", user.uid));
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as any);
            router.push("/student/curriculum");
            return;
          }
        } catch {}
      }
      router.push(REDIRECT[user.role]);
    } catch {
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
      const msg = e.code === "auth/email-already-in-use"
        ? "이미 사용 중인 이메일입니다"
        : `회원가입에 실패했습니다 (${e.code})`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[130px] opacity-20 ${
          role === "student" ? "bg-blue-600" : role === "teacher" ? "bg-emerald-600" : "bg-violet-600"
        }`} />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Card header gradient bar */}
          <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

          <div className="p-8">
            {/* Role icon + title */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg ${cfg.glow}`}>
                <cfg.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {cfg.label} {tab === "login" ? "로그인" : "회원가입"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tab === "login" ? "기존 계정으로 로그인하세요" : "새 계정을 만들어 시작하세요"}
                </p>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); setParentStep("verify"); }}>
              <TabsList className="grid grid-cols-2 mb-6 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-slate-400 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  로그인
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-slate-400 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  회원가입
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login" className="space-y-4 mt-0">
                <DarkInput label="이메일" type="email" placeholder="example@email.com" value={email} onChange={setEmail} />
                <DarkInput label="비밀번호" type="password" placeholder="••••••" value={password} onChange={setPassword} onEnter={handleLogin} />
                <Button
                  className={`w-full h-11 font-semibold text-white border-0 ${cfg.btn} mt-2`}
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "로그인 중..." : `${cfg.label}으로 로그인`}
                </Button>
              </TabsContent>

              {/* Signup */}
              <TabsContent value="signup" className="space-y-4 mt-0">
                {role === "parent" && parentStep === "verify" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
                      <p className={`text-sm font-semibold mb-1 ${cfg.accent}`}>먼저 자녀 계정을 확인해요</p>
                      <p className="text-xs text-slate-500">학생 앱 → 내 정보에서 학생 ID를 확인할 수 있어요</p>
                    </div>
                    <DarkInput label="자녀의 학생 ID" placeholder="학생 ID 붙여넣기" value={verifyStudentId} onChange={setVerifyStudentId} onEnter={handleVerifyStudent} />
                    <Button className={`w-full h-11 font-semibold text-white border-0 ${cfg.btn}`} onClick={handleVerifyStudent} disabled={verifying}>
                      {verifying ? "확인 중..." : "자녀 계정 확인하기"}
                    </Button>
                  </div>
                )}

                {role === "parent" && parentStep === "form" && (
                  <>
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">{verifiedStudentName} 학생 확인 완료</p>
                        <p className="text-xs text-emerald-500/70">가입 후 자동으로 연동됩니다</p>
                      </div>
                    </div>
                    <SignupForm role={role} cfg={cfg} name={name} setName={setName} email={email} setEmail={setEmail}
                      password={password} setPassword={setPassword} grade={grade} setGrade={setGrade}
                      school={school} setSchool={setSchool} subject={subject} setSubject={setSubject}
                      classNum={classNum} setClassNum={setClassNum}
                      teacherGrade={teacherGrade} setTeacherGrade={setTeacherGrade}
                      loading={loading} onSubmit={handleSignup} />
                  </>
                )}

                {role !== "parent" && (
                  <SignupForm role={role} cfg={cfg} name={name} setName={setName} email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword} grade={grade} setGrade={setGrade}
                    school={school} setSchool={setSchool} subject={subject} setSubject={setSubject}
                    classNum={classNum} setClassNum={setClassNum}
                    teacherGrade={teacherGrade} setTeacherGrade={setTeacherGrade}
                    loading={loading} onSubmit={handleSignup} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkInput({ label, type = "text", placeholder, value, onChange, onEnter }: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; onEnter?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="h-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-white/20 focus:bg-white/[0.06] rounded-lg"
      />
    </div>
  );
}

function DarkSelect({ label, value, onValueChange, children }: {
  label: string; value: string; onValueChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 bg-white/[0.04] border-white/[0.08] text-white focus:border-white/20 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0d1224] border-white/[0.08] text-white">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function SignupForm({ role, cfg, name, setName, email, setEmail, password, setPassword,
  grade, setGrade, school, setSchool, classNum, setClassNum,
  teacherGrade, setTeacherGrade, subject, setSubject, loading, onSubmit }: any) {
  return (
    <>
      <DarkInput label="이름 *" placeholder="이름 입력" value={name} onChange={setName} />
      <DarkInput label="이메일 *" type="email" placeholder="example@email.com" value={email} onChange={setEmail} />
      <DarkInput label="비밀번호 * (6자 이상)" type="password" placeholder="••••••" value={password} onChange={setPassword} onEnter={onSubmit} />

      {role === "student" && (
        <div className="grid grid-cols-3 gap-2">
          <DarkSelect label="학년" value={grade} onValueChange={setGrade}>
            {[1,2,3,4,5,6].map((g) => <SelectItem key={g} value={String(g)} className="text-white focus:bg-white/10">{g}학년</SelectItem>)}
          </DarkSelect>
          <DarkSelect label="반" value={classNum} onValueChange={setClassNum}>
            {[1,2,3,4,5,6,7,8,9,10].map((c) => <SelectItem key={c} value={String(c)} className="text-white focus:bg-white/10">{c}반</SelectItem>)}
          </DarkSelect>
          <DarkInput label="학교 (선택)" placeholder="학교명" value={school} onChange={setSchool} />
        </div>
      )}

      {role === "teacher" && (
        <div className="grid grid-cols-3 gap-2">
          <DarkSelect label="담임 학년" value={teacherGrade} onValueChange={setTeacherGrade}>
            {[1,2,3,4,5,6].map((g) => <SelectItem key={g} value={String(g)} className="text-white focus:bg-white/10">{g}학년</SelectItem>)}
          </DarkSelect>
          <DarkSelect label="담임 반" value={classNum} onValueChange={setClassNum}>
            {[1,2,3,4,5,6,7,8,9,10].map((c) => <SelectItem key={c} value={String(c)} className="text-white focus:bg-white/10">{c}반</SelectItem>)}
          </DarkSelect>
          <DarkInput label="학교 (선택)" placeholder="학교명" value={school} onChange={setSchool} />
        </div>
      )}

      <Button
        className={`w-full h-11 font-semibold text-white border-0 ${cfg.btn} mt-1`}
        onClick={onSubmit}
        disabled={loading}
      >
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
