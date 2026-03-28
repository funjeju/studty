from fastapi import APIRouter, Query, HTTPException
from app.db.firebase import get_db
from app.schemas.schemas import LessonSessionResponse, QuestionItem, ConceptDefinition
from app.services.ai_service import generate_lesson_full_content
from datetime import date
from typing import Optional

router = APIRouter()

GRADE_FALLBACK = {
    1: {"topic": "받아올림이 없는 덧셈과 뺄셈", "summary": "한 자리 수끼리 더하고 빼는 방법을 배웁니다.", "concepts": ["덧셈", "뺄셈", "수 모으기"], "questions": [{"concept_tag": "덧셈", "text": "3 + 4 = ?", "options": [{"text": "6", "is_correct": False}, {"text": "7", "is_correct": True}, {"text": "8", "is_correct": False}, {"text": "9", "is_correct": False}]}, {"concept_tag": "뺄셈", "text": "9 - 3 = ?", "options": [{"text": "5", "is_correct": False}, {"text": "7", "is_correct": False}, {"text": "6", "is_correct": True}, {"text": "4", "is_correct": False}]}, {"concept_tag": "수 모으기", "text": "5 + □ = 8", "options": [{"text": "2", "is_correct": False}, {"text": "3", "is_correct": True}, {"text": "4", "is_correct": False}, {"text": "1", "is_correct": False}]}]},
    2: {"topic": "두 자리 수의 덧셈과 뺄셈", "summary": "십의 자리와 일의 자리를 구분하여 두 자리 수를 더하고 빼는 방법을 배웁니다.", "concepts": ["두 자리 덧셈", "두 자리 뺄셈", "받아올림"], "questions": [{"concept_tag": "두 자리 덧셈", "text": "23 + 45 = ?", "options": [{"text": "68", "is_correct": True}, {"text": "67", "is_correct": False}, {"text": "78", "is_correct": False}, {"text": "58", "is_correct": False}]}, {"concept_tag": "두 자리 뺄셈", "text": "76 - 34 = ?", "options": [{"text": "32", "is_correct": False}, {"text": "43", "is_correct": False}, {"text": "42", "is_correct": True}, {"text": "41", "is_correct": False}]}, {"concept_tag": "받아올림", "text": "37 + 48 = ?", "options": [{"text": "75", "is_correct": False}, {"text": "85", "is_correct": True}, {"text": "80", "is_correct": False}, {"text": "84", "is_correct": False}]}]},
    3: {"topic": "분수의 기초", "summary": "똑같이 나눈 것 중의 하나를 분수로 나타내는 방법을 배웁니다.", "concepts": ["분수", "분자", "분모"], "questions": [{"concept_tag": "분수", "text": "피자 한 판을 4조각으로 나눈 것 중 1조각은?", "options": [{"text": "1/3", "is_correct": False}, {"text": "1/4", "is_correct": True}, {"text": "1/2", "is_correct": False}, {"text": "4/1", "is_correct": False}]}, {"concept_tag": "분모", "text": "3/5에서 분모는?", "options": [{"text": "3", "is_correct": False}, {"text": "5", "is_correct": True}, {"text": "8", "is_correct": False}, {"text": "2", "is_correct": False}]}, {"concept_tag": "분자", "text": "4/7에서 분자는?", "options": [{"text": "7", "is_correct": False}, {"text": "11", "is_correct": False}, {"text": "4", "is_correct": True}, {"text": "3", "is_correct": False}]}]},
    4: {"topic": "소수의 기초", "summary": "소수점을 이용해 1보다 작은 수를 나타내는 방법을 배웁니다.", "concepts": ["소수", "소수점", "소수 비교"], "questions": [{"concept_tag": "소수", "text": "0.1이 3개이면?", "options": [{"text": "0.03", "is_correct": False}, {"text": "0.3", "is_correct": True}, {"text": "3.0", "is_correct": False}, {"text": "0.13", "is_correct": False}]}, {"concept_tag": "소수 비교", "text": "가장 큰 수는?", "options": [{"text": "0.7", "is_correct": False}, {"text": "0.09", "is_correct": False}, {"text": "0.85", "is_correct": True}, {"text": "0.8", "is_correct": False}]}, {"concept_tag": "소수점", "text": "1.6은 0.1이 몇 개?", "options": [{"text": "6", "is_correct": False}, {"text": "16", "is_correct": True}, {"text": "1", "is_correct": False}, {"text": "160", "is_correct": False}]}]},
    5: {"topic": "약분과 통분", "summary": "분수를 간단하게 만드는 약분과 통분을 배웁니다.", "concepts": ["약분", "통분", "최대공약수"], "questions": [{"concept_tag": "약분", "text": "6/8을 약분하면?", "options": [{"text": "2/4", "is_correct": False}, {"text": "3/4", "is_correct": True}, {"text": "1/2", "is_correct": False}, {"text": "4/6", "is_correct": False}]}, {"concept_tag": "통분", "text": "1/2와 1/3의 공통 분모는?", "options": [{"text": "5", "is_correct": False}, {"text": "6", "is_correct": True}, {"text": "4", "is_correct": False}, {"text": "2", "is_correct": False}]}, {"concept_tag": "최대공약수", "text": "12와 18의 최대공약수는?", "options": [{"text": "3", "is_correct": False}, {"text": "6", "is_correct": True}, {"text": "9", "is_correct": False}, {"text": "12", "is_correct": False}]}]},
    6: {"topic": "비와 비율", "summary": "두 양을 비교하는 비와 비율의 개념을 배웁니다.", "concepts": ["비", "비율", "백분율"], "questions": [{"concept_tag": "비", "text": "사과 3개, 배 5개일 때 사과와 배의 비는?", "options": [{"text": "5:3", "is_correct": False}, {"text": "3:5", "is_correct": True}, {"text": "3:8", "is_correct": False}, {"text": "8:3", "is_correct": False}]}, {"concept_tag": "비율", "text": "전체 10개 중 4개가 빨간 공일 때 비율은?", "options": [{"text": "0.6", "is_correct": False}, {"text": "0.4", "is_correct": True}, {"text": "4", "is_correct": False}, {"text": "0.04", "is_correct": False}]}, {"concept_tag": "백분율", "text": "비율 0.35를 백분율로 나타내면?", "options": [{"text": "3.5%", "is_correct": False}, {"text": "350%", "is_correct": False}, {"text": "35%", "is_correct": True}, {"text": "0.35%", "is_correct": False}]}]},
}


