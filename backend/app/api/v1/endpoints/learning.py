from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from app.db.firebase import get_db
from app.schemas.schemas import FeedbackRequest, FeedbackResponse, VisionAnalyzeResponse
from app.services.spaced_repetition import compute_next_review_date, get_next_action
from app.services.ai_service import generate_alternative_explanation, analyze_image_concept
from datetime import date
import uuid
import base64

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(body: FeedbackRequest):
    db = get_db()

    student_doc = db.collection("students").document(body.student_id).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    # 학습 이벤트 기록
    event_id = str(uuid.uuid4())
    db.collection("learning_events").document(event_id).set({
        "event_id": event_id,
        "student_id": body.student_id,
        "concept_tag": body.concept_tag,
        "understanding_level": body.understanding_level,
        "question_id": body.question_id or "",
        "timestamp": date.today().isoformat(),
    })

    # 복습 스케줄 업데이트 (student_id + concept_tag 복합키)
    schedule_id = f"{body.student_id}_{body.concept_tag}"
    next_review = compute_next_review_date(body.understanding_level)
    schedule_doc = db.collection("review_schedule").document(schedule_id).get()

    if schedule_doc.exists:
        current = schedule_doc.to_dict()
        db.collection("review_schedule").document(schedule_id).update({
            "next_review_date": next_review.isoformat(),
            "last_level": body.understanding_level,
            "repetition_count": current.get("repetition_count", 0) + 1,
        })
    else:
        db.collection("review_schedule").document(schedule_id).set({
            "student_id": body.student_id,
            "concept_tag": body.concept_tag,
            "next_review_date": next_review.isoformat(),
            "last_level": body.understanding_level,
            "repetition_count": 1,
        })

    next_action = get_next_action(body.understanding_level)

    # 알쏭달쏭/모름 → 성향 맞춤 AI 설명
    explanation = None
    if body.understanding_level in ("알쏭달쏭", "모름"):
        try:
            profile_doc = db.collection("learning_profiles").document(body.student_id).get()
            primary_trait = profile_doc.to_dict().get("primary_trait", "V_visual") if profile_doc.exists else "V_visual"
            explanation = await generate_alternative_explanation(
                concept_tag=body.concept_tag,
                primary_trait=primary_trait,
            )
        except Exception:
            explanation = f"'{body.concept_tag}' 개념을 다시 한번 교과서에서 찾아 읽어보세요. 천천히 반복하면 이해가 될 거예요!"

    return FeedbackResponse(
        next_action=next_action,
        next_review_date=next_review,
        explanation=explanation,
    )


@router.post("/vision", response_model=VisionAnalyzeResponse)
async def analyze_vision(image_file: UploadFile = File(...)):
    db = get_db()
    contents = await image_file.read()
    image_base64 = base64.b64encode(contents).decode("utf-8")

    detected = await analyze_image_concept(image_base64)
    concept = detected.get("detected_concept", "")
    subject = detected.get("subject", "")
    grade = detected.get("grade", 3)

    curriculum_ref = (
        db.collection("curriculum_index")
        .where("grade", "==", grade)
        .where("subject", "==", subject)
        .limit(1)
        .stream()
    )
    curriculum = next((doc.to_dict() for doc in curriculum_ref), None)

    return VisionAnalyzeResponse(
        detected_concept=concept,
        matching_curriculum_id=curriculum.get("index_id") if curriculum else None,
        suggested_questions=[
            f"{concept}이(가) 무엇인지 설명해 보세요.",
            f"{concept}의 예를 하나 들어 보세요.",
            f"{concept}을 일상생활에서 찾아보세요.",
        ],
    )
