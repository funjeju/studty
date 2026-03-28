import google.generativeai as genai
from app.core.config import settings
from typing import List, Dict
import json

genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel("gemini-2.5-flash")


async def _ask_json(prompt: str) -> Dict:
    response = _model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )
    return json.loads(response.text)


async def _ask_text(prompt: str) -> str:
    response = _model.generate_content(prompt)
    return response.text.strip()


async def generate_lesson_content(
    lesson_topic: str,
    core_concepts: List[str],
    examples: List[str],
    grade: int = 3,
) -> Dict:
    prompt = f"""
당신은 초등학교 {grade}학년 학생을 위한 친절한 선생님입니다.
다음 수업 내용을 바탕으로 복습 자료를 만들어 주세요.

수업 주제: {lesson_topic}
핵심 개념: {', '.join(core_concepts)}
수업 예시: {', '.join(examples)}

다음 JSON 형식으로만 응답해 주세요:
{{
  "lesson_summary": "2-3문장으로 수업 핵심 요약",
  "questions": [
    {{
      "concept_tag": "개념명",
      "text": "문제 내용",
      "options": [
        {{"text": "보기1", "is_correct": true}},
        {{"text": "보기2", "is_correct": false}},
        {{"text": "보기3", "is_correct": false}},
        {{"text": "보기4", "is_correct": false}}
      ],
      "difficulty": 1
    }}
  ]
}}

규칙: 문제 3개, 난이도 1(쉬움)~3(어려움), 초등학생 눈높이
"""
    return await _ask_json(prompt)


async def generate_alternative_explanation(
    concept_tag: str,
    primary_trait: str,
    grade: int = 3,
) -> str:
    trait_instructions = {
        "V_visual": "그림, 도형, 색깔, 시각적 비유를 활용해서 설명해 주세요.",
        "A_auditory": "재미있는 이야기나 노래, 리듬감 있는 설명을 사용해 주세요.",
        "R_reading": "단계별로 차근차근 글로 설명해 주세요. 예시와 정의를 명확하게.",
        "K_kinesthetic": "직접 해볼 수 있는 활동이나 몸으로 느끼는 비유를 사용해 주세요.",
    }
    instruction = trait_instructions.get(primary_trait, "쉽고 재미있게 설명해 주세요.")
    prompt = f"""
초등학교 {grade}학년 학생이 '{concept_tag}' 개념을 이해하지 못했습니다.
{instruction}
3-4문장으로 친절하고 재미있게 설명해 주세요.
"""
    return await _ask_text(prompt)


async def generate_default_map_content(
    grade: int,
    subject: str,
    chapter: str,
    unit: str,
) -> Dict:
    prompt = f"""
초등학교 {grade}학년 {subject} 교과서 '{chapter} - {unit}' 단원 복습 자료를 만들어 주세요.

JSON 형식으로만 응답:
{{
  "lesson_summary": "2-3문장 요약",
  "core_concepts": ["개념1", "개념2", "개념3"],
  "questions": [
    {{
      "concept_tag": "개념명",
      "text": "문제",
      "options": [
        {{"text": "보기1", "is_correct": true}},
        {{"text": "보기2", "is_correct": false}},
        {{"text": "보기3", "is_correct": false}},
        {{"text": "보기4", "is_correct": false}}
      ],
      "difficulty": 1
    }}
  ]
}}

문제 3개 생성.
"""
    return await _ask_json(prompt)


async def generate_parent_coaching(
    student_name: str,
    completed: int,
    weak_concepts: List[str],
    strong_concepts: List[str],
) -> str:
    prompt = f"""
초등학생 {student_name} 학생의 오늘 학습 결과입니다.
완료한 퀘스트: {completed}개
잘 이해한 개념: {', '.join(strong_concepts) if strong_concepts else '없음'}
어려워한 개념: {', '.join(weak_concepts) if weak_concepts else '없음'}

학부모에게 보내는 따뜻한 1-2문장 코칭 메시지를 작성해 주세요.
형식: "오늘 [이름]이가 [내용]... [격려/행동 가이드]"
"""
    return await _ask_text(prompt)


async def generate_curriculum_map(grade: int, subject: str) -> Dict:
    """학년+과목의 2022 개정 교육과정 기반 전체 커리큘럼 맵 생성"""
    prompt = f"""
당신은 한국 초등학교 교육과정 전문가입니다.
2022 개정 교육과정 기준으로 초등학교 {grade}학년 {subject} 교과의 전체 학습 단원을 정리해주세요.

JSON 형식으로만 응답해주세요:
{{
  "subject": "{subject}",
  "grade": {grade},
  "units": [
    {{
      "chacha_num": 1,
      "chapter": "단원명",
      "topic": "차시 주제",
      "learning_goals": ["학습 목표1", "학습 목표2"],
      "core_concepts": ["핵심 개념1", "핵심 개념2"]
    }}
  ]
}}

규칙:
- 실제 {grade}학년 {subject} 교과서 단원 순서대로 작성
- 총 15~20개 차시
- 각 차시는 실제 수업 1~2시간 분량
- 학생 눈높이에 맞는 구체적 주제명 사용
"""
    return await _ask_json(prompt)