def _make_questions(raw: list, prefix: str, fallback_tag: str) -> list:
    return [
        QuestionItem(
            q_id=f"{prefix}_{i}",
            text=q.get("text", ""),
            options=q.get("options", []),
            concept_tag=q.get("concept_tag", fallback_tag),
        )
        for i, q in enumerate(raw)
    ]


@router.get("/session", response_model=LessonSessionResponse)
async def get_lesson_session(
    student_id: str = Query(...),
    subject: Optional[str] = Query(None),
    chacha_num: Optional[int] = Query(None),
    topic: Optional[str] = Query(None),
    learning_goals: Optional[str] = Query(None),
    core_concepts_param: Optional[str] = Query(None, alias="core_concepts"),
):
    import traceback as tb
    db = get_db()

    try:
        student_doc = db.collection("students").document(student_id).get()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {tb.format_exc()}")

    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc.to_dict()
    grade = student.get("grade", 3)
    if not isinstance(grade, int) or grade not in GRADE_FALLBACK:
        grade = 3

    school = student.get("school", "")
    class_num = student.get("classNum", 0)

    # ── 1순위: 선생님이 이 차시에 업로드한 수업 ──────────────────────────────
    if subject and chacha_num is not None:
        teacher_uid = None

        if school and class_num:
            try:
                t_docs = list(db.collection("teachers").where("school", "==", school).stream())
                for t in t_docs:
                    td = t.to_dict()
                    if td.get("grade") == grade and td.get("classNum") == class_num:
                        teacher_uid = td.get("teacher_id") or t.id
                        break
            except Exception:
                pass

        if teacher_uid:
            lesson_key = f"{teacher_uid}_{subject}_{chacha_num}"
            try:
                tl_doc = db.collection("teacher_lessons").document(lesson_key).get()
                if tl_doc.exists:
                    lesson = tl_doc.to_dict()
                    pre_qs = _make_questions(lesson.get("pre_test", []), f"pre_{chacha_num}", topic or "")
                    post_qs = _make_questions(
                        lesson.get("post_test", lesson.get("questions", [])),
                        f"post_{chacha_num}", topic or ""
                    )
                    concept_defs = [
                        ConceptDefinition(**c) for c in lesson.get("concept_definitions", [])
                        if all(k in c for k in ("concept", "definition", "example"))
                    ]
                    return LessonSessionResponse(
                        source="teacher_upload",
                        lesson_id=lesson_key,
                        lesson_topic=lesson.get("lesson_topic", topic or ""),
                        lesson_summary=lesson.get("lesson_summary", lesson.get("learning_goal", "")),
                        core_concepts=lesson.get("core_concepts", []),
                        pre_test=pre_qs,
                        concept_definitions=concept_defs,
                        post_test=post_qs,
                        questions=post_qs,
                        video_search_query=lesson.get("video_search_query"),
                        vark_tips=lesson.get("vark_tips"),
                    )
            except Exception:
                pass

    # ── 2순위: AI 생성 콘텐츠 (캐시 우선) ────────────────────────────────────
    if subject and chacha_num is not None and topic:
        content_id = f"{grade}_{subject}_{chacha_num}"
        goals_list = [g.strip() for g in learning_goals.split(",")] if learning_goals else []
        concepts_list = [c.strip() for c in core_concepts_param.split(",")] if core_concepts_param else []

        cached_content = None
        try:
            cached_doc = db.collection("lesson_contents").document(content_id).get()
            if cached_doc.exists:
                cached_content = cached_doc.to_dict()
        except Exception:
            pass

        if not cached_content:
            try:
                ai_result = await generate_lesson_full_content(
                    grade=grade, subject=subject, topic=topic,
                    learning_goals=goals_list, core_concepts=concepts_list,
                )
                try:
                    db.collection("lesson_contents").document(content_id).set({
                        **ai_result, "grade": grade, "subject": subject,
                        "chacha_num": chacha_num, "topic": topic,
                    })
                except Exception:
                    pass
                cached_content = ai_result
            except Exception as e:
                print(f"AI lesson generation failed: {e}")

        if cached_content:
            pre_qs = _make_questions(cached_content.get("pre_test", []), f"pre_{chacha_num}", topic)
            post_qs = _make_questions(cached_content.get("post_test", []), f"post_{chacha_num}", topic)
            concept_defs = [
                ConceptDefinition(**c) for c in cached_content.get("concept_definitions", [])
                if all(k in c for k in ("concept", "definition", "example"))
            ]
            return LessonSessionResponse(
                source="default_map",
                lesson_id=content_id,
                lesson_topic=topic,
                lesson_summary=cached_content.get("lesson_summary", ""),
                core_concepts=concepts_list or cached_content.get("core_concepts", [topic]),
                pre_test=pre_qs,
                concept_definitions=concept_defs,
                post_test=post_qs,
                questions=post_qs,
                video_search_query=cached_content.get("video_search_query"),
                vark_tips=cached_content.get("vark_tips"),
            )

    # ── 3순위: 학년별 하드코딩 폴백 ──────────────────────────────────────────
    fb = GRADE_FALLBACK[grade]
    questions = _make_questions(fb["questions"], "default", "")
    return LessonSessionResponse(
        source="default_map",
        lesson_id="default",
        lesson_topic=fb["topic"],
        lesson_summary=fb["summary"],
        core_concepts=fb["concepts"],
        pre_test=[],
        concept_definitions=[],
        post_test=questions,
        questions=questions,
    )
