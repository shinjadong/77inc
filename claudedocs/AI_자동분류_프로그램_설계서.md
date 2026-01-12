# 칠칠기업 법인카드 사용용도 AI 자동분류 프로그램 설계서

작성일: 2025-10-22
작성자: Claude AI Assistant
버전: 1.0

---

## 1. 프로그램 개요

### 1.1 목적
법인카드 거래내역의 '사용용도' 항목을 AI 기반으로 자동 분류하여, 부가세 신고 시 수작업 분류 시간을 단축하고 정확도를 향상시킵니다.

### 1.2 핵심 가치
- **자동화율 향상**: 신규 가맹점에 대한 AI 예측으로 90% 이상 자동 완성 목표
- **지속 학습**: 피드백 루프를 통한 정답 DB 자동 확장 및 모델 개선
- **검증 용이성**: 예측 신뢰도 점수 제공으로 검토 우선순위 결정 지원

### 1.3 주요 특징
- Claude API를 활용한 한국어 특화 텍스트 분류
- 룩업 → 유사매칭 → AI 예측 → 규칙보정의 4단계 분류 로직
- 경리 담당자 피드백을 통한 Active Learning 구현

---

## 2. 시스템 아키텍처

### 2.1 전체 구조도
```
┌─────────────────┐
│ 카드사 명세서    │ (XLSX/CSV)
│ (3987).xlsx     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│               전처리 모듈                            │
│  - 파일 파싱 및 컬럼 매핑                            │
│  - 텍스트 정규화 (공백/괄호/특수문자 제거)           │
│  - 유의어 표준화                                     │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│               분류 파이프라인                        │
│  ┌──────────────────────────────────────┐           │
│  │ 1단계: 정확 일치 룩업                │           │
│  │    - 정답 DB 완전 매칭                │           │
│  └──────────┬───────────────────────────┘           │
│             │ (미매칭 시)                            │
│             ▼                                        │
│  ┌──────────────────────────────────────┐           │
│  │ 2단계: 유사 매칭                     │           │
│  │    - Fuzzy Matching (편집거리)       │           │
│  │    - N-gram 기반 패턴 매칭           │           │
│  └──────────┬───────────────────────────┘           │
│             │ (미매칭 시)                            │
│             ▼                                        │
│  ┌──────────────────────────────────────┐           │
│  │ 3단계: Claude API 예측               │           │
│  │    - Few-shot 프롬프팅               │           │
│  │    - 신뢰도 점수 반환                │           │
│  └──────────┬───────────────────────────┘           │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────────────────────┐           │
│  │ 4단계: 규칙 기반 보정                │           │
│  │    - 키워드 사전 적용                │           │
│  │    - 후처리 규칙 실행                │           │
│  └──────────────────────────────────────┘           │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│               결과 출력                              │
│  - 일자, 가맹점명, 사용금액                          │
│  - 사용용도 (예측/확정)                              │
│  - 신뢰도 점수                                       │
│  - 라벨 출처 (룩업/유사/AI/규칙)                     │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│          피드백 루프 (Active Learning)               │
│  - 경리 담당자 검토 및 수정                          │
│  - 확정 라벨 → 정답 DB 자동 업데이트                │
│  - 50건 단위 재학습 트리거                           │
└─────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름
```
Input: 카드사 명세서 XLSX
  ↓
[전처리] 가맹점명 정규화
  ↓
[분류] 4단계 파이프라인 실행
  ↓
Output: 라벨링 결과 CSV + 신뢰도 점수
  ↓
[피드백] 경리 담당자 검토 → 정답 DB 갱신
```

---

## 3. 핵심 기능 상세

### 3.1 전처리 모듈

#### 3.1.1 파일 파싱
```python
# 지원 포맷: XLSX, CSV
# 자동 컬럼 감지: 가맹점명, 승인일자, 이용금액
def parse_card_statement(file_path):
    """
    카드사 명세서 자동 파싱

    Returns:
        DataFrame with columns:
        - 승인일자 (date)
        - 가맹점명 (str)
        - 이용금액 (int)
    """
