from typing import List, Dict
from app.schemas.schemas import AnswerItem, ProfileResponse

# VARK 성향 매핑 (문항 ID → 성향 가중치)
QUESTION_BANK = {
    # VARK 섹션 (프론트에서 v1~v7, a1~a7, r1~r6, k1~k6 형식으로 전송)
    "v1": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v2": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v3": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v4": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v5": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v6": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "v7": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "a1": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a2": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a3": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a4": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a5": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a6": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "a7": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "r1": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "r2": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "r3": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "r4": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "r5": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "r6": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "k1": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "k2": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "k3": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "k4": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "k5": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "k6": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    # 동기부여 섹션
    "m1": {"intrinsic": 1.0, "extrinsic": 0.0, "social": 0.0},
    "m2": {"intrinsic": 0.0, "extrinsic": 1.0, "social": 0.0},
    "m3": {"intrinsic": 0.0, "extrinsic": 0.0, "social": 1.0},
    "m4": {"intrinsic": 0.5, "extrinsic": 0.5, "social": 0.0},
    # 구버전 호환 (q_ 접두사)
    "q_v1": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "q_v2": {"V": 1.0, "A": 0.0, "R": 0.0, "K": 0.0},
    "q_a1": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "q_a2": {"V": 0.0, "A": 1.0, "R": 0.0, "K": 0.0},
    "q_r1": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "q_r2": {"V": 0.0, "A": 0.0, "R": 1.0, "K": 0.0},
    "q_k1": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "q_k2": {"V": 0.0, "A": 0.0, "R": 0.0, "K": 1.0},
    "q_m1": {"intrinsic": 1.0, "extrinsic": 0.0, "social": 0.0},
    "q_m2": {"intrinsic": 0.0, "extrinsic": 1.0, "social": 0.0},
    "q_m3": {"intrinsic": 0.0, "extrinsic": 0.0, "social": 1.0},
    "q_m4": {"intrinsic": 0.5, "extrinsic": 0.5, "social": 0.0},
}

OPTION_WEIGHTS: Dict[str, float] = {
    "o1": 1.0, "o2": 0.7, "o3": 0.3, "o4": 0.0
}

TRAIT_PERSONA_MAP = {
    "V_visual": "Visual Coach",
    "A_auditory": "Story Teller",
    "R_reading": "Book Guide",
    "K_kinesthetic": "Action Master",
}

MOTIVATION_MAP = {
    "intrinsic": "탐구형",
    "extrinsic": "목표형",
    "social": "협력형",
}


def compute_profile(answers: List[AnswerItem]) -> ProfileResponse:
    vark_scores = {"V": 0.0, "A": 0.0, "R": 0.0, "K": 0.0}
    motivation_scores = {"intrinsic": 0.0, "extrinsic": 0.0, "social": 0.0}

    for answer in answers:
        q = QUESTION_BANK.get(answer.q_id, {})
        weight = OPTION_WEIGHTS.get(answer.opt_id, 0.0)
        for trait, base in q.items():
            if trait in vark_scores:
                vark_scores[trait] += base * weight
            elif trait in motivation_scores:
                motivation_scores[trait] += base * weight

    total_vark = sum(vark_scores.values()) or 1
    sorted_vark = sorted(vark_scores.items(), key=lambda x: x[1], reverse=True)
    primary_letter = sorted_vark[0][0]
    secondary_letter = sorted_vark[1][0]

    confidence_score = sorted_vark[0][1] / total_vark

    primary_trait = f"{primary_letter}_{'visual' if primary_letter=='V' else 'auditory' if primary_letter=='A' else 'reading' if primary_letter=='R' else 'kinesthetic'}"
    secondary_trait = f"{secondary_letter}_{'visual' if secondary_letter=='V' else 'auditory' if secondary_letter=='A' else 'reading' if secondary_letter=='R' else 'kinesthetic'}"

    top_motivation = max(motivation_scores, key=motivation_scores.get)

    return ProfileResponse(
        primary_trait=primary_trait,
        secondary_trait=secondary_trait,
        motivation_type=top_motivation,
        tutor_persona=TRAIT_PERSONA_MAP.get(primary_trait, "Balanced Coach"),
        confidence_score=round(confidence_score, 2),
    )