async def generate_lesson_full_content(
    grade: int,
    subject: str,
    topic: str,
    learning_goals: List[str],
    core_concepts: List[str],
) -> Dict:
    """차시별 완전한 학습 콘텐츠 생성: 요점정리 + 개념정의 + 사전/사후테스트"""
    prompt = f"""
초등학교 {grade}학년 {subject} 교과 '{topic}' 차시의 완전한 학습 자료를 만들어주세요.
학습 목표: {', '.join(learning_goals)}
핵심 개념: {', '.join(core_concepts)}

JSON 형식으로만 응답해주세요:
{{
  "lesson_summary": "2-3문장으로 이 차시의 핵심 내용 요약",
  "concept_definitions": [
    {{"concept": "개념명", "definition": "쉬운 설명 (초등학생 눈높이)", "example": "구체적 예시"}}
  ],
  "pre_test": [
    {{
      "concept_tag": "개념명",
      "text": "사전 확인 문제 (이미 알고 있는지 체크)",
      "options": [
        {{"text": "보기1", "is_correct": true}},
        {{"text": "보기2", "is_correct": false}},
        {{"text": "보기3", "is_correct": false}},
        {{"text": "보기4", "is_correct": false}}
      ]
    }}
  ],
  "post_test": [
    {{
      "concept_tag": "개념명",
      "text": "사후 확인 문제 (배운 내용 확인)",
      "options": [
        {{"text": "보기1", "is_correct": true}},
        {{"text": "보기2", "is_correct": false}},
        {{"text": "보기3", "is_correct": false}},
        {{"text": "보기4", "is_correct": false}}
      ]
    }}
  ],
  "video_search_query": "EBS 초등 {grade}학년 {subject} {topic} 개념 설명",
  "vark_tips": {{
    "visual": "그림·도형·색깔로 개념을 시각화하는 2-3문장 설명 (예: 표, 다이어그램, 비교 그림)",
    "auditory": "리듬·이야기·소리로 기억하는 2-3문장 설명 (예: 노래, 구호, 이야기)",
    "reading": "단계별 글로 논리적으로 이해하는 2-3문장 설명 (예: 정의→예시→규칙 순서)",
    "kinesthetic": "직접 손으로 해보는 활동 2-3문장 설명 (예: 실물 조작, 몸 동작, 생활 속 예시)"
  }}
}}

규칙:
- concept_definitions: 2-3개
- pre_test: 2개 문제 (쉬움)
- post_test: 3개 문제 (중간 난이도)
- 모든 내용은 초등학생 눈높이
- video_search_query: 한국어로 EBS 또는 유튜브에서 검색할 구체적인 키워드 (예: "EBS 초등 3학년 수학 분수 개념")
- vark_tips 각 항목: 실제로 해당 주제({topic})에 맞춘 구체적인 설명 (일반적인 설명 금지)
"""
    return await _ask_json(prompt)


async def transcribe_lesson_audio(audio_base64: str, grade: int, subject: str) -> Dict:
    """수업 녹음(base64 webm) → AI 전사 + 수업 자료 구조화"""
    import base64
    audio_data = base64.b64decode(audio_base64)
    vision_model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"""
이것은 한국 초등학교 {grade}학년 {subject} 수업 녹음입니다.
녹음 내용을 전사하고 다음 JSON 형식으로 정리해 주세요:
{{
  "topic": "수업 주제 (한 줄)",
  "summary": "수업 핵심 내용 요약 (2-3문장)",
  "core_concepts": ["핵심 개념1", "핵심 개념2", "핵심 개념3"],
  "examples": ["수업에서 사용된 예시1", "예시2"],
  "other_notes": ["수업 중 특이사항, 학생 질문, 이해 어려운 개념, 기타 이슈 등 (없으면 빈 배열)"]
}}
규칙: JSON만 반환
"""
    try:
        response = vision_model.generate_content([
            {"mime_type": "audio/webm", "data": audio_data},
            prompt,
        ])
        result = json.loads(response.text)
        if "other_notes" not in result:
            result["other_notes"] = []
        return result
    except Exception:
        return {"topic": f"{subject} 수업", "summary": "수업 내용을 요약합니다.", "core_concepts": [], "examples": [], "other_notes": []}


async def extract_curriculum_from_file(
    file_bytes: bytes,
    filename: str,
    grade: int,
    subject: str,
) -> List[Dict]:
    """
    어떤 파일이든(엑셀·PDF·이미지·텍스트·Word 등) 받아서 Gemini로 커리큘럼 구조를 추출.
    반환: units 리스트 [{chacha_num, chapter, topic, learning_goals, core_concepts}]
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    base_prompt = f"""다음은 {grade}학년 {subject} 과목의 커리큘럼 관련 자료입니다.
이 내용을 분석하여 차시별 커리큘럼을 추출해주세요.

