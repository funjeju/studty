from fastapi import APIRouter, Query, HTTPException, Body, UploadFile, File, Form
from app.db.firebase import get_db
from app.services.ai_service import generate_curriculum_map, extract_curriculum_from_file
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import io

router = APIRouter()

SUBJECTS_BY_GRADE = {
    # 초등 1~2학년
    1: ["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"],
    2: ["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"],
    # 초등 3~4학년
    3: ["국어", "영어", "수학", "사회", "과학", "도덕", "음악", "미술", "체육"],
    4: ["국어", "영어", "수학", "사회", "과학", "도덕", "음악", "미술", "체육"],
    # 초등 5~6학년
    5: ["국어", "영어", "수학", "사회", "과학", "도덕", "실과", "음악", "미술", "체육"],
    6: ["국어", "영어", "수학", "사회", "과학", "도덕", "실과", "음악", "미술", "체육"],
    # 중학교 1학년 (grade 7)
    7: [
        # 공통
        "국어", "영어", "수학", "사회", "도덕", "과학", "기술·가정", "정보", "체육", "음악", "미술",
        # 선택
        "한문", "환경", "생활 외국어", "보건", "진로와 직업", "스포츠 생활", "음악 감상과 비평",
        "미술 창작", "연극", "논술", "철학", "심리학",
    ],
    # 중학교 2학년 (grade 8)
    8: [
        # 공통
        "국어", "영어", "수학", "사회", "역사", "도덕", "과학", "기술·가정", "정보", "체육", "음악", "미술",
        # 선택
        "한문", "환경", "생활 외국어", "보건", "진로와 직업", "스포츠 생활", "음악 감상과 비평",
        "미술 창작", "연극", "논술", "철학", "심리학",
    ],
    # 중학교 3학년 (grade 9)
    9: [
        # 공통
        "국어", "영어", "수학", "사회", "역사", "과학", "기술·가정", "체육", "음악", "미술",
        # 선택
        "도덕", "정보", "한문", "환경", "생활 외국어", "보건", "진로와 직업", "스포츠 생활",
        "음악 감상과 비평", "미술 창작", "연극", "논술",
    ],
}


class CurriculumUnit(BaseModel):
    chacha_num: int
    chapter: str
    topic: str
    learning_goals: List[str]
    core_concepts: List[str]


class CurriculumMapResponse(BaseModel):
    grade: int
    subject: str
    units: List[CurriculumUnit]
    cached: bool


class SubjectsResponse(BaseModel):
    grade: int
    subjects: List[str]


@router.get("/subjects", response_model=SubjectsResponse)
async def get_subjects(grade: int = Query(...)):
    """학년별 과목 목록 반환"""
    # fallback: unknown grade → closest defined grade
    if grade not in SUBJECTS_BY_GRADE:
        if grade <= 2:
            grade = 1
        elif grade <= 4:
            grade = 3
        elif grade <= 6:
            grade = 5
        elif grade <= 7:
            grade = 7
        elif grade <= 8:
            grade = 8
        else:
            grade = 9
    subjects = SUBJECTS_BY_GRADE[grade]
    return SubjectsResponse(grade=grade, subjects=subjects)


