# 칠칠기업 법인카드 관리 시스템 v3.0

법인카드 청구명세서 자동 매칭 및 AI 기반 분류 관리 시스템

## 🎯 프로젝트 목적

카드사 청구명세서(.xls)를 업로드하면:
1. 거래 내역을 자동으로 파싱
2. 4단계 패턴 매칭으로 "사용내역" 자동 매칭
3. AI 어시스턴트와 대화형으로 거래 관리
4. 미매칭 항목은 수동 입력 후 패턴으로 저장
5. 엑셀 내보내기 및 분석 리포트 제공

## 🏗️ 아키텍처

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Database      │
│   (Next.js 15)  │     │   (Supabase)    │
│   Vercel        │     │   PostgreSQL    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   AI Providers  │
│   - DeepSeek    │ (기본, 최저가)
│   - OpenAI      │
│   - Anthropic   │
│   - OpenRouter  │
└─────────────────┘
```

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 대시보드
│   │   ├── upload/               # 파일 업로드
│   │   ├── transactions/         # 거래 내역 관리
│   │   ├── patterns/             # 패턴 관리
│   │   ├── cards/                # 카드 관리
│   │   └── api/
│   │       └── assistant/        # AI 어시스턴트 API
│   │
│   ├── components/
│   │   ├── chat-sidebar/         # AI 사이드바 채팅
│   │   │   ├── ChatSidebar.tsx
│   │   │   ├── AISettingsModal.tsx
│   │   │   └── ChatSidebarHeader.tsx
│   │   ├── assistant/            # AI 관련 UI
│   │   ├── dashboard/            # 대시보드 컴포넌트
│   │   ├── layout/               # 레이아웃
│   │   └── ui/                   # 공통 UI 컴포넌트
│   │
│   └── lib/
│       ├── ai/
│       │   ├── openrouter-config.ts  # AI 프로바이더 설정
│       │   └── settings-store.ts     # 설정 저장소
│       ├── supabase/             # Supabase 클라이언트
│       ├── taxCategories.ts      # 세금 분류 카테고리 정의
│       ├── taxClassifier.ts      # 룰 기반 세금 자동 분류
│       └── utils.ts              # 유틸리티
│
├── .env.example                  # 환경변수 예시
└── package.json
```

## 🤖 AI 프로바이더 지원

### 지원 프로바이더
| 프로바이더 | 가격 (1M 토큰) | 특징 |
|-----------|---------------|------|
| **DeepSeek** | 입력 $0.28 / 출력 $0.42 | 가장 저렴, 기본값 |
| OpenAI | 입력 $2.50 / 출력 $10.00 | GPT-4o, 멀티모달 |
| Anthropic | 입력 $3.00 / 출력 $15.00 | Claude Sonnet 4 |
| OpenRouter | 다양 | 400+ 모델 통합 |

### AI 설정 모드
- **서버 설정 사용 (권장)**: `.env.local`의 API 키 자동 사용
- **직접 입력**: 클라이언트에서 API 키 입력

## 📈 4단계 패턴 매칭 로직

```
1단계: 정확 일치 룩업
   ↓ (미매칭 시)
2단계: 유사 매칭 (Fuzzy Matching)
   ↓ (미매칭 시)
3단계: 규칙 기반 매칭 (키워드 패턴)
   ↓ (미매칭 시)
4단계: 업종 기반 자동 매칭
```

### 우선순위
1. **카드 전용 패턴** - 특정 카드에만 적용 (priority: 10)
2. **정확 매칭** - 가맹점명 완전 일치 (priority: 0)
3. **포함 매칭** - 가맹점명에 특정 문자열 포함 (priority: 5)
4. **업종 기반** - 업종 MCC 코드로 자동 분류

## 🔧 설치 및 실행

### 요구사항
- Node.js 18+
- Supabase 프로젝트

### 설치
```bash
cd frontend
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 개발 서버 실행
npm run dev
```

### 환경변수 설정

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI 프로바이더 (기본 권장: DeepSeek)
NEXT_PUBLIC_AI_PROVIDER=deepseek
NEXT_PUBLIC_AI_MODEL=deepseek-chat

