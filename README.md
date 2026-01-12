# 칠칠기업 법인카드 관리 시스템 v2.0

법인카드 청구명세서 자동 매칭 및 관리 시스템

## 🎯 프로젝트 목적

카드사 청구명세서(.xls)를 업로드하면:
1. 거래 내역을 자동으로 파싱
2. 등록된 패턴으로 "사용내역" 자동 매칭
3. 미매칭 항목은 수동 입력 후 패턴으로 저장
4. Google Sheets 동기화 (예정)

## 🏗️ 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   Database      │
│   (Next.js)     │     │   (FastAPI)     │     │   (SQLite)      │
│   Vercel        │     │   Local/CF      │     │   Local         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Backend 구조
```
backend/
├── app/
│   ├── api/                 # FastAPI 라우터
│   │   ├── upload.py        # 파일 업로드 API
│   │   ├── sessions.py      # 업로드 세션 관리
│   │   ├── transactions.py  # 거래 내역 관리
│   │   ├── cards.py         # 카드 관리
│   │   └── patterns.py      # 패턴 관리
│   ├── models/              # SQLAlchemy 모델
│   │   ├── card.py          # 법인카드
│   │   ├── pattern.py       # 매칭 패턴
│   │   ├── transaction.py   # 거래 내역
│   │   └── session.py       # 업로드 세션
│   ├── repositories/        # 데이터 액세스 계층
│   ├── services/            # 비즈니스 로직
│   │   ├── excel_parser.py  # Excel 파싱
│   │   ├── matching.py      # 패턴 매칭
│   │   ├── transaction.py   # 거래 처리
│   │   └── upload.py        # 업로드 처리
│   ├── database.py          # DB 연결 설정
│   └── main.py              # FastAPI 앱
└── scripts/
    └── migrate_json_to_db.py  # JSON→DB 마이그레이션
```

### Frontend 구조 (구현 예정)
```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx         # 대시보드
│   │   ├── upload/          # 파일 업로드
│   │   ├── matching/        # 거래 매칭
│   │   ├── cards/           # 카드 관리
│   │   └── patterns/        # 패턴 관리
│   ├── components/          # 공통 컴포넌트
│   └── lib/                 # API 클라이언트
```

## 📊 데이터베이스 스키마

### Cards (법인카드)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| card_number | VARCHAR(4) | 카드 끝 4자리 |
| card_name | VARCHAR(100) | 카드명/사용자명 |
| sheet_name | VARCHAR(100) | 시트명 |
| is_active | BOOLEAN | 활성화 여부 |

### Patterns (매칭 패턴)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| merchant_name | VARCHAR(200) | 가맹점명 |
| usage_description | VARCHAR(200) | 사용내역 |
| card_id | INTEGER | FK (카드 전용 패턴) |
| match_type | VARCHAR(20) | exact/contains/regex |
| priority | INTEGER | 우선순위 |
| use_count | INTEGER | 사용 횟수 |

### Transactions (거래내역)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| session_id | INTEGER | FK (업로드 세션) |
| card_id | INTEGER | FK (카드) |
| transaction_date | DATE | 거래일 |
| merchant_name | VARCHAR(200) | 가맹점명 |
| amount | INTEGER | 금액 |
| usage_description | VARCHAR(200) | 사용내역 |
| match_status | VARCHAR(20) | pending/auto/manual |

## 🔧 설치 및 실행

### 요구사항
- Python 3.12+
- Node.js 18+ (Frontend)

### Backend 설치
```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 패키지 설치
pip install fastapi uvicorn sqlalchemy alembic pandas openpyxl xlrd python-multipart

# DB 마이그레이션 (기존 JSON 데이터)
python backend/scripts/migrate_json_to_db.py

# 서버 실행
uvicorn backend.app.main:app --host 0.0.0.0 --port 8001
```

### Frontend 설치 (구현 예정)
```bash
cd frontend
npm install
npm run dev
```

## 📡 API 엔드포인트

### Upload
- `POST /api/upload` - 카드사 청구명세서 업로드

### Sessions
- `GET /api/sessions` - 업로드 세션 목록
- `GET /api/sessions/{id}` - 세션 상세
- `DELETE /api/sessions/{id}` - 세션 삭제

### Transactions
- `GET /api/transactions` - 거래 목록
- `GET /api/transactions/pending` - 미매칭 거래 (카드별)
- `PUT /api/transactions/{id}/match` - 수동 매칭
- `POST /api/transactions/bulk-match` - 대량 매칭

### Cards
- `GET /api/cards` - 카드 목록
- `POST /api/cards` - 카드 등록
- `PUT /api/cards/{id}` - 카드 수정

### Patterns
- `GET /api/patterns` - 패턴 목록
- `GET /api/patterns/stats` - 패턴 통계
- `POST /api/patterns` - 패턴 등록
- `POST /api/patterns/test-match` - 매칭 테스트

## 🎴 등록된 카드
| 카드번호 | 사용자 | 시트명 |
|----------|--------|--------|
| 3987 | 김준교 | 김준교 |
| 4985 | 김용석 대표님 | 김용석 |
| 6902 | 하이패스1 | 하이패스 |
| 6911 | 하이패스2 | 하이패스 |
| 6974 | 노혜경 이사님 | 노혜경 |
| 9980 | 공용카드 | 공용 |

## 📈 매칭 로직

3단계 우선순위:
1. **카드 전용 패턴** - 특정 카드에만 적용되는 패턴 (priority: 10)
2. **공통 정확 매칭** - 가맹점명 일치 (priority: 0)
3. **포함 매칭** - 가맹점명에 특정 문자열 포함 (priority: 5)

## 🚀 배포 계획

- **Frontend**: Vercel
- **Backend**: Cloudflare Tunnel (로컬 서버 → 외부 접근)
- **Mobile**: Galaxy Fold5에서 접근 가능

## 📁 데이터 파일

```
data/
├── card_system.db       # SQLite 데이터베이스
├── patterns_exact.json  # 정확 매칭 패턴 (마이그레이션 완료)
├── patterns_card.json   # 카드별 패턴 (마이그레이션 완료)
└── patterns_rules.json  # 규칙 패턴 (마이그레이션 완료)
```

## 📊 현재 상태

- ✅ Phase 1: Backend 인프라 구축
- ✅ Phase 2: Backend 핵심 서비스
- ✅ Phase 3: Backend API 설계
- 🔄 Phase 4: Frontend 구축 (Next.js)
- ⏳ Phase 5: 통합 & 배포

### 마이그레이션 결과
- 카드: 6개
- 정확 매칭 패턴: 142개
- 카드별 패턴: 10개
- 규칙 패턴: 4개
- **총 패턴: 156개**

---

© 2024 칠칠기업
