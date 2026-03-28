from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from app.db.firebase import get_db
from pydantic import BaseModel
from typing import List, Optional
from datetime import date as dt_date
import io
import uuid

router = APIRouter()


class StudentInfo(BaseModel):
    num: int
    name: str
    photo_url: Optional[str] = ""
    memo: Optional[str] = ""


class StudentRequest(BaseModel):
    teacher_uid: str
    num: int
    name: str
    photo_url: Optional[str] = ""
    memo: Optional[str] = ""


# ─── 명단 CRUD ──────────────────────────────────────────────────────────────

@router.get("/students")
async def get_students(teacher_uid: str = Query(...)):
    db = get_db()
    doc = db.collection("class_roster").document(teacher_uid).get()
    if not doc.exists:
        return {"teacher_uid": teacher_uid, "students": []}
    return {"teacher_uid": teacher_uid, "students": doc.to_dict().get("students", [])}


@router.post("/students")
async def add_student(body: StudentRequest):
    db = get_db()
    doc_ref = db.collection("class_roster").document(body.teacher_uid)
    doc = doc_ref.get()
    students: list = doc.to_dict().get("students", []) if doc.exists else []

    if any(s["num"] == body.num for s in students):
        raise HTTPException(status_code=400, detail=f"번호 {body.num}는 이미 존재합니다")

    students.append({"num": body.num, "name": body.name, "photo_url": body.photo_url or "", "memo": body.memo or ""})
    students.sort(key=lambda s: s["num"])
    doc_ref.set({"students": students})
    return {"status": "ok"}


@router.put("/students/{num}")
async def update_student(num: int, body: StudentRequest):
    db = get_db()
    doc_ref = db.collection("class_roster").document(body.teacher_uid)
    doc = doc_ref.get()
    students: list = doc.to_dict().get("students", []) if doc.exists else []

    idx = next((i for i, s in enumerate(students) if s["num"] == num), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")

    students[idx] = {"num": body.num, "name": body.name, "photo_url": body.photo_url or "", "memo": body.memo or ""}
    students.sort(key=lambda s: s["num"])
    doc_ref.set({"students": students})
    return {"status": "ok"}


@router.delete("/students/{num}")
async def delete_student(num: int, teacher_uid: str = Query(...)):
    db = get_db()
    doc_ref = db.collection("class_roster").document(teacher_uid)
    doc = doc_ref.get()
    students: list = doc.to_dict().get("students", []) if doc.exists else []
    students = [s for s in students if s["num"] != num]
    doc_ref.set({"students": students})
    return {"status": "ok"}


@router.post("/students/excel")
async def upload_excel(teacher_uid: str = Form(...), file: UploadFile = File(...)):
    """엑셀 파일(.xlsx)에서 학생 명단 일괄 업로드

    엑셀 형식:
      A열: 번호 (숫자)
      B열: 이름
      C열: 메모 (선택)
    1행은 헤더로 건너뜁니다.
    """
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl 패키지가 설치되지 않았습니다. pip install openpyxl")

    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active

        students = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or row[0] is None:
                continue
            try:
                num = int(row[0])
            except (ValueError, TypeError):
                continue
            name = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            memo = str(row[2]).strip() if len(row) > 2 and row[2] else ""
            if name:
                students.append({"num": num, "name": name, "photo_url": "", "memo": memo})

        students.sort(key=lambda s: s["num"])
        db = get_db()
        db.collection("class_roster").document(teacher_uid).set({"students": students})
        return {"status": "ok", "count": len(students), "students": students}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"엑셀 파싱 오류: {str(e)}")


@router.patch("/students/{num}/photo")
async def update_photo(num: int, teacher_uid: str = Query(...), photo_url: str = ""):
    """학생 사진(base64 또는 URL) 업데이트"""
    db = get_db()
    doc_ref = db.collection("class_roster").document(teacher_uid)
    doc = doc_ref.get()
    students: list = doc.to_dict().get("students", []) if doc.exists else []
    idx = next((i for i, s in enumerate(students) if s["num"] == num), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
    students[idx]["photo_url"] = photo_url
    doc_ref.set({"students": students})
    return {"status": "ok"}


# ─── 복습 현황 ───────────────────────────────────────────────────────────────

@router.get("/reviews")
async def get_reviews(teacher_uid: str = Query(...), date: Optional[str] = None):
    """날짜별 학생 복습 현황 — 명단과 activity 기록을 조인하여 반환"""
    db = get_db()
    today = date or dt_date.today().isoformat()

    roster_doc = db.collection("class_roster").document(teacher_uid).get()
    students: list = roster_doc.to_dict().get("students", []) if roster_doc.exists else []

    # student_activity 컬렉션에서 해당 날짜 전체 조회 후 이름으로 매핑
    activity_docs = db.collection("student_activity").where("date", "==", today).stream()
    activities: dict = {}
    for doc in activity_docs:
        d = doc.to_dict()
        activities[d.get("student_name", "")] = d

    result = []
    for s in students:
        act = activities.get(s["name"], {})
        result.append({
            "num": s["num"],
            "name": s["name"],
            "photo_url": s.get("photo_url", ""),
            "viewed": act.get("viewed", False),
            "duration_sec": act.get("duration_sec", 0),
            "pre_correct": act.get("pre_correct"),
            "pre_total": act.get("pre_total"),
            "post_correct": act.get("post_correct"),
            "post_total": act.get("post_total"),
            "subject": act.get("subject", ""),
        })

    return {"date": today, "students": result}


# ─── 이슈 로그 ───────────────────────────────────────────────────────────────

@router.get("/issues")
async def get_issues(
    teacher_uid: str = Query(...),
    student_name: Optional[str] = None,
    issue_type: Optional[str] = None,
):
    """AI가 수업 녹음에서 추출한 학생 이슈 로그"""
    db = get_db()
    query = db.collection("student_issues").where("teacher_uid", "==", teacher_uid)
    if student_name:
        query = query.where("student_name", "==", student_name)
    if issue_type:
        query = query.where("type", "==", issue_type)

    docs = list(query.stream())
    issues = sorted([d.to_dict() for d in docs], key=lambda x: x.get("date", ""), reverse=True)
    return {"issues": issues[:100]}
