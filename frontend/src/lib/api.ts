import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Student {
  student_id: string;
  name: string;
  grade: number;
  school?: string;
}

export interface LearningProfile {
  primary_trait: string;
  secondary_trait: string;
  motivation_type: string;
  tutor_persona: string;
  confidence_score: number;
}

export interface QuestionItem {
  q_id: string;
  text: string;
  options: { text: string; is_correct: boolean }[];
  concept_tag: string;
}

export interface ConceptDefinition {
  concept: string;
  definition: string;
  example: string;
}

export interface LessonSession {
  source: "teacher_upload" | "default_map";
  lesson_id: string;
  lesson_topic: string;
  lesson_summary: string;
  core_concepts: string[];
  pre_test: QuestionItem[];
  concept_definitions: ConceptDefinition[];
  post_test: QuestionItem[];
  questions: QuestionItem[];
  video_search_query?: string;
  vark_tips?: { visual?: string; auditory?: string; reading?: string; kinesthetic?: string };
}

export interface FeedbackResponse {
  next_action: string;
  next_review_date: string;
  ai_asset_id?: string;
  explanation?: string;
}

export interface ParentDashboard {
  student_name: string;
  date: string;
  emotional_coaching_script: string;
  completed_quests: number;
  weak_concepts: string[];
  strong_concepts: string[];
  next_review_topics: string[];
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const createStudent = (data: { name: string; grade: number; school?: string }) =>
  api.post<Student>("/assessment/students", data).then((r) => r.data);

export const createTeacher = (data: { name: string; school?: string; grade?: number; subject?: string }) =>
  api.post("/lecture/teachers", data).then((r) => r.data);

export const submitProfile = (data: {
  student_id: string;
  answers: { q_id: string; opt_id: string }[];
}) => api.post<LearningProfile>("/assessment/profile", data).then((r) => r.data);

export const uploadLecture = (data: {
  teacher_id: string;
  subject: string;
  lesson_topic: string;
  learning_goal?: string;
  core_concepts: string[];
  examples: string[];
}) => api.post("/lecture/upload", data).then((r) => r.data);

export interface CurriculumUnit {
  chacha_num: number;
  chapter: string;
  topic: string;
  learning_goals: string[];
  core_concepts: string[];
}

export interface CurriculumMap {
  grade: number;
  subject: string;
  units: CurriculumUnit[];
  cached: boolean;
}

export const getCurriculumMap = (grade: number, subject: string) =>
  api.get<CurriculumMap>(`/curriculum/map?grade=${grade}&subject=${encodeURIComponent(subject)}`).then((r) => r.data);

export const getSubjects = (grade: number) =>
  api.get<{ grade: number; subjects: string[] }>(`/curriculum/subjects?grade=${grade}`).then((r) => r.data);

export const getLessonSession = (
  student_id: string,
  unit?: CurriculumUnit,
  subject?: string,
) => {
  let url = `/lesson/session?student_id=${student_id}`;
  if (unit && subject) {
    url += `&subject=${encodeURIComponent(subject)}`;
    url += `&chacha_num=${unit.chacha_num}`;
    url += `&topic=${encodeURIComponent(unit.topic)}`;
    url += `&learning_goals=${encodeURIComponent(unit.learning_goals.join(","))}`;
    url += `&core_concepts=${encodeURIComponent(unit.core_concepts.join(","))}`;
  }
  return api.get<LessonSession>(url).then((r) => r.data);
};

export const submitFeedback = (data: {
  student_id: string;
  concept_tag: string;
  understanding_level: string;
  question_id?: string;
}) => api.post<FeedbackResponse>("/learning/feedback", data).then((r) => r.data);

export const getParentDashboard = (student_id: string) =>
  api.get<ParentDashboard>(`/parent/dashboard/today?student_id=${student_id}`).then((r) => r.data);