```

#### 3.1.2 텍스트 정규화
```python
def normalize_merchant_name(name: str) -> str:
    """
    가맹점명 정규화

    처리 항목:
    1. 공백 제거/통일
    2. 괄호 내 지점명 표준화: "맥도날드(안산점)" → "맥도날드"
    3. 특수문자/이모지 제거
    4. 유의어 통일: "써브웨이" → "서브웨이"
    5. 한영/대소문자 통일
    """
```

#### 3.1.3 유의어 사전
```python
SYNONYM_MAP = {
    "써브웨이": "서브웨이",
    "오일 뱅크": "오일뱅크",
    "GS 칼텍스": "GS칼텍스",
    # ... 추가 매핑
}
```

---

### 3.2 분류 파이프라인

#### 3.2.1 1단계: 정확 일치 룩업
```python
def exact_match_lookup(merchant: str, db: DataFrame) -> Optional[str]:
    """
    정답 DB에서 완전 일치 검색

    Args:
        merchant: 정규화된 가맹점명
        db: 법인카드_가맹점-사용용도_DB.csv

    Returns:
        사용용도 or None
    """
```

#### 3.2.2 2단계: 유사 매칭
```python
def fuzzy_match(merchant: str, db: DataFrame, threshold=0.85) -> Optional[str]:
    """
    편집거리 기반 유사 매칭

    라이브러리: rapidfuzz
    임계값: 0.85 (85% 유사도)

    예시:
        "맥도날드 안산고잔DT점" → "맥도날드" (매칭)
    """

def ngram_match(merchant: str, db: DataFrame, n=3) -> Optional[str]:
    """
    N-gram 기반 패턴 매칭

    예시:
        "주식회사 삼원기업" → "삼원기업" (매칭)
    """
```

#### 3.2.3 3단계: Claude API 예측
```python
def predict_with_claude(merchant: str, context: dict) -> dict:
    """
    Claude API를 통한 사용용도 예측

    Args:
        merchant: 가맹점명
        context: {
            "승인일자": "2025-06-27",
            "이용금액": 149900,
            "known_examples": [...] # Few-shot 예시
        }

    Returns:
        {
            "사용용도": "9315호 휘발유대",
            "신뢰도": 0.92,
            "근거": "주유소 키워드 및 금액 패턴 분석"
        }
    """
```

#### 3.2.4 4단계: 규칙 기반 보정
```python
RULE_PATTERNS = {
    "차량유지비(주유)": [
        "주유소", "GS칼텍스", "S-OIL", "오일뱅크",
        "SK에너지", "현대오일", "효창에너지"
    ],
    "차량유지비(기타)": [
        "하이패스", "톨게이트", "통행", "주차", "세차"
    ],
    "중식대": [
        "맥도날드", "써브웨이", "반점", "중화요리",
        "순대국", "설렁탕", "커피", "카페"
    ],
    # ... 더 많은 규칙
}

def apply_rules(merchant: str, predicted_label: str) -> str:
    """
    키워드 사전으로 예측 라벨 검증/보정
    """
