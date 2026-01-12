# 칠칠기업 법인카드 자동분류 시스템

카드사 청구명세서를 자동으로 분류하여 메인 Excel 파일에 기재하고 구글 시트와 동기화합니다.

## 설치

```bash
# 가상환경 활성화
cd /home/tlswk/77corp
source venv/bin/activate

# 의존성 설치 (이미 완료됨)
pip install -r scripts/requirements.txt
```

## 사용법

### 1. 기본 실행 (테스트)
저장하지 않고 분류 결과만 확인:
```bash
source venv/bin/activate
python scripts/main.py "/home/tlswk/77corp/카드/청구명세서조회_*" --dry-run
```

### 2. 실제 처리 (저장)
Excel 파일에 저장하고 구글 시트 동기화:
```bash
source venv/bin/activate
python scripts/main.py "/home/tlswk/77corp/카드/" --sync-sheets
```

### 3. 미분류 항목 학습
미분류 리포트에 '최종_사용용도' 입력 후:
```bash
python scripts/learn_patterns.py "/home/tlswk/77corp/미분류/pending_20260112.xlsx"
```

### 4. 구글 시트만 동기화
```bash
python scripts/sheets_sync.py --sync
```

## 파일 구조

```
scripts/
├── main.py              # 메인 실행
├── parser.py            # 카드사 파일 파싱
├── matcher.py           # 사용용도 매칭
├── excel_handler.py     # Excel 처리
├── sheets_sync.py       # 구글 시트 동기화
├── pattern_extractor.py # 패턴 추출
└── learn_patterns.py    # 패턴 학습

data/
├── patterns_exact.json      # 정확 매칭 (142개)
├── patterns_card.json       # 카드별 특수 매핑 (5개)
├── patterns_rules.json      # 규칙 기반 (3개)
└── usage_categories.json    # 사용용도 목록 (26개)
```

## 분류 우선순위

1. **카드별 특수 매핑** (CARD_SPECIFIC)
   - 동일 가맹점이 카드별로 다른 용도인 경우
   - 예: 쿠팡 → 6974: 기숙사 물품 / 9980: 회사물품

2. **정확 매칭** (EXACT)
   - 가맹점명 100% 일치
   - 기존 345건 데이터에서 추출

3. **규칙 기반** (RULE)
   - 키워드 포함 여부로 판단
   - 예: "하이패스" → 차량유지비(기타)

4. **미분류** (MANUAL)
   - 신규 가맹점
   - 수동 검토 후 학습

## n8n 워크플로우

n8n UI에서 워크플로우를 가져오려면:
1. n8n 접속
2. Workflows → Import from File
3. `/home/tlswk/77corp/n8n/card_workflow.json` 선택

## 카드 정보

| 카드 | 담당자 | 주요 용도 |
|------|--------|-----------|
| 3987 | 김준교 | 중식대, 차량유지비 |
| 4985 | 김용석 대표님 | 거래처 교제비 |
| 6902 | 하이패스1 | 차량유지비(기타) |
| 6911 | 하이패스2 | 차량유지비(기타) |
| 6974 | 노혜경 이사님 | 중식대, 기숙사 물품 |
| 9980 | 공용카드 | 차량유지비, 사용료 |

## 문제 해결

### "미분류" 항목이 많은 경우
1. 미분류 리포트 확인: `/home/tlswk/77corp/미분류/pending_*.xlsx`
2. '최종_사용용도' 컬럼에 올바른 용도 입력
3. `python scripts/learn_patterns.py <파일>` 실행
4. 다음 처리부터 자동 분류됨

### 구글 시트 동기화 실패
1. 서비스 계정 파일 확인: `/home/tlswk/77corp/config/reflected-gamma-*.json`
2. 스프레드시트 공유 설정 확인 (서비스 계정 이메일에 편집 권한)
