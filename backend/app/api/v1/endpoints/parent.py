from fastapi import APIRouter, Query, HTTPException
from app.db.firebase import get_db
from app.schemas.schemas import ParentDashboardResponse
from app.services.ai_service import generate_parent_coaching
from datetime import date

router = APIRouter()


@router.get("/dashboard/today", response_model=ParentDashboardResponse)
async def get_parent_dashboard(student_id: str = Query(...)):
    db = get_db()

    student_doc = db.collection("students").document(student_id).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")
    student = student_doc.to_dict()

    today = date.today().isoformat()

    events_ref = (
        db.collection("learning_events")
        .where("student_id", "==", student_id)
        .where("timestamp", "==", today)
        .stream()
    )
    events = [doc.to_dict() for doc in events_ref]

    completed_quests = len(events)
    weak_concepts = list({e["concept_tag"] for e in events if e.get("understanding_level") in ("알쏭달쏭", "모름")})
    strong_concepts = list({e["concept_tag"] for e in events if e.get("understanding_level") == "완전이해"})

    schedule_ref = (
        db.collection("review_schedule")
        .where("student_id", "==", student_id)
        .stream()
    )
    schedules = sorted(
        [doc.to_dict() for doc in schedule_ref],
        key=lambda x: x.get("next_review_date", ""),
    )[:3]
    next_review_topics = [s["concept_tag"] for s in schedules]

    coaching_script = await generate_parent_coaching(
        student_name=student["name"],
        completed=completed_quests,
        weak_concepts=weak_concepts,
        strong_concepts=strong_concepts,
    )

    return ParentDashboardResponse(
        student_name=student["name"],
        date=date.today(),
        emotional_coaching_script=coaching_script,
        completed_quests=completed_quests,
        weak_concepts=weak_concepts,
        strong_concepts=strong_concepts,
        next_review_topics=next_review_topics,
    )