```

---

### 3.3 Claude API 프롬프트 설계

#### 3.3.1 시스템 프롬프트
```python
SYSTEM_PROMPT = """
당신은 칠칠기업의 법인카드 사용용도 분류 전문가입니다.

<role>
- 가맹점명을 분석하여 사내 분류 체계에 따라 '사용용도'를 예측합니다.
- 한국어 상호명과 업종 키워드를 정확히 이해합니다.
- 예측에 대한 신뢰도와 근거를 함께 제공합니다.
</role>

<classification_categories>
1. 차량유지비(주유): 주유소, GS칼텍스, S-OIL, 오일뱅크 등
2. 차량유지비(기타): 하이패스, 톨게이트, 주차, 세차 등
3. 중식대: 음식점, 카페, 편의점 등
4. 사용료: 소프트웨어, 클라우드, 자동결제 등
5. 복리후생비(의료): 약국, 병원, 의원 등
6. 소모품비: 문구, 다이소, 쿠팡 등
7. 기타: 위 카테고리에 해당하지 않는 경우
</classification_categories>

<output_format>
반드시 다음 XML 형식으로 응답하세요:
<prediction>
  <category>사용용도</category>
  <confidence>0.0~1.0 사이의 신뢰도</confidence>
  <reasoning>예측 근거</reasoning>
</prediction>
</output_format>
"""
```

#### 3.3.2 Few-shot 예시 구성
```python
def build_fewshot_examples(db: DataFrame, n=5) -> List[dict]:
    """
    정답 DB에서 다양한 카테고리의 예시 샘플링

    전략:
    - 각 카테고리별 1-2개씩 균형있게 선택
    - 최신 데이터 우선 (1~6월 실사 데이터)
    - 명확한 패턴을 보이는 예시 우선
    """

    examples = [
        {
            "merchant": "(주)삼원기업",
            "category": "9315호 휘발유대",
            "reasoning": "주유소 관련 기업명"
        },
        {
            "merchant": "맥도날드 안산고잔DT점",
            "category": "중식대",
            "reasoning": "음식점 체인"
        },
        {
            "merchant": "자동결제-(주)한글과컴퓨터",
            "category": "사용료",
            "reasoning": "소프트웨어 정기 결제"
        },
        # ... 더 많은 예시
    ]
    return examples
```

#### 3.3.3 API 호출 구현
```python
import anthropic

def classify_merchant_with_claude(
    merchant: str,
    examples: List[dict],
    context: dict = None
) -> dict:
    """
    Claude API를 통한 가맹점 분류
    """
    client = anthropic.Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY")
    )

    # Few-shot 예시 포맷팅
    examples_text = "\n".join([
        f"<example>\n"
        f"  <merchant>{ex['merchant']}</merchant>\n"
        f"  <category>{ex['category']}</category>\n"
        f"</example>"
        for ex in examples
    ])

    # 사용자 프롬프트 구성
    user_prompt = f"""
<examples>
{examples_text}
</examples>

<task>
다음 가맹점의 사용용도를 예측해주세요:

<merchant_info>
  <name>{merchant}</name>
  <date>{context.get('승인일자', '')}</date>
  <amount>{context.get('이용금액', '')}</amount>
</merchant_info>
</task>
"""

    # API 호출
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    )

    # 응답 파싱
    response_text = message.content[0].text
    return parse_claude_response(response_text)


def parse_claude_response(response: str) -> dict:
    """
    Claude 응답에서 XML 파싱

    Returns:
        {
            "사용용도": str,
            "신뢰도": float,
            "근거": str
        }
    """
    import xml.etree.ElementTree as ET

    try:
        root = ET.fromstring(response)
        return {
            "사용용도": root.find("category").text,
            "신뢰도": float(root.find("confidence").text),
            "근거": root.find("reasoning").text
        }
    except Exception as e:
        return {
            "사용용도": "미분류",
            "신뢰도": 0.0,
            "근거": f"파싱 오류: {str(e)}"
        }
```

---

### 3.4 피드백 루프 및 Active Learning

#### 3.4.1 피드백 수집
```python
def collect_feedback(
    merchant: str,
    predicted_label: str,
    confirmed_label: str,
    confidence: float
):
    """
    경리 담당자의 수정 사항 수집

    저장 위치: feedback_log.csv
    컬럼: 가맹점명, 예측라벨, 확정라벨, 신뢰도, 수정일시
    """
```

#### 3.4.2 정답 DB 자동 갱신
```python
def update_master_db(feedback_df: DataFrame):
    """
    확정 라벨을 정답 DB에 자동 추가

    처리:
    1. 중복 체크 (동일 가맹점명 존재 시 skip)
    2. 정규화된 가맹점명으로 추가
    3. 타임스탬프 기록
    """
```

#### 3.4.3 재학습 트리거
```python
def check_retrain_trigger() -> bool:
    """
    재학습 필요 여부 판단

    조건:
    - 신규 확정 라벨 50건 이상 누적
    - 또는 월 1회 정기 재학습
    """
