-- 거래 데이터 확장: 추가메모 및 세금분류 필드 추가
-- 실행 일시: 2026-01-15
-- 목적: 내부 관리 및 세무 계정 자동 분류

-- 1. 컬럼 추가
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS additional_notes TEXT,
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(100);

-- 2. 컬럼 설명 추가 (문서화)
COMMENT ON COLUMN transactions.additional_notes IS '추가메모: 내부 관리용 선택 입력 필드 (예: "점심빵 먹느라고 한 거")';
COMMENT ON COLUMN transactions.tax_category IS '세금분류: AI 자동 분류된 세무 계정 카테고리 (11개 카테고리)';

-- 3. 검증 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN ('additional_notes', 'tax_category');

-- 4. 샘플 데이터 확인
SELECT
  id,
  merchant_name,
  usage_description,
  additional_notes,
  tax_category
FROM transactions
LIMIT 5;

-- 롤백 스크립트 (문제 발생 시)
-- ALTER TABLE transactions
-- DROP COLUMN IF EXISTS additional_notes,
-- DROP COLUMN IF EXISTS tax_category;
