"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import {
  GraduationCap, Upload, ArrowLeft, BookOpen,
  Mic, MicOff, Loader2, ChevronRight, ChevronDown,
  AlertCircle, FileText, CheckCircle2, Play, Users,
  Plus, Pencil, Trash2, Camera, FileSpreadsheet, Calendar,
  Eye, EyeOff, Clock,
} from "lucide-react";
import Link from "next/link";
import { api, CurriculumUnit, CurriculumMap } from "@/lib/api";

const SUBJECTS_BY_GRADE: Record<number, string[]> = {
  1: ["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"],
  2: ["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"],
  3: ["국어", "영어", "수학", "사회", "과학", "도덕", "음악", "미술", "체육"],
  4: ["국어", "영어", "수학", "사회", "과학", "도덕", "음악", "미술", "체육"],
  5: ["국어", "영어", "수학", "사회", "과학", "도덕", "실과", "음악", "미술", "체육"],
  6: ["국어", "영어", "수학", "사회", "과학", "도덕", "실과", "음악", "미술", "체육"],
};

const ISSUE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  praise:     { label: "칭찬",   color: "bg-green-100 text-green-700" },
  discipline: { label: "훈육",   color: "bg-orange-100 text-orange-700" },
  conflict:   { label: "다툼",   color: "bg-yellow-100 text-yellow-700" },
  bullying:   { label: "학폭",   color: "bg-red-100 text-red-700" },
  other:      { label: "기타",   color: "bg-slate-100 text-slate-600" },
};

interface StudentInfo {
  num: number;
  name: string;
  photo_url: string;
  memo: string;
}

interface ReviewRow {
  num: number;
  name: string;
  photo_url: string;
  viewed: boolean;
  duration_sec: number;
  pre_correct: number | null;
  pre_total: number | null;
  post_correct: number | null;
  post_total: number | null;
  subject: string;
}

interface IssueLog {
  issue_id: string;
  student_name: string;
  date: string;
  type: string;
  summary: string;
  lesson_topic: string;
}

interface AiResult {
  topic: string;
  summary: string;
  lesson_summary?: string;
  core_concepts: string[];
  examples: string[];
  other_notes: string[];
  pre_test?: unknown[];
  concept_definitions?: unknown[];
  post_test?: unknown[];
  video_search_query?: string;
  vark_tips?: Record<string, string>;
}

interface ClassifyResult {
  classify_id: string;
  lesson_content: {
    has_content: boolean;
    topic: string;
    summary: string;
    core_concepts: string[];
    raw_text: string;
  };
  student_records: Array<{ student_name: string; type: string; summary: string; detail: string }>;
  notices: Array<{ type: string; summary: string; detail: string; target: string }>;
}

interface Recording {
  id: string;
  dateStr: string;
  timeStr: string;
  subject: string;
  blob: Blob;
  blobUrl: string;
  status: "recorded" | "processing" | "ready" | "uploading" | "uploaded";
  aiResult?: AiResult;
  expanded: boolean;
  selectedUnit: CurriculumUnit | null;
  unitPickerOpen: boolean;
  unitCurriculum: CurriculumMap | null;
  loadingUnits: boolean;
}