```

---

## 4. 기술 스택

### 4.1 언어 및 프레임워크
- **Python 3.9+**: 메인 개발 언어
- **pandas**: 데이터 처리
- **openpyxl**: XLSX 파일 읽기/쓰기
- **anthropic**: Claude API SDK

### 4.2 핵심 라이브러리
```python
# requirements.txt
anthropic>=0.39.0
pandas>=2.0.0
openpyxl>=3.1.0
rapidfuzz>=3.0.0  # 유사 매칭
python-dotenv>=1.0.0  # 환경변수 관리
```

### 4.3 데이터 저장소
- **정답 DB**: `/mnt/data/법인카드_가맹점-사용용도_DB.csv`
- **피드백 로그**: `/mnt/data/feedback_log.csv`
- **처리 결과**: `/mnt/data/output/분류결과_YYYYMMDD.csv`

### 4.4 API 설정
```bash
# .env
ANTHROPIC_API_KEY=your_api_key_here

# 모델 설정
CLAUDE_MODEL=claude-sonnet-4-5
MAX_TOKENS=1000
TEMPERATURE=0.2  # 일관된 분류를 위해 낮은 온도 설정
```

---

## 5. 프로그램 구조

### 5.1 디렉토리 구조
```
card_classifier/
├── main.py                 # 메인 실행 파일
├── config.py               # 설정 관리
├── requirements.txt        # 의존성
├── .env                    # 환경변수
│
├── modules/
│   ├── __init__.py
│   ├── preprocessor.py     # 전처리 모듈
│   ├── classifier.py       # 분류 파이프라인
│   ├── claude_api.py       # Claude API 인터페이스
│   ├── rules.py            # 규칙 엔진
│   └── feedback.py         # 피드백 루프
│
├── data/
│   ├── master_db.csv       # 정답 DB
│   ├── feedback_log.csv    # 피드백 로그
│   └── rules/
│       └── keyword_dict.json  # 키워드 사전
│
├── output/
│   └── (분류 결과 파일들)
│
└── tests/
    ├── test_preprocessor.py
    ├── test_classifier.py
    └── test_api.py
```

### 5.2 주요 클래스 설계
```python
class CardClassifier:
    """
    메인 분류 파이프라인
    """
    def __init__(self, config: Config):
        self.preprocessor = Preprocessor()
        self.exact_matcher = ExactMatcher(master_db)
        self.fuzzy_matcher = FuzzyMatcher(master_db)
        self.claude_classifier = ClaudeClassifier(api_key)
        self.rule_engine = RuleEngine(keyword_dict)

    def classify_batch(self, df: DataFrame) -> DataFrame:
        """
        배치 분류 실행
        """
        results = []
        for idx, row in df.iterrows():
            result = self.classify_single(
                merchant=row['가맹점명'],
                context={
                    '승인일자': row['승인일자'],
                    '이용금액': row['이용금액']
                }
            )
            results.append(result)
        return pd.DataFrame(results)

    def classify_single(self, merchant: str, context: dict) -> dict:
        """
        단일 가맹점 분류 (4단계 파이프라인)
        """
        # 1. 전처리
        normalized = self.preprocessor.normalize(merchant)

        # 2. 정확 일치
        label = self.exact_matcher.match(normalized)
        if label:
            return {
                '가맹점명': merchant,
                '사용용도': label,
                '신뢰도': 1.0,
                '라벨출처': '룩업'
            }

        # 3. 유사 매칭
        label = self.fuzzy_matcher.match(normalized)
        if label:
            return {
                '가맹점명': merchant,
                '사용용도': label,
                '신뢰도': 0.9,
                '라벨출처': '유사'
            }

        # 4. Claude API 예측
        prediction = self.claude_classifier.predict(
            merchant=normalized,
            context=context
        )

        # 5. 규칙 보정
        final_label = self.rule_engine.validate(
            merchant=normalized,
            predicted_label=prediction['사용용도']
        )

        return {
            '가맹점명': merchant,
            '사용용도': final_label,
            '신뢰도': prediction['신뢰도'],
            '라벨출처': 'AI' if final_label == prediction['사용용도'] else '규칙',
            '근거': prediction['근거']
        }
