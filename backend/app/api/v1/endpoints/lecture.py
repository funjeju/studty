from fastapi import APIRouter, HTTPException
from app.db.firebase import get_db
from app.schemas.schemas import (
    LectureUploadRequest, LectureUploadResponse,
    TeacherCreate, TeacherResponse,
    TranscribeRequest, TranscribeResponse,
)
from app.services.ai_service import (
    generate_lesson_full_content,
    transcribe_lesson_audio,
    extract_student_issues,
)
from datetime import date
import uuid

router = APIRouter()


@router.post("/teachers", response_model=TeacherResponse, status_code=201)
async def create_teacher(body: TeacherCreate):
    db = get_db()
    teacher_id = str(uuid.uuid4())
    db.collection("teachers").document(teacher_id).set({
        "teacher_id": teacher_id,
        "name": body.name,
        "school": body.school or "",
        "grade": body.grade or 3,
        "classNum": body.classNum or 1,
        "subject": body.subject or "",
    })
    return TeacherResponse(teacher_id=teacher_id, name=body.name)


@router.post("/upload", response_model=LectureUploadResponse)
async def upload_lecture(body: LectureUploadRequest):
    db = get_db()
    doc = db.collection("teachers").document(body.teacher_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_data = doc.to_dict() or {}
    grade = teacher_data.get("grade", 3)

    # Use pre-generated AI content if provided; otherwise generate now
    if body.pre_test is not None and body.concept_definitions is not None:
        lesson_summary = body.lesson_summary or ""
        pre_test = body.pre_test
        concept_definitions = body.concept_definitions
        post_test = body.post_test or []
        questions = post_test
        video_search_query = body.video_search_query
        vark_tips = body.vark_tips
    else:
        ai_content = await generate_lesson_full_content(
            grade=grade,
            subject=body.subject,
            topic=body.lesson_topic,
            learning_goals=[body.learning_goal] if body.learning_goal else [],
            core_concepts=body.core_concepts,
        )
        lesson_summary = ai_content.get("lesson_summary", "")
        pre_test = ai_content.get("pre_test", [])
        concept_definitions = ai_content.get("concept_definitions", [])
        post_test = ai_content.get("post_test", [])
        questions = post_test
        video_search_query = ai_content.get("video_search_query")
        vark_tips = ai_content.get("vark_tips")

    lesson_id = str(uuid.uuid4())
    lesson_data = {
        "lesson_id": lesson_id,
        "teacher_id": body.teacher_id,
        "subject": body.subject,
        "lesson_topic": body.lesson_topic,
        "lesson_summary": lesson_summary,
        "learning_goal": body.learning_goal or lesson_summary,
        "core_concepts": body.core_concepts,
        "examples": body.examples,
        "pre_test": pre_test,
        "concept_definitions": concept_definitions,
        "post_test": post_test,
        "questions": questions,
        "video_search_query": video_search_query,
        "vark_tips": vark_tips,
        "lesson_date": date.today().isoformat(),
        "approved": True,
    }

    db.collection("lessons").document(lesson_id).set(lesson_data)

    if body.chacha_num is not None:
        lesson_key = f"{body.teacher_id}_{body.subject}_{body.chacha_num}"
        db.collection("teacher_lessons").document(lesson_key).set({
            **lesson_data,
            "chacha_num": body.chacha_num,
        })

    return LectureUploadResponse(
        status=200,
        lesson_id=lesson_id,
        message="수업 자료가 성공적으로 업로드되었습니다.",
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_lecture(body: TranscribeRequest):
    """수업 녹음(base64 audio) → AI 전사 + 완전한 복습 콘텐츠 생성 + 학생 이슈 추출"""
    db = get_db()
    today = date.today().isoformat()

    try:
        # Step 1: 오디오 전사 + 기타 이슈 추출
        transcribed = await transcribe_lesson_audio(
            audio_base64=body.audio_base64,
            grade=body.grade,
            subject=body.subject,
        )

        # Step 2: 전사 결과 기반으로 완전한 수업 콘텐츠 생성
        full_content = await generate_lesson_full_content(
            grade=body.grade,
            subject=body.subject,
            topic=transcribed.get("topic", body.subject + " 수업"),
            learning_goals=[transcribed.get("summary", "")],
            core_concepts=transcribed.get("core_concepts", []),
        )

        # Step 3: 학생 이슈 추출 (명단이 있는 경우)
        roster_doc = db.collection("class_roster").document(body.teacher_id).get()
        student_names: list = []
        if roster_doc.exists:
            student_names = [s["name"] for s in roster_doc.to_dict().get("students", [])]

        if student_names:
            lesson_text = " ".join([
                transcribed.get("topic", ""),
                transcribed.get("summary", ""),
                " ".join(transcribed.get("other_notes", [])),
            ])
            issues = await extract_student_issues(lesson_text, student_names)

            # Step 4: 이슈 Firestore 저장
            for issue in issues:
                if not issue.get("student_name"):
                    continue
                issue_id = str(uuid.uuid4())
                db.collection("student_issues").document(issue_id).set({
                    "issue_id": issue_id,
                    "teacher_uid": body.teacher_id,
                    "student_name": issue["student_name"],
                    "date": today,
                    "type": issue.get("type", "other"),
                    "summary": issue.get("summary", ""),
                    "lesson_topic": transcribed.get("topic", ""),
                    "created_at": today,
                })

        return TranscribeResponse(
            topic=transcribed.get("topic", ""),
            summary=transcribed.get("summary", ""),
            core_concepts=transcribed.get("core_concepts", []),
            examples=transcribed.get("examples", []),
            other_notes=transcribed.get("other_notes", []),
            lesson_summary=full_content.get("lesson_summary"),
            pre_test=full_content.get("pre_test", []),
            concept_definitions=full_content.get("concept_definitions", []),
            post_test=full_content.get("post_test", []),
            video_search_query=full_content.get("video_search_query"),
            vark_tips=full_content.get("vark_tips"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"전사 실패: {str(e)}")