JSON 형식으로만 응답해주세요:
{{
  "units": [
    {{
      "chacha_num": 1,
      "chapter": "단원명 (없으면 빈 문자열)",
      "topic": "차시 주제/제목",
      "learning_goals": ["학습 목표1", "학습 목표2"],
      "core_concepts": ["핵심 개념1", "핵심 개념2"]
    }}
  ]
}}

규칙:
- 파일에서 찾을 수 있는 모든 차시를 추출
- 차시 번호가 없으면 순서대로 1부터 자동 부여
- 학습 목표/핵심 개념이 명시되지 않았으면 내용에서 적절히 유추
- JSON만 반환
"""

    # ── 이미지 파일 → Gemini Vision ──────────────────────────────────────
    if ext in ("jpg", "jpeg", "png", "gif", "webp", "bmp"):
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
        vision = genai.GenerativeModel("gemini-2.5-flash")
        response = vision.generate_content([{"mime_type": mime, "data": file_bytes}, base_prompt])
        return json.loads(response.text).get("units", [])

    # ── PDF → Gemini 직접 전달 ────────────────────────────────────────────
    if ext == "pdf":
        vision = genai.GenerativeModel("gemini-2.5-flash")
        try:
            response = vision.generate_content([
                {"mime_type": "application/pdf", "data": file_bytes},
                base_prompt,
            ])
            return json.loads(response.text).get("units", [])
        except Exception:
            # PDF 인라인 미지원 시 텍스트 fallback
            text = file_bytes.decode("utf-8", errors="replace")
            result = await _ask_json(base_prompt + f"\n\n파일 내용:\n{text}")
            return result.get("units", [])

    # ── 엑셀 → 텍스트 변환 후 Gemini ────────────────────────────────────
    if ext in ("xlsx", "xls"):
        try:
            import openpyxl, io as _io
            wb = openpyxl.load_workbook(_io.BytesIO(file_bytes), data_only=True)
            rows = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    line = "\t".join(str(c) if c is not None else "" for c in row)
                    if line.strip():
                        rows.append(line)
            text = "\n".join(rows)
        except Exception:
            text = file_bytes.decode("utf-8", errors="replace")
        result = await _ask_json(base_prompt + f"\n\n파일 내용:\n{text}")
        return result.get("units", [])

    # ── Word (.docx) → 텍스트 추출 시도 ────────────────────────────────
    if ext == "docx":
        try:
            import zipfile, io as _io
            from xml.etree import ElementTree as ET
            z = zipfile.ZipFile(_io.BytesIO(file_bytes))
            xml = z.read("word/document.xml")
            root = ET.fromstring(xml)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            text = "\n".join(
                "".join(t.text or "" for t in para.findall(".//w:t", ns))
                for para in root.findall(".//w:p", ns)
            )
        except Exception:
            text = file_bytes.decode("utf-8", errors="replace")
        result = await _ask_json(base_prompt + f"\n\n파일 내용:\n{text}")
        return result.get("units", [])

    # ── 그 외 모든 파일 (txt, md, csv, hwp 등) → UTF-8 텍스트로 전달 ──
    text = file_bytes.decode("utf-8", errors="replace")
    result = await _ask_json(base_prompt + f"\n\n파일 내용:\n{text}")
    return result.get("units", [])


async def extract_student_issues(lesson_text: str, student_names: List[str]) -> List[Dict]:
    """수업 녹음 전사 내용에서 특정 학생 관련 이슈(칭찬/훈육/다툼/학폭 등)를 추출"""
    if not student_names or not lesson_text.strip():
        return []

    names_str = ", ".join(student_names)
    prompt = f"""
다음은 초등학교 교사의 수업 녹음 전사 내용입니다.
수업 중 아래 학생 명단에 있는 학생과 관련된 이슈를 추출해 주세요.

학급 학생 명단: {names_str}

수업 내용:
{lesson_text}

JSON 형식으로만 응답해주세요:
{{
  "issues": [
    {{
      "student_name": "학생 이름 (반드시 명단에 있는 이름)",
      "type": "praise | discipline | conflict | bullying | other",
      "summary": "이슈 한 줄 요약"
    }}
  ]
}}

규칙:
- 명단에 있는 이름이 명확히 언급된 경우만 포함
- 이슈가 없으면 빈 배열 반환
- JSON만 반환
"""
    try:
        result = await _ask_json(prompt)
        return result.get("issues", [])
    except Exception:
        return []


async def analyze_image_concept(image_base64: str) -> Dict:
    vision_model = genai.GenerativeModel("gemini-2.5-flash")
    import base64
    image_data = base64.b64decode(image_base64)
    response = vision_model.generate_content([
        {"mime_type": "image/jpeg", "data": image_data},
        '이 이미지에서 보이는 초등학교 학습 개념을 찾아 주세요. JSON으로: {"detected_concept": "개념명", "subject": "과목", "grade": 학년숫자}',
    ])
    try:
        return json.loads(response.text)
    except Exception:
        return {"detected_concept": "알 수 없음", "subject": "", "grade": 3}
