from fastapi import APIRouter
from app.api.v1.endpoints import assessment, lecture, lesson, learning, parent, curriculum, roster

api_router = APIRouter()

api_router.include_router(assessment.router, prefix="/assessment", tags=["Assessment"])
api_router.include_router(lecture.router, prefix="/lecture", tags=["Lecture"])
api_router.include_router(lesson.router, prefix="/lesson", tags=["Lesson"])
api_router.include_router(learning.router, prefix="/learning", tags=["Learning"])
api_router.include_router(parent.router, prefix="/parent", tags=["Parent"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["Curriculum"])
api_router.include_router(roster.router, prefix="/roster", tags=["Roster"])
