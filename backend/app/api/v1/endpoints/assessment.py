from fastapi import APIRouter, HTTPException
from app.db.firebase import get_db
from app.schemas.schemas import ProfileCreateRequest, ProfileResponse, StudentCreate, StudentResponse
from app.services.profile_service import compute_profile
import uuid

router = APIRouter()


@router.post("/students", response_model=StudentResponse, status_code=201)
async def create_student(body: StudentCreate):
    db = get_db()
    student_id = str(uuid.uuid4())
    data = {
        "student_id": student_id,
        "name": body.name,
        "grade": body.grade,
        "school": body.school or "",
    }
    db.collection("students").document(student_id).set(data)
    return StudentResponse(**data)


@router.post("/profile", response_model=ProfileResponse)
async def create_profile(body: ProfileCreateRequest):
    db = get_db()
    doc = db.collection("students").document(body.student_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    result = compute_profile(body.answers)
    db.collection("learning_profiles").document(body.student_id).set({
        "student_id": body.student_id,
        "primary_trait": result.primary_trait,
        "secondary_trait": result.secondary_trait,
        "motivation_type": result.motivation_type,
        "tutor_persona": result.tutor_persona,
        "confidence_score": result.confidence_score,
    })
    return result