```

---

## 6. 성능 지표 및 검증

### 6.1 평가 지표
```python
# 정확도 (Accuracy)
accuracy = correct_predictions / total_predictions

# Macro F1 Score (클래스 불균형 고려)
from sklearn.metrics import f1_score
f1 = f1_score(y_true, y_pred, average='macro')

# Top-2 Recall (후보 2개 제시 시)
top2_recall = correct_in_top2 / total
```

### 6.2 신뢰도 Calibration
```python
# 예측 신뢰도와 실제 정확도 일치도
def calibration_score(predictions, actuals):
    """
    신뢰도 구간별 실제 정확도 측정

    예: 신뢰도 0.9-1.0 구간에서 실제 정확도 0.85 → 과대 평가
    """
```

### 6.3 테스트 데이터셋
- **Train**: 1~6월 실사 데이터 (70%)
- **Validation**: 1~6월 실사 데이터 (15%)
- **Test**: 7월 데이터 (15%) + 신규 8월 데이터

---

## 7. 개발 단계별 계획

### Phase 1: 기본 파이프라인 구축 (1주)
- [x] 요구사항 분석 및 설계
- [ ] 전처리 모듈 개발
- [ ] 정확 일치 룩업 구현
- [ ] 유사 매칭 구현
- [ ] 단위 테스트 작성

### Phase 2: Claude API 통합 (1주)
- [ ] Claude API 프롬프트 설계
- [ ] Few-shot 예시 선정 로직
- [ ] API 호출 및 응답 파싱
- [ ] 신뢰도 검증 및 조정
- [ ] API 비용 모니터링

### Phase 3: 규칙 엔진 및 보정 (3일)
- [ ] 키워드 사전 구축
- [ ] 규칙 기반 후처리 로직
- [ ] 엣지 케이스 처리
- [ ] 통합 테스트

### Phase 4: 피드백 루프 구현 (3일)
- [ ] 피드백 수집 인터페이스
- [ ] 정답 DB 자동 갱신
- [ ] 재학습 트리거 로직
- [ ] 이력 관리 시스템

### Phase 5: UI 개발 (1주, 옵션)
- [ ] 파일 업로드 화면
- [ ] 분류 결과 테이블
- [ ] 인라인 수정 기능
- [ ] 집계 리포트 대시보드

### Phase 6: 테스트 및 최적화 (3일)
- [ ] 전체 시스템 통합 테스트
- [ ] 성능 벤치마크
- [ ] 에러 핸들링 강화
- [ ] 문서화

---

## 8. 리스크 및 대응 방안

### 8.1 API 비용 관리
**리스크**: Claude API 비용 초과
**대응**:
- 룩업/유사매칭 우선 실행으로 API 호출 최소화
- 배치 처리 시 API 호출 수 제한 (일일 1000건 등)
- 신뢰도 임계값 조정으로 불필요한 재호출 방지

### 8.2 동일 상호 다른 용도
**리스크**: "A 가맹점"이 상황에 따라 다른 용도로 사용
**대응**:
- 일자/금액 컨텍스트를 Claude에 함께 제공
- 피드백 로그에서 패턴 분석
- 필요 시 수동 예외 규칙 추가

### 8.3 오탈자 처리
**리스크**: 상호명 오기로 인한 미매칭
**대응**:
- Fuzzy 매칭 임계값 조정 (0.85 → 0.80)
- N-gram 매칭으로 부분 패턴 인식
- Claude API의 맥락 이해 능력 활용

### 8.4 신규 카테고리 추가
**리스크**: 새로운 사용용도 카테고리 발생
**대응**:
- 시스템 프롬프트에 카테고리 동적 로딩
- 정답 DB 스키마에 카테고리 컬럼 추가
- 월 1회 카테고리 리뷰 및 업데이트

---

## 9. 배포 및 운영

### 9.1 배포 환경
- **개발**: 로컬 Python 환경
- **운영**: 사내 NAS 또는 클라우드 VM

### 9.2 실행 방법
```bash
# 환경 설정
pip install -r requirements.txt
export ANTHROPIC_API_KEY='your-key-here'

