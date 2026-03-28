from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey,
    JSON, Text, Enum, Boolean, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class UnderstandingLevel(str, enum.Enum):
    COMPLETE = "완전이해"
    UNSURE = "알쏭달쏭"
    UNKNOWN = "모름"


class Student(Base):
    __tablename__ = "students"

    student_id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(50), nullable=False)
    grade = Column(Integer, nullable=False)
    school = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("LearningProfile", back_populates="student", uselist=False)
    learning_events = relationship("LearningEvent", back_populates="student")
    review_schedules = relationship("ReviewSchedule", back_populates="student")


class LearningProfile(Base):
    __tablename__ = "learning_profiles"

    profile_id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.student_id"), unique=True)
    primary_trait = Column(String(20))        # V_visual, A_auditory, R_reading, K_kinesthetic
    secondary_trait = Column(String(20))
    motivation_type = Column(String(20))      # intrinsic, extrinsic, social
    confidence_score = Column(Float, default=0.0)
    tutor_persona = Column(String(50))        # "Visual Coach", "Story Teller", etc.
    raw_scores = Column(JSON)                 # {vark: {...}, experience: {...}, ...}
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", back_populates="profile")


class Teacher(Base):
    __tablename__ = "teachers"

    teacher_id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(50), nullable=False)
    school = Column(String(100))
    grade = Column(Integer)
    subject = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lessons = relationship("Lesson", back_populates="teacher")


class Lesson(Base):
    __tablename__ = "lessons"

    lesson_id = Column(String, primary_key=True, default=gen_uuid)
    teacher_id = Column(String, ForeignKey("teachers.teacher_id"))
    subject = Column(String(50))
    lesson_topic = Column(String(200))
    learning_goal = Column(Text)
    core_concepts = Column(JSON)    # list of strings
    examples = Column(JSON)         # list of strings
    lesson_date = Column(Date, server_default=func.current_date())
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("Teacher", back_populates="lessons")
    generated_questions = relationship("GeneratedQuestion", back_populates="lesson")


class GeneratedQuestion(Base):
    __tablename__ = "generated_questions"

    q_id = Column(String, primary_key=True, default=gen_uuid)
    lesson_id = Column(String, ForeignKey("lessons.lesson_id"))
    concept_tag = Column(String(100))
    text = Column(Text)
    options = Column(JSON)          # [{text, is_correct}]
    difficulty = Column(Integer, default=1)  # 1-3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="generated_questions")


class LearningEvent(Base):
    __tablename__ = "learning_events"

    event_id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.student_id"))
    concept_tag = Column(String(100))
    understanding_level = Column(String(10))  # 완전이해/알쏭달쏭/모름
    question_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="learning_events")


class ReviewSchedule(Base):
    __tablename__ = "review_schedule"

    schedule_id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.student_id"))
    concept_tag = Column(String(100))
    lesson_id = Column(String, nullable=True)
    next_review_date = Column(Date)
    repetition_count = Column(Integer, default=0)
    last_level = Column(String(10))

    student = relationship("Student", back_populates="review_schedules")


class CurriculumIndex(Base):
    __tablename__ = "curriculum_index"

    index_id = Column(String, primary_key=True, default=gen_uuid)
    grade = Column(Integer)
    subject = Column(String(50))
    semester = Column(Integer)
    chapter = Column(String(200))
    unit = Column(String(200))
    achievement_standard = Column(Text)
    week_order = Column(Integer)        # 해당 학년 주차 순서