// 이미지를 80x80 이하 base64 jpeg로 리사이즈
function resizeToBase64(file: File, maxSize = 80): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = url;
  });
}

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string; size?: number }) {
  if (photoUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  );
  const initials = name.slice(0, 1);
  return (
    <div className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

export default function TeacherPage() {
  const user = useAuthStore((s) => s.user);
  const grade = user?.grade || 3;
  const subjects = SUBJECTS_BY_GRADE[grade] || SUBJECTS_BY_GRADE[3];

  // ── 커리큘럼 탭 ──
  const [currSubject, setCurrSubject] = useState(subjects[0]);
  const [curriculum, setCurriculum] = useState<CurriculumMap | null>(null);
  const [loadingCurr, setLoadingCurr] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<CurriculumUnit | null>(null);
  const [currSource, setCurrSource] = useState<"teacher_upload" | "ai" | null>(null);
  const [uploadingCurr, setUploadingCurr] = useState(false);

  // ── 수업 녹음 탭 ──
  const [uploadSubject, setUploadSubject] = useState(subjects[0]);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 녹음 3분류 ──
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);

  // ── 학생 관리 탭 ──
  const [roster, setRoster] = useState<StudentInfo[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [editingNum, setEditingNum] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<StudentInfo>({ num: 0, name: "", photo_url: "", memo: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ num: 1, name: "", memo: "" });
  // 복습 현황
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  // 이슈 로그
  const [issues, setIssues] = useState<IssueLog[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesLoaded, setIssuesLoaded] = useState(false);
  const [filterStudent, setFilterStudent] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // ── 공통 커리큘럼 로더 ──
  const loadCurriculum = async (subject: string, forUpload = false) => {
    if (!user) return null;
    if (!forUpload) setLoadingCurr(true);
    try {
      const res = await api.get(`/curriculum/teacher?teacher_uid=${user.uid}&subject=${encodeURIComponent(subject)}`);
      if (!forUpload) { setCurriculum(res.data); setCurrSource("teacher_upload"); }
      return res.data as CurriculumMap;
    } catch {
      try {
        const res = await api.get(`/curriculum/map?grade=${grade}&subject=${encodeURIComponent(subject)}`);
        if (!forUpload) { setCurriculum(res.data); setCurrSource("ai"); }
        return res.data as CurriculumMap;
      } catch {
        toast.error("커리큘럼을 불러오지 못했습니다");
        if (!forUpload) { setCurriculum(null); setCurrSource(null); }
        return null;
      }
    } finally {
      if (!forUpload) setLoadingCurr(false);
    }
  };

  const saveCurriculum = async () => {
    if (!user || !curriculum) return;
    try {
      await api.post("/curriculum/teacher", { teacher_uid: user.uid, subject: currSubject, units: curriculum.units });
      setCurrSource("teacher_upload");
      toast.success("커리큘럼이 저장됐습니다. 학생들에게 최우선 적용됩니다.");
    } catch { toast.error("저장 실패"); }
  };

  const handleCurriculumFileUpload = async (file: File) => {
    if (!user) return;
    setUploadingCurr(true);
    const form = new FormData();
    form.append("teacher_uid", user.uid);
    form.append("subject", currSubject);
    form.append("grade", String(grade));
    form.append("file", file);
    try {
      const res = await api.post("/curriculum/upload-file", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCurriculum({ grade: res.data.grade, subject: res.data.subject, units: res.data.units, cached: true });
      setCurrSource("teacher_upload");
      setSelectedUnit(null);
      toast.success(`${res.data.count}차시 커리큘럼이 추출됐습니다 (${res.data.source_filename}). 학생들에게 최우선 적용됩니다.`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "파일 처리 실패. 다시 시도해 주세요.");
    } finally {
      setUploadingCurr(false);
    }
  };

  // ── 녹음 ──
  const fmt = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        saveRecordingLocally(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        setRecordSec(0); setRecording(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true); setRecordSec(0);
      timerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    } catch { toast.error("마이크 접근 권한이 필요합니다"); }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const saveRecordingLocally = (blob: Blob) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dateStr.replace(/-/g, "")}_${timeStr.replace(":", "")}_${uploadSubject}.webm`;
    a.click();
    setRecordings((prev) => [{
      id: crypto.randomUUID(), dateStr, timeStr, subject: uploadSubject,
      blob, blobUrl: url, status: "recorded", expanded: false,
      selectedUnit: null, unitPickerOpen: false, unitCurriculum: null, loadingUnits: false,
    }, ...prev]);
    toast.success("녹음 파일이 저장됐습니다");
  };

  const updateRec = (id: string, patch: Partial<Recording>) =>
    setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const processAi = async (rec: Recording) => {
    updateRec(rec.id, { status: "processing" });
    try {
      const audio_base64 = await blobToBase64(rec.blob);
      const res = await api.post("/lecture/transcribe", {
        teacher_id: user?.uid, grade, subject: rec.subject, audio_base64,
      });
      updateRec(rec.id, { status: "ready", aiResult: res.data as AiResult, expanded: true });
      toast.success("AI 정리 완료! 내용을 확인하고 업로드하세요.");
    } catch {
      updateRec(rec.id, { status: "recorded" });
      toast.error("AI 정리 실패. 다시 시도하세요.");
    }
  };

  const openUnitPicker = async (rec: Recording) => {
    updateRec(rec.id, { unitPickerOpen: true });
    if (rec.unitCurriculum) return;
    updateRec(rec.id, { loadingUnits: true });
    const curr = await loadCurriculum(rec.subject, true);
    updateRec(rec.id, { unitCurriculum: curr, loadingUnits: false });
  };

  const uploadRecording = async (rec: Recording) => {
    if (!user || !rec.aiResult) return;
    updateRec(rec.id, { status: "uploading" });
    try {
      await api.post("/lecture/upload", {
        teacher_id: user.uid, subject: rec.subject,
        chacha_num: rec.selectedUnit?.chacha_num ?? null,
        lesson_topic: rec.aiResult.topic || rec.subject + " 수업",
        learning_goal: rec.aiResult.summary,
        core_concepts: rec.aiResult.core_concepts,
        examples: rec.aiResult.examples,
        lesson_summary: rec.aiResult.lesson_summary,
        pre_test: rec.aiResult.pre_test,
        concept_definitions: rec.aiResult.concept_definitions,
        post_test: rec.aiResult.post_test,
        video_search_query: rec.aiResult.video_search_query,
        vark_tips: rec.aiResult.vark_tips,
      });
      updateRec(rec.id, { status: "uploaded", unitPickerOpen: false });
      toast.success("업로드 완료! 학생들이 바로 복습할 수 있어요.");
    } catch {
      updateRec(rec.id, { status: "ready" });
      toast.error("업로드 실패. 다시 시도하세요.");
    }
  };

  const classifyAudio = async (file: File) => {
    if (!user) return;
    setClassifyLoading(true);
    setClassifyResult(null);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.post("/lecture/classify", {
        teacher_id: user.uid,
        grade,
        subject: uploadSubject,
        audio_base64: base64,
      });
      setClassifyResult(res.data as ClassifyResult);
      toast.success("AI 3분류 분석 완료!");
    } catch {
      toast.error("분석 실패. 다시 시도하세요.");
    } finally {
      setClassifyLoading(false);
    }
  };

  // ── 학생 명단 ──
  const loadRoster = async () => {
    if (!user) return;
    setLoadingRoster(true);
    try {
      const res = await api.get(`/roster/students?teacher_uid=${user.uid}`);
      setRoster(res.data.students || []);
      setRosterLoaded(true);
    } catch { toast.error("명단을 불러오지 못했습니다"); }
    finally { setLoadingRoster(false); }
  };

  const saveStudent = async (student: StudentInfo) => {
    if (!user) return;
    try {
      await api.put(`/roster/students/${student.num}?teacher_uid=${user.uid}`, {
        teacher_uid: user.uid, ...student,
      });
      setRoster((prev) => prev.map((s) => s.num === student.num ? student : s));
      setEditingNum(null);
      toast.success("저장됐습니다");
    } catch { toast.error("저장 실패"); }
  };

  const addStudent = async () => {
    if (!user || !addForm.name.trim()) { toast.error("이름을 입력하세요"); return; }
    try {
      await api.post("/roster/students", { teacher_uid: user.uid, ...addForm, photo_url: "" });
      setRoster((prev) => [...prev, { ...addForm, photo_url: "" }].sort((a, b) => a.num - b.num));
      setShowAddForm(false);
      setAddForm({ num: (roster[roster.length - 1]?.num ?? 0) + 1, name: "", memo: "" });
      toast.success("학생이 추가됐습니다");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "추가 실패");
    }
  };

  const deleteStudent = async (num: number) => {
    if (!user || !confirm("삭제하시겠습니까?")) return;
    try {
      await api.delete(`/roster/students/${num}?teacher_uid=${user.uid}`);
      setRoster((prev) => prev.filter((s) => s.num !== num));
      toast.success("삭제됐습니다");
    } catch { toast.error("삭제 실패"); }
  };

  const handlePhotoUpload = async (num: number, file: File) => {
    if (!user) return;
    try {
      const base64 = await resizeToBase64(file, 80);
      await api.patch(`/roster/students/${num}/photo?teacher_uid=${user.uid}`, null, { params: { photo_url: base64 } });
      setRoster((prev) => prev.map((s) => s.num === num ? { ...s, photo_url: base64 } : s));
    } catch { toast.error("사진 업로드 실패"); }
  };

  const handleExcelUpload = async (file: File) => {
    if (!user) return;
    const form = new FormData();
    form.append("teacher_uid", user.uid);
    form.append("file", file);
    try {
      const res = await api.post("/roster/students/excel", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRoster(res.data.students || []);
      setRosterLoaded(true);
      toast.success(`${res.data.count}명의 명단이 업로드됐습니다`);
    } catch { toast.error("엑셀 파싱 실패. A:번호 B:이름 C:메모 형식인지 확인하세요"); }
  };

  const loadReviews = async () => {
    if (!user) return;
    setLoadingReviews(true);
    try {
      const res = await api.get(`/roster/reviews?teacher_uid=${user.uid}&date=${reviewDate}`);
      setReviews(res.data.students || []);
    } catch { toast.error("복습 현황을 불러오지 못했습니다"); }
    finally { setLoadingReviews(false); }
  };

  const loadIssues = async () => {
    if (!user) return;
    setLoadingIssues(true);
    try {
      const params = new URLSearchParams({ teacher_uid: user.uid });
      if (filterStudent && filterStudent !== "all") params.set("student_name", filterStudent);
      if (filterType && filterType !== "all") params.set("issue_type", filterType);
      const res = await api.get(`/roster/issues?${params}`);
      setIssues(res.data.issues || []);
      setIssuesLoaded(true);
    } catch { toast.error("이슈 로그를 불러오지 못했습니다"); }
    finally { setLoadingIssues(false); }
  };

  const statusLabel: Record<Recording["status"], string> = {
    recorded: "녹음완료", processing: "AI 정리 중", ready: "정리완료", uploading: "업로드 중", uploaded: "업로드완료",
  };
  const statusColor: Record<Recording["status"], string> = {
    recorded: "bg-slate-100 text-slate-700", processing: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700", uploading: "bg-yellow-100 text-yellow-700",
    uploaded: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-700"><ArrowLeft className="w-4 h-4" /></Link>
          <GraduationCap className="w-5 h-5 text-green-600" />
          <span className="font-semibold">선생님 대시보드</span>
          {user && (
            <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">{user.name} 선생님</span>
              <Badge variant="outline">{grade}학년 {user.classNum}반</Badge>
              {user.school && <Badge variant="secondary">{user.school}</Badge>}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="curriculum">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="curriculum"><BookOpen className="w-4 h-4 mr-1.5" />커리큘럼</TabsTrigger>
            <TabsTrigger value="lesson"><Mic className="w-4 h-4 mr-1.5" />수업 녹음</TabsTrigger>
            <TabsTrigger value="students" onClick={() => { if (!rosterLoaded) loadRoster(); }}>
              <Users className="w-4 h-4 mr-1.5" />학생 관리
            </TabsTrigger>
          </TabsList>

          {/* ══ 커리큘럼 탭 ══ */}
          <TabsContent value="curriculum" className="space-y-4">
            {/* 과목 선택 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>과목별 커리큘럼</CardTitle>
                <CardDescription>
                  선생님이 직접 업로드한 커리큘럼이 AI 생성 커리큘럼보다 <strong>우선 적용</strong>됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 과목 선택 */}
                <div className="flex items-center gap-3">
                  <Select value={currSubject} onValueChange={(v) => { setCurrSubject(v); setCurriculum(null); setSelectedUnit(null); setCurrSource(null); }}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-sm text-slate-400">{grade}학년 {user?.classNum}반 · {currSubject}</span>
                </div>

                <Separator />

                {/* 방법 1: 엑셀 직접 업로드 (최우선) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-white hover:bg-green-600">최우선 적용</Badge>
                    <p className="text-sm font-semibold text-slate-700">선생님 커리큘럼 업로드</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>어떤 파일이든 업로드 가능합니다.</strong> AI가 내용을 분석해서 차시별 커리큘럼으로 자동 정리합니다.<br />
                      <span className="text-slate-400">엑셀·PDF·Word·이미지·텍스트·한글 파일 등 형식 무관</span>
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className={`cursor-pointer ${uploadingCurr ? "pointer-events-none" : ""}`}>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) handleCurriculumFileUpload(e.target.files[0]); e.target.value = ""; }}
                        />
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${uploadingCurr ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-green-600 text-white border-green-600 hover:bg-green-700 cursor-pointer"}`}>
                          {uploadingCurr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingCurr ? "AI가 분석 중..." : "파일 선택 & AI 분석"}
                        </span>
                      </label>
                      {currSource === "teacher_upload" && (
                        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" />선생님 커리큘럼 적용 중
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex-1 border-t" />
                  <span className="text-xs">또는</span>
                  <div className="flex-1 border-t" />
                </div>

                {/* 방법 2: AI 생성 커리큘럼 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">AI 생성 (기본)</Badge>
                    <p className="text-sm font-semibold text-slate-700">AI 자동 커리큘럼 생성</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => loadCurriculum(currSubject)} disabled={loadingCurr}>
                      {loadingCurr ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                      AI 커리큘럼 불러오기
                    </Button>
                    {curriculum && currSource === "ai" && (
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveCurriculum}>
                        <Upload className="w-4 h-4 mr-2" />우리 반에 저장·적용
                      </Button>
                    )}
                  </div>
                  {currSource === "ai" && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      AI 생성 커리큘럼은 선생님이 직접 업로드한 커리큘럼이 없을 때만 학생에게 적용됩니다.
                    </p>
                  )}
                </div>

                {/* 커리큘럼 미리보기 */}
                {curriculum && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-500 font-medium">{grade}학년 {currSubject} — 총 {curriculum.units.length}차시</p>
                      {currSource === "teacher_upload" && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">선생님 업로드</Badge>}
                      {currSource === "ai" && <Badge variant="secondary" className="text-xs">AI 생성</Badge>}
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                      {curriculum.units.map((unit) => (
                        <button key={unit.chacha_num}
                          onClick={() => setSelectedUnit(selectedUnit?.chacha_num === unit.chacha_num ? null : unit)}
                          className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selectedUnit?.chacha_num === unit.chacha_num ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                          <div className="flex items-center justify-between">
                            <span>
                              <span className="font-semibold text-green-700 mr-2">{unit.chacha_num}차시</span>
                              {unit.chapter && <><span className="text-slate-600">{unit.chapter}</span><span className="text-slate-400 mx-1">·</span></>}
                              <span>{unit.topic}</span>
                            </span>
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedUnit?.chacha_num === unit.chacha_num ? "rotate-90" : ""}`} />
                          </div>
                          {selectedUnit?.chacha_num === unit.chacha_num && (
                            <div className="mt-2 space-y-1">
                              {unit.core_concepts.length > 0 && <div className="flex flex-wrap gap-1">{unit.core_concepts.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div>}
                              {unit.learning_goals.length > 0 && <p className="text-xs text-slate-400">{unit.learning_goals.join(" / ")}</p>}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ 수업 녹음 탭 ══ */}
          <TabsContent value="lesson" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Mic className="w-5 h-5 text-green-600" />수업 녹음</CardTitle>
                <CardDescription>녹음 종료 시 파일이 자동 저장됩니다. AI 자동 정리 후 차시에 업로드하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Select value={uploadSubject} onValueChange={setUploadSubject} disabled={recording}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-sm text-slate-500">{grade}학년 {user?.classNum}반 · {uploadSubject}</span>
                </div>
                <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${recording ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  {recording ? (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <div className="flex-1"><p className="text-sm font-semibold text-red-600">녹음 중</p><p className="text-xs text-red-400">{fmt(recordSec)} · {uploadSubject}</p></div>
                      <Button variant="destructive" onClick={stopRecording}><MicOff className="w-4 h-4 mr-2" />녹음 종료</Button>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 text-slate-400" />
                      <p className="flex-1 text-sm text-slate-600">녹음 종료 시 파일이 자동 저장됩니다</p>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={startRecording}><Mic className="w-4 h-4 mr-2" />녹음 시작</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── 녹음 파일 업로드 & AI 3분류 ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="w-5 h-5 text-purple-600" />녹음 자료 업로드 &amp; AI 3분류 분석
                </CardTitle>
                <CardDescription>
                  녹음 파일을 업로드하면 AI가 내용을 분석해 <strong>학습 콘텐츠 · 학생 생활 기록 · 공지·알림</strong> 3가지로 자동 분류·저장합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={uploadSubject} onValueChange={setUploadSubject}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <label className={`cursor-pointer ${classifyLoading ? "pointer-events-none" : ""}`}>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) { classifyAudio(e.target.files[0]); e.target.value = ""; } }}
                    />
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${classifyLoading ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 cursor-pointer"}`}>
                      {classifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {classifyLoading ? "AI가 분석 중..." : "파일 선택 & AI 분석"}
                    </span>
                  </label>
                  {classifyResult && !classifyLoading && (
                    <span className="flex items-center gap-1 text-sm text-purple-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />분류 완료 — 저장됨
                    </span>
                  )}
                </div>

                {classifyResult && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* ① 학습 콘텐츠 */}
                    <div className={`rounded-xl border p-4 space-y-2 ${classifyResult.lesson_content.has_content ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📚</span>
                        <span className="text-sm font-semibold text-blue-800">학습 콘텐츠</span>
                        {classifyResult.lesson_content.has_content
                          ? <Badge className="ml-auto bg-blue-600 text-white text-xs hover:bg-blue-600">감지됨</Badge>
                          : <Badge variant="secondary" className="ml-auto text-xs">없음</Badge>}
                      </div>
                      {classifyResult.lesson_content.has_content ? (
                        <div className="space-y-1.5">
                          {classifyResult.lesson_content.topic && <p className="text-xs font-semibold text-slate-700">{classifyResult.lesson_content.topic}</p>}
                          {classifyResult.lesson_content.summary && <p className="text-xs text-slate-600 leading-relaxed">{classifyResult.lesson_content.summary}</p>}
                          {classifyResult.lesson_content.core_concepts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {classifyResult.lesson_content.core_concepts.map((c) => (
                                <Badge key={c} variant="outline" className="text-xs border-blue-300 text-blue-700">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">이 녹음에서 학습 관련 내용이 감지되지 않았습니다.</p>
                      )}
                    </div>

                    {/* ② 학생 생활 기록 */}
                    <div className={`rounded-xl border p-4 space-y-2 ${classifyResult.student_records.length > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📋</span>
                        <span className="text-sm font-semibold text-amber-800">학생 생활 기록</span>
                        {classifyResult.student_records.length > 0
                          ? <Badge className="ml-auto bg-amber-500 text-white text-xs hover:bg-amber-500">{classifyResult.student_records.length}건</Badge>
                          : <Badge variant="secondary" className="ml-auto text-xs">없음</Badge>}
                      </div>
                      {classifyResult.student_records.length > 0 ? (
                        <ul className="space-y-2">
                          {classifyResult.student_records.map((r, i) => {
                            const typeInfo = ISSUE_TYPE_LABELS[r.type] || ISSUE_TYPE_LABELS.other;
                            return (
                              <li key={i} className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-700">{r.student_name}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                </div>
                                <p className="text-slate-600">{r.summary}</p>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">이 녹음에서 학생 생활 기록 관련 내용이 감지되지 않았습니다.</p>
                      )}
                    </div>

                    {/* ③ 공지·알림 */}
                    <div className={`rounded-xl border p-4 space-y-2 ${classifyResult.notices.length > 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📢</span>
                        <span className="text-sm font-semibold text-green-800">공지·알림</span>
                        {classifyResult.notices.length > 0
                          ? <Badge className="ml-auto bg-green-600 text-white text-xs hover:bg-green-600">{classifyResult.notices.length}건</Badge>
                          : <Badge variant="secondary" className="ml-auto text-xs">없음</Badge>}
                      </div>
                      {classifyResult.notices.length > 0 ? (
                        <ul className="space-y-2">
                          {classifyResult.notices.map((n, i) => {
                            const noticeTypeLabel: Record<string, string> = {
                              homework: "숙제", preparation: "준비물", event: "행사",
                              parent_notice: "학부모 공지", other: "기타",
                            };
                            const targetLabel: Record<string, string> = {
                              students: "학생", parents: "학부모", both: "전체",
                            };
                            return (
                              <li key={i} className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-700">{noticeTypeLabel[n.type] || "기타"}</span>
                                  <span className="text-slate-400">→ {targetLabel[n.target] || n.target}</span>
                                </div>
                                <p className="text-slate-600">{n.summary}</p>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">이 녹음에서 공지·알림 관련 내용이 감지되지 않았습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {recordings.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">오늘의 녹음 목록</CardTitle>
                  <CardDescription>각 녹음을 AI로 정리하고 차시에 업로드하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recordings.map((rec) => (
                    <div key={rec.id} className="border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-white">
                        <div className="flex-1 flex items-center gap-3 text-sm">
                          <span className="text-slate-500">{rec.dateStr}</span>
                          <span className="font-medium text-slate-700">{rec.timeStr}</span>
                          <Badge variant="outline">{rec.subject}</Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[rec.status]}`}>{statusLabel[rec.status]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={rec.blobUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="text-slate-500 h-8 px-2"><Play className="w-3.5 h-3.5 mr-1" />원본</Button>
                          </a>
                          {rec.status === "recorded" && (
                            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={() => processAi(rec)}>AI 자동 정리</Button>
                          )}
                          {rec.status === "processing" && (
                            <div className="flex items-center gap-2 text-sm text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">정리 중...</span></div>
                          )}
                          {rec.status === "ready" && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => updateRec(rec.id, { expanded: !rec.expanded })}>
                                <ChevronDown className={`w-4 h-4 transition-transform ${rec.expanded ? "rotate-180" : ""}`} />
                              </Button>
                              <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => openUnitPicker(rec)}>
                                <Upload className="w-3.5 h-3.5 mr-1" />업로드
                              </Button>
                            </>
                          )}
                          {rec.status === "uploading" && <div className="flex items-center gap-2 text-sm text-yellow-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">업로드 중...</span></div>}
                          {rec.status === "uploaded" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </div>
                      </div>

                      {rec.expanded && rec.aiResult && (
                        <div className="border-t bg-slate-50 px-4 py-4 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-slate-700">복습 내용</span></div>
                            <div className="flex flex-wrap gap-2">
                              {rec.aiResult.pre_test && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">사전퀴즈 {rec.aiResult.pre_test.length}문제</Badge>}
                              {rec.aiResult.concept_definitions && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">개념정리 {rec.aiResult.concept_definitions.length}개</Badge>}
                              {rec.aiResult.post_test && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">사후테스트 {rec.aiResult.post_test.length}문제</Badge>}
                            </div>
                            {rec.aiResult.lesson_summary && <p className="text-sm text-slate-600 bg-white rounded-lg px-3 py-2 border">{rec.aiResult.lesson_summary}</p>}
                            {rec.aiResult.core_concepts.length > 0 && (
                              <div className="flex flex-wrap gap-1">{rec.aiResult.core_concepts.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}</div>
                            )}
                          </div>
                          {rec.aiResult.other_notes && rec.aiResult.other_notes.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-slate-700">기타 이슈</span></div>
                                <ul className="space-y-1">{rec.aiResult.other_notes.map((n, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-amber-500 mt-0.5">•</span><span>{n}</span></li>)}</ul>
                              </div>
                            </>
                          )}
                          <Separator />
                          <div className="space-y-1"><p className="text-xs text-slate-500 font-medium">원본 녹음</p><audio controls src={rec.blobUrl} className="w-full h-9" /></div>
                        </div>
                      )}

                      {rec.unitPickerOpen && rec.status === "ready" && (
                        <div className="border-t bg-green-50 px-4 py-3 space-y-3">
                          <p className="text-sm font-medium text-slate-700">어떤 차시에 업로드할까요?</p>
                          {rec.loadingUnits ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />차시 목록 불러오는 중...</div>
                          ) : rec.unitCurriculum ? (
                            <div className="flex items-center gap-3 flex-wrap">
                              <Select value={rec.selectedUnit?.chacha_num?.toString() ?? "none"} onValueChange={(v) => {
                                const unit = v === "none" ? null : rec.unitCurriculum!.units.find((u) => u.chacha_num === Number(v)) ?? null;
                                updateRec(rec.id, { selectedUnit: unit });
                              }}>
                                <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="차시 선택 (선택 사항)" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">차시 연결 없이 업로드</SelectItem>
                                  {rec.unitCurriculum.units.map((u) => <SelectItem key={u.chacha_num} value={u.chacha_num.toString()}>{u.chacha_num}차시 · {u.topic}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button className="bg-green-600 hover:bg-green-700" onClick={() => uploadRecording(rec)}>업로드 확인</Button>
                              <Button variant="ghost" onClick={() => updateRec(rec.id, { unitPickerOpen: false })}>취소</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <p className="text-sm text-slate-500">차시 목록 없음 —</p>
                              <Button className="bg-green-600 hover:bg-green-700" onClick={() => uploadRecording(rec)}>그냥 업로드</Button>
                              <Button variant="ghost" onClick={() => updateRec(rec.id, { unitPickerOpen: false })}>취소</Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {recordings.length === 0 && (
              <div className="text-center py-16 text-slate-400"><Mic className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">녹음을 시작하면 목록이 여기에 표시됩니다</p></div>
            )}
          </TabsContent>

          {/* ══ 학생 관리 탭 ══ */}
          <TabsContent value="students">
            <Tabs defaultValue="roster">
              <TabsList className="mb-4">
                <TabsTrigger value="roster">명단 관리</TabsTrigger>
                <TabsTrigger value="reviews" onClick={loadReviews}>복습 현황</TabsTrigger>
                <TabsTrigger value="issues" onClick={() => { if (!issuesLoaded) loadIssues(); }}>이슈 로그</TabsTrigger>
              </TabsList>

              {/* ─ 명단 ─ */}
              <TabsContent value="roster" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">학생 명단</CardTitle>
                        <CardDescription>엑셀 일괄 업로드 또는 개별 등록. 사진·이름·번호·메모 관리.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleExcelUpload(e.target.files[0]); }} />
                          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 font-medium">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />엑셀 업로드
                          </span>
                        </label>
                        <Button size="sm" variant="outline" onClick={() => { setShowAddForm(true); setAddForm({ num: (roster[roster.length - 1]?.num ?? 0) + 1, name: "", memo: "" }); }}>
                          <Plus className="w-4 h-4 mr-1" />개별 추가
                        </Button>
                        {!rosterLoaded && <Button size="sm" variant="ghost" onClick={loadRoster} disabled={loadingRoster}>{loadingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : "불러오기"}</Button>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 엑셀 형식 안내 */}
                    <p className="text-xs text-slate-400 bg-slate-50 rounded px-3 py-1.5">엑셀 형식: A열=번호, B열=이름, C열=메모(선택). 1행은 헤더로 건너뜁니다.</p>

                    {/* 개별 추가 폼 */}
                    {showAddForm && (
                      <div className="border rounded-xl p-4 bg-blue-50 space-y-3">
                        <p className="text-sm font-semibold text-slate-700">새 학생 추가</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1"><Label className="text-xs">번호</Label><Input type="number" value={addForm.num} onChange={(e) => setAddForm({ ...addForm, num: Number(e.target.value) })} className="h-8" /></div>
                          <div className="space-y-1"><Label className="text-xs">이름 *</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="h-8" /></div>
                          <div className="space-y-1"><Label className="text-xs">메모</Label><Input value={addForm.memo} onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addStudent}>추가</Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>취소</Button>
                        </div>
                      </div>
                    )}

                    {/* 학생 카드 그리드 */}
                    {loadingRoster ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : roster.length === 0 ? (
                      <div className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">아직 등록된 학생이 없습니다</p></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {roster.map((s) => (
                          <div key={s.num} className="border rounded-xl bg-white p-3 space-y-2 relative group">
                            {/* 편집/삭제 버튼 */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingNum(s.num); setEditForm({ ...s }); }} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3 h-3 text-slate-500" /></button>
                              <button onClick={() => deleteStudent(s.num)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                            </div>

                            {/* 사진 */}
                            <div className="flex flex-col items-center gap-1">
                              <label className="cursor-pointer relative">
                                <Avatar name={s.name} photoUrl={s.photo_url} size={56} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(s.num, e.target.files[0]); }} />
                                <div className="absolute bottom-0 right-0 bg-white rounded-full border p-0.5"><Camera className="w-2.5 h-2.5 text-slate-500" /></div>
                              </label>
                            </div>

                            {/* 인라인 편집 모드 */}
                            {editingNum === s.num ? (
                              <div className="space-y-1.5">
                                <Input className="h-7 text-xs" placeholder="이름" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                <Input className="h-7 text-xs" placeholder="번호" type="number" value={editForm.num} onChange={(e) => setEditForm({ ...editForm, num: Number(e.target.value) })} />
                                <Textarea className="text-xs min-h-0 h-12 resize-none" placeholder="메모" value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} />
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveStudent(editForm)}>저장</Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNum(null)}>취소</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-center">
                                  <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                                  <p className="text-xs text-slate-400">{s.num}번</p>
                                </div>
                                {s.memo && <p className="text-xs text-slate-500 text-center line-clamp-2">{s.memo}</p>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─ 복습 현황 ─ */}
              <TabsContent value="reviews" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">복습 현황</CardTitle>
                        <CardDescription>날짜별 복습 여부·소요시간·사전/사후 테스트 결과</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="h-8 w-36" />
                        <Button size="sm" onClick={loadReviews} disabled={loadingReviews}>
                          {loadingReviews ? <Loader2 className="w-4 h-4 animate-spin" /> : "조회"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingReviews ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-10 text-slate-400"><Eye className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">데이터가 없습니다. 날짜를 선택하고 조회하세요.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-slate-500 text-xs">
                              <th className="text-left pb-2 pr-3 font-medium">번호</th>
                              <th className="text-left pb-2 pr-3 font-medium">이름</th>
                              <th className="text-center pb-2 pr-3 font-medium">복습여부</th>
                              <th className="text-center pb-2 pr-3 font-medium">소요시간</th>
                              <th className="text-center pb-2 pr-3 font-medium">사전테스트</th>
                              <th className="text-center pb-2 font-medium">사후테스트</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reviews.map((r) => {
                              const preRate = r.pre_total ? r.pre_correct! / r.pre_total : null;
                              const postRate = r.post_total ? r.post_correct! / r.post_total : null;
                              return (
                                <tr key={r.num} className="hover:bg-slate-50">
                                  <td className="py-2 pr-3 text-slate-400">{r.num}</td>
                                  <td className="py-2 pr-3">
                                    <div className="flex items-center gap-2">
                                      <Avatar name={r.name} photoUrl={r.photo_url} size={24} />
                                      <span className="font-medium text-slate-700">{r.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3 text-center">
                                    {r.viewed ? <Eye className="w-4 h-4 text-green-500 mx-auto" /> : <EyeOff className="w-4 h-4 text-slate-300 mx-auto" />}
                                  </td>
                                  <td className="py-2 pr-3 text-center text-slate-600">
                                    {r.duration_sec > 0 ? <span className="flex items-center gap-1 justify-center"><Clock className="w-3 h-3" />{Math.round(r.duration_sec / 60)}분</span> : "—"}
                                  </td>
                                  <td className="py-2 pr-3 text-center">
                                    {r.pre_total != null ? (
                                      <span className={`font-medium ${preRate! >= 0.7 ? "text-green-600" : preRate! >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                                        {r.pre_correct}/{r.pre_total}
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="py-2 text-center">
                                    {r.post_total != null ? (
                                      <span className={`font-medium ${postRate! >= 0.7 ? "text-green-600" : postRate! >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                                        {r.post_correct}/{r.post_total}
                                      </span>
                                    ) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─ 이슈 로그 ─ */}
              <TabsContent value="issues" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">이슈 로그</CardTitle>
                        <CardDescription>AI가 수업 녹음에서 추출한 학생별 이슈 — 칭찬·훈육·다툼·학폭 등</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={filterStudent} onValueChange={setFilterStudent}>
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="학생 전체" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">학생 전체</SelectItem>
                            {roster.map((s) => <SelectItem key={s.num} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={filterType} onValueChange={setFilterType}>
                          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="유형 전체" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">유형 전체</SelectItem>
                            {Object.entries(ISSUE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8" onClick={loadIssues} disabled={loadingIssues}>
                          {loadingIssues ? <Loader2 className="w-4 h-4 animate-spin" /> : "조회"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingIssues ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : !issuesLoaded ? (
                      <div className="text-center py-10 text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">조회 버튼을 눌러 이슈 로그를 불러오세요</p></div>
                    ) : issues.length === 0 ? (
                      <div className="text-center py-10 text-slate-400"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-green-400" /><p className="text-sm">이슈가 없습니다</p></div>
                    ) : (
                      <div className="space-y-2">
                        {issues.map((issue) => {
                          const typeInfo = ISSUE_TYPE_LABELS[issue.type] || ISSUE_TYPE_LABELS.other;
                          const student = roster.find((s) => s.name === issue.student_name);
                          return (
                            <div key={issue.issue_id} className="flex items-start gap-3 p-3 rounded-xl border bg-white hover:bg-slate-50 transition-colors">
                              <Avatar name={issue.student_name} photoUrl={student?.photo_url || ""} size={36} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-slate-800">{issue.student_name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                  <span className="text-xs text-slate-400 ml-auto">{issue.date}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-0.5">{issue.summary}</p>
                                {issue.lesson_topic && <p className="text-xs text-slate-400 mt-0.5">수업: {issue.lesson_topic}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