# 배치 분류 실행
python main.py classify --input data/카드이용(3987).xlsx --output output/result.csv

# 피드백 업데이트
python main.py feedback --input output/feedback.csv

# 재학습 실행
python main.py retrain
```

### 9.3 모니터링
- API 호출 수 및 비용 로그
- 분류 신뢰도 분포
- 미분류 건수 추적
- 피드백 수집 현황

### 9.4 백업 전략
- 정답 DB 일일 스냅샷
- 피드백 로그 주간 백업
- 설정 파일 버전 관리

---

## 10. 확장 계획

### 10.1 단기 (3개월)
- 신뢰도 기반 자동 승인 기능 (신뢰도 > 0.95)
- 웹 UI 개발 (Flask/Streamlit)
- 월별 분류 정확도 리포트 자동 생성

### 10.2 중기 (6개월)
- 멀티 카드 지원 (다른 카드번호 통합)
- 카테고리별 금액 예산 초과 알림
- OCR 연동 (종이 영수증 자동 인식)

### 10.3 장기 (1년)
- 자동화된 부가세 신고서 생성
- 거래 패턴 이상 탐지 (fraud detection)
- 경비 절감 인사이트 제공

---

## 부록 A: Claude API 프롬프트 전문

### A.1 시스템 프롬프트 (최종 버전)
```
당신은 칠칠기업의 법인카드 거래내역 사용용도 자동분류 전문가입니다.

<role>
가맹점명, 승인일자, 이용금액 정보를 분석하여 사내 분류 체계에 따라
정확한 '사용용도' 카테고리를 예측합니다.
</role>

<expertise>
- 한국어 상호명 및 브랜드 패턴 이해
- 업종별 키워드 인식 (주유소, 음식점, 소프트웨어 등)
- 금액 패턴 분석 (주유비, 식대, 소모품 등)
- 컨텍스트 기반 추론 (일자, 금액과 용도의 관계)
</expertise>

<classification_system>
칠칠기업은 다음과 같은 사용용도 체계를 사용합니다:

1. 차량유지비(주유)
   - 주유소 관련: GS칼텍스, S-OIL, 오일뱅크, SK에너지, 현대오일, 효창에너지 등
   - 키워드: 주유소, 주유, 경유, 휘발유, 셀프주유 등

2. 차량유지비(기타)
   - 통행료: 하이패스, 톨게이트, IC주유소(통행), 고속도로 등
   - 주차: 주차장, 파킹, 주차비 등
   - 세차: 세차장, 세차 등
   - 정비: 자동차정비, 자동차검사, 타이어 등

3. 중식대
   - 음식점: 식당, 한식, 중식, 일식, 양식, 분식 등
   - 패스트푸드: 맥도날드, 롯데리아, 버거킹, 써브웨이 등
   - 카페: 스타벅스, 이디야, 커피, 카페 등
   - 편의점: CU, GS25, 세븐일레븐 등 (식품 구매)

4. 사용료
   - 소프트웨어: 한글과컴퓨터, Microsoft, Adobe, 오피스365 등
   - 클라우드: AWS, 네이버클라우드, 카카오클라우드 등
   - 통신: 휴대폰, 인터넷, 메시지 등
   - 자동결제 서비스 전반

5. 복리후생비(의료)
   - 의료기관: 병원, 의원, 한의원, 치과 등
   - 약국: 약국, 약국 등

6. 소모품비
   - 문구/사무용품: 다이소, 오피스디포, 모닝글로리 등
   - 온라인쇼핑: 쿠팡, 이마트, 홈플러스 등 (소모품)
   - 키워드: 문구, 토너, 잉크, 복사용지, 비품 등

7. 수수료
   - 금융: 은행, 보증보험, 기술보증기금 등
   - 법무: 법원, 등기소 등
   - 우편: 우체국, 우편료 등

8. 세금
   - 국세청: 부가가치세, 법인세 등
   - 지방세: 자동차세, 재산세 등

9. 기타
   - 위 카테고리에 명확히 해당하지 않는 경우
   - 판단이 어려운 경우
</classification_system>

