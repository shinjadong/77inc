# 칠칠기업 법인카드 관리 시스템 v2.0

법인카드 청구명세서를 자동으로 분류하고, 사용용도를 매칭하여 세무사에게 전달할 Excel 파일을 생성하는 업무 자동화 시스템입니다.

## 배포 정보

| 항목 | 값 |
|------|-----|
| **Production URL** | https://frontend-shinjadongs-projects.vercel.app |
| **Hosting** | Vercel |
| **Database** | Supabase (ap-northeast-2 Seoul) |
| **Project ID** | kxcvsgecefbzoiczyxsp |

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 (Vercel)                   │
├─────────────────────────────────────────────────────────┤
│  클라이언트 사이드:                                        │
│  ├─ SheetJS (xlsx): Excel 파싱                           │
│  ├─ ExcelJS: Excel 내보내기 (스타일 포함)                  │
│  ├─ 패턴 매칭 로직 (TypeScript)                           │
│  ├─ React Query: 서버 상태 관리                           │
│  └─ @supabase/supabase-js: DB 직접 접근                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL                      │
├─────────────────────────────────────────────────────────┤
│  users (3행) ─ cards (6행) ─ transactions (671행)        │
│                    └─ patterns (156행)                   │
│                    └─ upload_sessions (4행)              │
└─────────────────────────────────────────────────────────┘
```

---

## 주요 기능

### 1. 파일 업로드 (`/upload`)
- 카드사 청구명세서 Excel 파일(.xls, .xlsx) 업로드
- 드래그 앤 드롭 지원
- 자동 중복 검사 (결제일 + 카드 + 가맹점 + 금액)
- 업로드 히스토리 관리

### 2. 자동 패턴 매칭
3단계 우선순위 매칭 로직:
1. **카드 전용 정확 매칭** - 특정 카드에만 적용되는 exact 패턴
2. **공통 정확 매칭** - 모든 카드에 적용되는 exact 패턴
3. **포함 매칭** - 가맹점명에 특정 문자열이 포함된 경우 (contains)

### 3. 거래 내역 관리 (`/transactions`)
- 전체/대기/자동/수동 상태별 필터링
- 카드별 필터링
- 미매칭 거래 수동 입력
- 수동 입력 시 패턴 자동 학습

### 4. 패턴 관리 (`/patterns`)
- 156개 패턴 관리
- 사용 횟수 추적
- 패턴 등록/수정/삭제

### 5. Excel 내보내기 (`/export`)
- 전체 데이터 다운로드
- 월별 데이터 다운로드
- 카드별 시트 분리 (3987, 4985, 6902, 6974, 9980, 6911)
- 형식: `칠칠기업_법인카드.xlsx`

### 6. 카드 관리 (`/cards`)
- 6개 법인카드 관리
- 카드별 거래 내역 조회
- 사용자 배정

### 7. 사용자 관리 (`/users`)
- 3명 사용자 관리
- 카드 배정/해제

---

## 데이터베이스 스키마

### cards 테이블
| id | card_number | card_name | user_id | card_type |
|----|-------------|-----------|---------|-----------|
| 1 | 3987 | 김준교 카드 | 1 | personal |
| 2 | 4985 | 김용석 대표님 카드 | 2 | personal |
| 3 | 6902 | 하이패스1 | - | vehicle |
| 4 | 6974 | 법인카드 6974 | - | personal |
| 5 | 9980 | 법인카드 9980 | - | personal |
| 6 | 6911 | 법인카드 6911 | - | personal |

### patterns 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| merchant_name | VARCHAR | 가맹점명 (매칭 기준) |
| usage_description | VARCHAR | 사용용도 (매칭 결과) |
| card_id | INTEGER | NULL이면 공통 패턴 |
| match_type | ENUM | exact, contains, regex |
| priority | INTEGER | 높을수록 우선 |
| use_count | INTEGER | 사용 횟수 |

### transactions 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| transaction_date | DATE | 결제일자 |
| merchant_name | VARCHAR | 가맹점명 |
| amount | INTEGER | 이용금액 |
| usage_description | VARCHAR | 매칭된 사용용도 |
| match_status | ENUM | pending, auto, manual |
| matched_pattern_id | INTEGER | 매칭된 패턴 ID |

---

## 프로젝트 구조

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 대시보드
│   │   ├── cards/              # 카드 관리
│   │   │   ├── page.tsx
│   │   │   └── [cardId]/page.tsx
│   │   ├── users/page.tsx      # 사용자 관리
│   │   ├── upload/page.tsx     # 파일 업로드
│   │   ├── transactions/page.tsx # 거래 내역
│   │   ├── patterns/page.tsx   # 패턴 관리
│   │   └── export/page.tsx     # Excel 내보내기
│   │
│   ├── lib/                    # 핵심 라이브러리
│   │   ├── supabase.ts         # Supabase 클라이언트 및 카드 매핑
│   │   ├── api.ts              # API 함수 (Supabase 직접 쿼리)
│   │   ├── matching.ts         # 패턴 매칭 로직
│   │   ├── excel.ts            # Excel 파싱/내보내기
│   │   ├── utils.ts            # 유틸리티 함수
│   │   └── providers.tsx       # React Query Provider
│   │
│   ├── components/
│   │   ├── ui/                 # 공통 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx     # 사이드바 네비게이션
│   │       └── Header.tsx      # 헤더
│   │
│   ├── hooks/
│   │   └── useApi.ts           # React Query 커스텀 훅
│   │
│   └── types/
│       └── index.ts            # TypeScript 타입 정의
│
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 기술 스택

### Frontend
| 패키지 | 버전 | 용도 |
|--------|------|------|
| Next.js | 16.1.1 | React 프레임워크 |
| React | 19.2.3 | UI 라이브러리 |
| TypeScript | 5.x | 정적 타입 |
| Tailwind CSS | 4.x | 스타일링 |
| React Query | 5.90.16 | 서버 상태 관리 |
| Zod | 4.3.5 | 스키마 검증 |
| Lucide React | 0.562.0 | 아이콘 |

### Excel 처리
| 패키지 | 버전 | 용도 |
|--------|------|------|
| xlsx (SheetJS) | 0.18.5 | Excel 파싱 (읽기) |
| ExcelJS | 4.4.0 | Excel 생성 (쓰기, 스타일링) |

### Database
| 서비스 | 용도 |
|--------|------|
| Supabase | PostgreSQL + API |
| @supabase/supabase-js | 2.90.1 | Supabase 클라이언트 |

---

## 현재 데이터 현황 (2026-01-13)

| 테이블 | 건수 |
|--------|------|
| users | 3 |
| cards | 6 |
| patterns | 156 |
| transactions | 671 |
| upload_sessions | 4 |

### 월별 거래 현황
| 월 | 건수 |
|----|------|
| 2025년 12월 | 102 |
| 2025년 11월 | 101 |
| 2025년 10월 | 121 |
| 2025년 9월 | 97 |
| 2025년 8월 | 105 |
| 2025년 7월 | 120 |
| 2025년 6월 | 24 |
| 2025년 5월 | 1 |

### 매칭 상태
- **전체 거래**: 671건
- **미매칭 (대기)**: 144건
- **자동 매칭**: 약 78%

---

## 개발 환경 설정

### 사전 요구사항
- Node.js 18.x 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-repo/77inc.git
cd 77inc/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 환경 변수

현재 Supabase 자격 증명은 `src/lib/supabase.ts`에 하드코딩되어 있습니다.
(Vercel 환경 변수 이슈로 인한 임시 조치)

```typescript
// src/lib/supabase.ts
const supabaseUrl = 'https://kxcvsgecefbzoiczyxsp.supabase.co';
const supabaseAnonKey = 'eyJ...'; // anon key
```

### 스크립트

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint 검사
```