@router.get("/map", response_model=CurriculumMapResponse)
async def get_curriculum_map(
    grade: int = Query(...),
    subject: str = Query(...),
):
    """
    학년+과목의 커리큘럼 맵 반환.
    Firestore에 캐싱되어 있으면 즉시 반환, 없으면 AI로 생성 후 저장.
    """
    db = get_db()
    map_id = f"{grade}_{subject}"

    # 캐시 확인
    try:
        cached_doc = db.collection("curriculum_maps").document(map_id).get()
        if cached_doc.exists:
            data = cached_doc.to_dict()
            units = [CurriculumUnit(**u) for u in data.get("units", [])]
            return CurriculumMapResponse(
                grade=grade,
                subject=subject,
                units=units,
                cached=True,
            )
    except Exception as e:
        print(f"Firestore cache read error: {e}")

    # AI로 커리큘럼 맵 생성
    try:
        result = await generate_curriculum_map(grade=grade, subject=subject)
        units_data = result.get("units", [])

        # Firestore에 저장 (캐싱)
        try:
            db.collection("curriculum_maps").document(map_id).set({
                "grade": grade,
                "subject": subject,
                "units": units_data,
                "generated_at": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            print(f"Firestore cache write error: {e}")

        units = [CurriculumUnit(**u) for u in units_data]
        return CurriculumMapResponse(
            grade=grade,
            subject=subject,
            units=units,
            cached=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"커리큘럼 생성 실패: {str(e)}")


# ─── 선생님 커리큘럼 저장/조회 ───────────────────────────────────────────────

class TeacherCurriculumSave(BaseModel):
    teacher_uid: str
    subject: str
    units: List[CurriculumUnit]


@router.post("/teacher")
async def save_teacher_curriculum(body: TeacherCurriculumSave):
    """선생님이 과목별 커리큘럼을 저장"""
    db = get_db()
    map_id = f"teacher_{body.teacher_uid}_{body.subject}"
    db.collection("teacher_curriculums").document(map_id).set({
        "teacher_uid": body.teacher_uid,
        "subject": body.subject,
        "units": [u.dict() for u in body.units],
        "updated_at": datetime.utcnow().isoformat(),
    })
    return {"status": "ok", "map_id": map_id}


@router.get("/teacher", response_model=CurriculumMapResponse)
async def get_teacher_curriculum(
    teacher_uid: str = Query(...),
    subject: str = Query(...),
):
    """선생님 자신의 커리큘럼 조회"""
    db = get_db()
    map_id = f"teacher_{teacher_uid}_{subject}"
    doc = db.collection("teacher_curriculums").document(map_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="커리큘럼이 없습니다")
    data = doc.to_dict()
    units = [CurriculumUnit(**u) for u in data.get("units", [])]
    teacher_doc = db.collection("teachers").document(teacher_uid).get()
    grade = teacher_doc.to_dict().get("grade", 3) if teacher_doc.exists else 3
    return CurriculumMapResponse(grade=grade, subject=subject, units=units, cached=True)


@router.post("/upload-file")
async def upload_curriculum_file(
    teacher_uid: str = Form(...),
    subject: str = Form(...),
    grade: int = Form(...),
    file: UploadFile = File(...),
):
    """
    선생님 커리큘럼 파일 업로드 — 형식 무관 (엑셀·PDF·이미지·Word·텍스트 등).
    Gemini AI가 파일을 분석하여 차시별 커리큘럼을 자동 추출합니다.
    저장 즉시 학생들에게 최우선 적용됩니다.
    """
    try:
        file_bytes = await file.read()
        filename = file.filename or "curriculum"

        units = await extract_curriculum_from_file(
            file_bytes=file_bytes,
            filename=filename,
            grade=grade,
            subject=subject,
        )

        if not units:
            raise HTTPException(
                status_code=400,
                detail="파일에서 커리큘럼을 추출하지 못했습니다. 파일에 수업 차시 관련 내용이 있는지 확인해주세요."
            )

        # chacha_num 재정렬 및 누락 값 보완
        for i, u in enumerate(units):
            if not u.get("chacha_num"):
                u["chacha_num"] = i + 1
        units.sort(key=lambda u: u["chacha_num"])

        db = get_db()
        map_id = f"teacher_{teacher_uid}_{subject}"
        db.collection("teacher_curriculums").document(map_id).set({
            "teacher_uid": teacher_uid,
            "subject": subject,
            "grade": grade,
            "units": units,
            "source": "teacher_upload",
            "source_filename": filename,
            "updated_at": datetime.utcnow().isoformat(),
        })

        return {
            "status": "ok",
            "map_id": map_id,
            "count": len(units),
            "grade": grade,
            "subject": subject,
            "units": units,
            "cached": True,
            "source_filename": filename,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 처리 오류: {str(e)}")


@router.get("/class", response_model=CurriculumMapResponse)
async def get_class_curriculum(
    school: str = Query(...),
    grade: int = Query(...),
    class_num: int = Query(...),
    subject: str = Query(...),
):
    """
    학생의 학교+학년+반 → 담임 선생님 커리큘럼 반환.
    선생님 커리큘럼 없으면 404 (프론트에서 AI 생성 fallback).
    """
    db = get_db()
    try:
        # school + grade + classNum으로 선생님 검색
        teachers_by_school = list(
            db.collection("teachers").where("school", "==", school).stream()
        )
        teacher_uid = None
        for t_doc in teachers_by_school:
            t = t_doc.to_dict()
            if t.get("grade") == grade and t.get("classNum") == class_num:
                teacher_uid = t.get("teacher_id") or t_doc.id
                break

        if not teacher_uid:
            raise HTTPException(status_code=404, detail="담임 선생님을 찾을 수 없습니다")

        map_id = f"teacher_{teacher_uid}_{subject}"
        doc = db.collection("teacher_curriculums").document(map_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="선생님 커리큘럼이 없습니다")

        data = doc.to_dict()
        units = [CurriculumUnit(**u) for u in data.get("units", [])]
        return CurriculumMapResponse(grade=grade, subject=subject, units=units, cached=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