<guidelines>
1. 가맹점명의 핵심 키워드를 정확히 식별하세요
2. 업종이 명확하지 않으면 금액과 일자 패턴을 참고하세요
3. 예시 데이터를 참고하되, 기계적 매칭이 아닌 의미론적 이해를 우선하세요
4. 확신이 서지 않으면 낮은 신뢰도를 부여하세요
5. 반드시 기존 카테고리 중 하나를 선택하세요 (새 카테고리 생성 금지)
</guidelines>

<output_requirements>
반드시 다음 XML 형식으로 응답하세요. 다른 텍스트는 포함하지 마세요:

<prediction>
  <category>사용용도 카테고리</category>
  <confidence>0.0~1.0 사이의 신뢰도 (소수점 2자리)</confidence>
  <reasoning>예측 근거를 1-2문장으로 간결하게</reasoning>
</prediction>

신뢰도 기준:
- 0.9 이상: 매우 확실 (명확한 키워드 매칭)
- 0.7~0.9: 확실 (업종 추론 가능)
- 0.5~0.7: 보통 (일부 불확실성 존재)
- 0.5 미만: 불확실 (추가 확인 필요)
</output_requirements>
```

### A.2 사용자 프롬프트 템플릿
```
<examples>
{few_shot_examples}
</examples>

<task>
다음 법인카드 거래의 사용용도를 예측해주세요:

<transaction>
  <merchant>{가맹점명}</merchant>
  <date>{승인일자}</date>
  <amount>{이용금액}원</amount>
</transaction>

위 거래의 사용용도를 예측하고, 신뢰도와 근거를 제시해주세요.
</task>
```

---

## 부록 B: 샘플 데이터

### B.1 Few-shot 예시 세트 (5개)
```python
FEWSHOT_EXAMPLES = [
    {
        "merchant": "(주)삼원기업",
        "date": "2025-06-27",
        "amount": "149,900",
        "category": "9315호 휘발유대",
        "reasoning": "주유소 관련 기업"
    },
    {
        "merchant": "맥도날드 안산고잔DT점",
        "date": "2025-06-26",
        "amount": "7,500",
        "category": "중식대",
        "reasoning": "패스트푸드 체인점"
    },
    {
        "merchant": "자동결제-(주)한글과컴퓨터",
        "date": "2025-05-01",
        "amount": "월정액",
        "category": "사용료",
        "reasoning": "소프트웨어 정기 결제"
    },
    {
        "merchant": "쿠팡(주)-쿠팡(주)",
        "date": "2025-06-26",
        "amount": "60,230",
        "category": "회사물품구입비",
        "reasoning": "온라인 쇼핑몰"
    },
    {
        "merchant": "서울보증보험(주)안산지점/인터넷",
        "date": "2025-04-15",
        "amount": "변동",
        "category": "보증보험료",
        "reasoning": "금융 서비스"
    }
]
```

---

## 부록 C: 키워드 사전 (일부)

```json
{
  "차량유지비(주유)": {
    "keywords": [
      "주유소", "GS칼텍스", "S-OIL", "오일뱅크", "SK에너지",
      "현대오일", "효창에너지", "셀프주유", "경유", "휘발유"
    ],
    "patterns": [
      ".*주유.*", ".*칼텍스.*", ".*에너지.*", ".*오일.*"
    ]
  },
  "차량유지비(기타)": {
    "keywords": [
      "하이패스", "톨게이트", "IC주유소", "주차", "세차",
      "자동차정비", "자동차검사", "타이어"
    ],
    "patterns": [
      ".*주차.*", ".*세차.*", ".*정비.*", ".*검사.*"
    ]
  },
  "중식대": {
    "keywords": [
      "맥도날드", "롯데리아", "버거킹", "써브웨이", "서브웨이",
      "스타벅스", "이디야", "커피", "카페", "식당", "반점"
    ],
    "patterns": [
      ".*식당.*", ".*카페.*", ".*커피.*", ".*반점.*"
    ]
  }
}
```

---

## 문서 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-10-22 | 초안 작성 | Claude AI |

---

**다음 단계**: 이 설계서를 기반으로 Phase 1 개발을 시작합니다.