# API 키 (서버 사이드)
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# OpenRouter (선택)
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-...
```

## 🚀 주요 기능

### AI 어시스턴트
- 자연어로 거래 내역 조회
- 패턴 매칭 요청
- 엑셀 다운로드 요청
- 분석 리포트 생성

### 거래 관리
- 카드사 명세서 업로드 (XLSX/XLS)
- 자동 패턴 매칭
- 수동 매칭 및 패턴 저장
- 다중 카드 지원
- **추가메모**: 내부 관리용 선택 입력 (예: "점심빵 먹느라고 한 거")
- **세금분류**: 11개 카테고리 자동 분류 (접대비, 식비, 교통비 등)
- 엑셀 내보내기 6컬럼 지원 (사용용도 + 추가메모 + 세금분류)

### Excel Download Options

**서버 사이드 다운로드 (권장)**:
- API Endpoint: `/api/export`
- 필터링 지원: 기간, 카드, 매칭상태
- 대용량 데이터 안정적 처리
- Node.js runtime 기반 (최대 60초 실행 시간)

**필터 옵션**:
- **기간 필터**: YYYY-MM-DD 형식으로 시작일/종료일 지정
- **카드 필터**: 1개 이상 선택 가능 (8개 카드 중 선택)
- **매칭상태 필터**: 전체/매칭대기/자동매칭/수동매칭

**다운로드 형식**:
- 6컬럼 엑셀 (결제일자, 가맹점명, 이용금액, 사용용도, 추가메모, 세금분류)
- 카드별 시트 자동 생성
- 날짜/금액 자동 포맷팅
- 빈 시트 처리 (데이터 없는 카드)

### 분석 기능
- 월별/카드별 사용 내역
- 매칭 대기 건수 추적
- 카테고리별 지출 분석

## 📡 API 엔드포인트

### AI 어시스턴트
- `POST /api/assistant` - AI 채팅 (스트리밍)

### Excel Export
- `GET /api/export` - 서버 사이드 엑셀 다운로드
  - Query Parameters:
    - `dateFrom`: 시작일 (YYYY-MM-DD)
    - `dateTo`: 종료일 (YYYY-MM-DD)
    - `cardIds`: 카드번호 (쉼표 구분, 예: "3987,4985" 또는 "all")
    - `matchStatus`: 매칭상태 ("all", "pending", "auto", "manual")
  - Response: Excel file (XLSX)

### 거래 관리 (Supabase RPC)
- 거래 목록 조회
- 패턴 매칭 실행
- 수동 매칭 저장

## 🎴 등록된 카드
| 카드번호 | 사용자 | 시트명 |
|----------|--------|--------|
| 3987 | 김준교 | 김준교 |
| 4985 | 김용석 대표님 | 김용석 |
| 6902 | 하이패스1 | 하이패스 |
| 6911 | 하이패스2 | 하이패스 |
| 6974 | 노혜경 이사님 | 노혜경 |
| 9980 | 공용카드 | 공용 |
| 0981 | 법인카드 0981 | 0981 |
| 9904 | 법인카드 9904 | 9904 |

## 📊 현재 상태

- ✅ Phase 1: Next.js + Supabase 아키텍처 구축
- ✅ Phase 2: 거래 내역 관리 UI
- ✅ Phase 3: AI 어시스턴트 통합 (멀티 프로바이더)
- ✅ Phase 4: 4단계 패턴 매칭 로직
- ✅ Phase 5: 서버 설정 모드 (API 키 자동 적용)
- 🔄 Phase 6: 분석 및 리포팅 고도화

## 📝 최근 업데이트

### v3.2 (2025-01-16)
- **서버 사이드 다운로드**: Next.js API Route 기반 엑셀 다운로드 구현
- **필터링 기능**: 기간/카드/매칭상태 필터링 추가
- **카드 매칭 수정**: 6911, 6974, 9980 카드 거래 재분류 (55건)
- **데이터 무결성**: 하이패스 카드 100% 검증 완료 (6902, 6911)
- **대용량 처리**: Node.js runtime으로 안정적 처리 (최대 60초)
- **코드 문서화**: CARD_ID_MAP에 히스토리 주석 추가

### v3.1.1 (2025-01-16)
- **네비게이션 수정**: Sidebar 거래관리 링크를 /transactions로 통일
- **중복 페이지 제거**: /workspace 폴더 및 구버전 컴포넌트 삭제 (1,039줄 삭제)
- **메뉴 구조 개선**: 업로드, 내보내기를 별도 메뉴 항목으로 분리
- **배포 환경 동기화**: 로컬과 배포 환경에서 동일한 UI 제공 (10개 컬럼)

### v3.1 (2025-01-15)
- **거래 데이터 확장**: 추가메모 및 세금분류 필드 추가
- **엑셀 6컬럼 지원**: 기존 4컬럼 → 6컬럼 (추가메모, 세금분류 추가)
- **룰 기반 세금 자동 분류**: 11개 카테고리 자동 분류 (접대비, 업무추진비, 복리후생비, 소모품비, 차량유류비, 교통비, 통신비, 식비, 회의비, 교육훈련비, 기타)
- **내부 관리 강화**: 거래별 추가 메모 기능으로 세무사 소통 최소화
- **새 카드 추가**: 0981, 9904 법인카드 등록

### v3.0 (2025-01)
- 멀티 AI 프로바이더 지원 (DeepSeek, OpenAI, Anthropic, OpenRouter)
- 서버 설정 모드 추가 (API 키 입력 없이 사용)
- 4단계 패턴 매칭 로직 구현
- AI 사이드바 채팅 UI 개선

### v2.0 (2024-12)
- Next.js 15 + Supabase 아키텍처로 전환
- AI 어시스턴트 기능 추가
- 대시보드 UI 개선

---

© 2025 칠칠기업
