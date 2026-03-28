from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import date, datetime


# ─── Assessment / Profile ──────────────────────────────────────────────────

class AnswerItem(BaseModel):
    q_id: str
    opt_id: str

class ProfileCreateRequest(BaseModel):
    student_id: str
    answers: List[AnswerItem]

class ProfileResponse(BaseModel):
    primary_trait: str
    secondary_trait: str
    motivation_type: str
    tutor_persona: str
    confidence_score: float


# ─── Student ───────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    grade: int
    school: Optional[str] = None

class StudentResponse(BaseModel):
    student_id: str
    name: str
    grade: int
    school: Optional[str]
    class Config:
        from_attributes = True


# ─── Lecture Upload ────────────────────────────────────────────────────────

class LectureUploadRequest(BaseModel):
    teacher_id: str
    subject: str
    chacha_num: Optional[int] = None   # 연결할 커리큘럼 차시
    lesson_topic: str
    learning_goal: Optional[str] = None
    core_concepts: List[str]
    examples: List[str]
    # Pre-generated AI content (from transcribe step — skip re-generation if provided)
    lesson_summary: Optional[str] = None
    pre_test: Optional[List[Dict[str, Any]]] = None
    concept_definitions: Optional[List[Dict[str, Any]]] = None
    post_test: Optional[List[Dict[str, Any]]] = None
    video_search_query: Optional[str] = None
    vark_tips: Optional[Dict[str, Any]] = None

class TranscribeRequest(BaseModel):
    teacher_id: str
    grade: int
    subject: str
    audio_base64: str   # base64 encoded audio/webm

class TranscribeResponse(BaseModel):
    topic: str
    summary: str
    core_concepts: List[str]
    examples: List[str]
    other_notes: List[str] = []
    # Full lesson content generated after transcription
    lesson_summary: Optional[str] = None
    pre_test: Optional[List[Dict[str, Any]]] = None
    concept_definitions: Optional[List[Dict[str, Any]]] = None
    post_test: Optional[List[Dict[str, Any]]] = None
    video_search_query: Optional[str] = None
    vark_tips: Optional[Dict[str, Any]] = None

class LectureUploadResponse(BaseModel):
    status: int
    lesson_id: str
    message: str


# ─── Lesson Session ────────────────────────────────────────────────────────

class QuestionItem(BaseModel):
    q_id: str
    text: str
    options: Optional[List[Dict[str, Any]]] = None
    concept_tag: str

class ConceptDefinition(BaseModel):
    concept: str
    definition: str
    example: str

class LessonSessionResponse(BaseModel):
    source: str               # "teacher_upload" | "default_map"
    lesson_id: str
    lesson_topic: str
    lesson_summary: str
    core_concepts: List[str]
    pre_test: List[QuestionItem] = []
    concept_definitions: List[ConceptDefinition] = []
    post_test: List[QuestionItem] = []
    questions: List[QuestionItem]  # backward compat = post_test
    video_search_query: Optional[str] = None
    vark_tips: Optional[Dict[str, str]] = None


# ─── Meta Feedback ────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    student_id: str
    concept_tag: str
    understanding_level: str   # 완전이해 / 알쏭달쏭 / 모름
    question_id: Optional[str] = None

class FeedbackResponse(BaseModel):
    next_action: str           # "continue" | "provide_alternative_explanation" | "reteach"
    next_review_date: Optional[date] = None
    ai_asset_id: Optional[str] = None
    explanation: Optional[str] = None


# ─── Vision AI ────────────────────────────────────────────────────────────

class VisionAnalyzeResponse(BaseModel):
    detected_concept: str
    matching_curriculum_id: Optional[str]
    suggested_questions: List[str]


# ─── Parent Dashboard ─────────────────────────────────────────────────────

class ParentDashboardResponse(BaseModel):
    student_name: str
    date: date
    emotional_coaching_script: str
    completed_quests: int
    weak_concepts: List[str]
    strong_concepts: List[str]
    next_review_topics: List[str]


# ─── Teacher ──────────────────────────────────────────────────────────────

# ─── Recording Classification ─────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    teacher_id: str
    grade: int
    subject: str
    audio_base64: str

class LessonContentResult(BaseModel):
    has_content: bool
    topic: str = ""
    summary: str = ""
    core_concepts: List[str] = []
    raw_text: str = ""

class StudentRecordItem(BaseModel):
    student_name: str
    type: str
    summary: str
    detail: str = ""

class NoticeItem(BaseModel):
    type: str
    summary: str
    detail: str = ""
    target: str = "students"

class ClassifyResponse(BaseModel):
    classify_id: str
    lesson_content: LessonContentResult
    student_records: List[StudentRecordItem] = []
    notices: List[NoticeItem] = []


# ─── Teacher ──────────────────────────────────────────────────────────────

class TeacherCreate(BaseModel):
    name: str
    school: Optional[str] = None
    grade: Optional[int] = None
    classNum: Optional[int] = None
    subject: Optional[str] = None

class TeacherResponse(BaseModel):
    teacher_id: str
    name: str
    class Config:
        from_attributes = True
