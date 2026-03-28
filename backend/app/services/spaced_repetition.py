from datetime import date, timedelta
from app.schemas.schemas import FeedbackRequest

# 망각 곡선 기반 복습 간격 (일)
REVIEW_INTERVALS = {
    "완전이해": 7,
    "알쏭달쏭": 2,
    "모름": 0,       # 당일 재배치 (오늘 다시)
}

# 피드백 레벨 → 다음 액션
NEXT_ACTION_MAP = {
    "완전이해": "continue",
    "알쏭달쏭": "provide_alternative_explanation",
    "모름": "reteach",
}


def compute_next_review_date(understanding_level: str) -> date:
    interval = REVIEW_INTERVALS.get(understanding_level, 1)
    return date.today() + timedelta(days=interval)


def get_next_action(understanding_level: str) -> str:
    return NEXT_ACTION_MAP.get(understanding_level, "continue")