---

## API 구조

### `lib/api.ts` - API 함수

```typescript
// Users API
usersApi.getAll()           // 전체 사용자 조회
usersApi.create(userData)   // 사용자 생성
usersApi.update(id, data)   // 사용자 수정

// Cards API
cardsApi.getAll()           // 전체 카드 조회
cardsApi.getTransactions()  // 카드별 거래 조회
cardsApi.matchTransaction() // 거래 매칭
cardsApi.rematch()          // 일괄 재매칭

// Transactions API
transactionsApi.getAll()    // 전체 거래 조회
transactionsApi.getPending()// 미매칭 거래 조회
transactionsApi.match()     // 수동 매칭

// Patterns API
patternsApi.getAll()        // 전체 패턴 조회
patternsApi.create()        // 패턴 생성

// Upload API
uploadApi.uploadFile(file)  // 파일 업로드 및 처리

// Export API
exportApi.downloadAll()     // 전체 Excel 다운로드
exportApi.downloadMonthly() // 월별 Excel 다운로드
```

### `lib/matching.ts` - 패턴 매칭

```typescript
// 3단계 매칭 로직
findMatch(merchantName, cardId)  // 패턴 매칭
batchMatch(transactions)         // 일괄 매칭
suggestPatterns(merchantName)    // 패턴 제안
savePatternFromManualMatch()     // 수동 매칭 시 패턴 저장
```

### `lib/excel.ts` - Excel 처리

```typescript
parseCardStatement(file)      // 카드사 명세서 파싱
exportToExcel(data, filename) // Excel 내보내기
groupTransactionsByCard()     // 카드별 그룹화
formatDateForDB(date)         // 날짜 포맷팅
```

---

## 카드 매핑 정보

```typescript
// 카드번호 (끝 4자리) → card_id
const CARD_ID_MAP = {
  '3987': 1,  // 김준교
  '4985': 2,  // 김용석 대표님
  '6902': 3,  // 하이패스1
  '6974': 4,  // 노혜경 이사님
  '9980': 5,  // 공용카드
  '6911': 6,  // 하이패스2
};

// Excel 시트 순서
const CARD_ORDER = ['3987', '4985', '6902', '6974', '9980', '6911'];
```

---

## 워크플로우

### 1. 월간 처리 플로우

```
1. 카드사에서 청구명세서 Excel 다운로드
2. 시스템에 파일 업로드 (/upload)
3. 자동 매칭 결과 확인 (/transactions)
4. 미매칭 거래 수동 입력
5. Excel 내보내기 (/export)
6. 세무사에게 전달
```

### 2. 패턴 학습

```
수동 매칭 입력 → 패턴 자동 저장 → 다음 업로드 시 자동 매칭
```

---

## 변경 이력

### v2.0.0 (2026-01-13)
- Python 백엔드 제거, Supabase 직접 연결로 전환
- Next.js 16 + React 19 업그레이드
- React Query 도입
- Vercel 배포 완료

### v1.0.0 (초기)
- FastAPI 백엔드 + Next.js 프론트엔드
- JSON 파일 기반 데이터 저장

---

## 문제 해결

### Vercel 환경 변수 이슈
Vercel의 암호화된 환경 변수가 Supabase 클라이언트 초기화 시 `Headers: Invalid value` 오류를 발생시켰습니다.
**해결**: `supabase.ts`에 자격 증명 하드코딩

### CORS 이슈
Supabase에서 CORS 오류 발생 시:
1. Supabase Dashboard → Settings → API
2. Additional CORS allowed origins 확인

---

## 라이선스

Private - 칠칠기업 내부 사용
