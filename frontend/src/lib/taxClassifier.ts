/**
 * 거래 데이터 자동 세금 분류기
 *
 * 룰 기반 알고리즘으로 가맹점명과 사용용도를 분석하여
 * 적절한 세무 계정 카테고리를 자동으로 할당합니다.
 */

import { TaxCategory } from './taxCategories';

/**
 * 키워드 기반 분류 규칙
 */
const CLASSIFICATION_RULES: Record<TaxCategory, {
  merchant: string[];    // 가맹점명 키워드
  usage: string[];       // 사용용도 키워드
  amount?: {             // 금액 조건 (선택)
    min?: number;
    max?: number;
  };
}> = {
  '접대비': {
    merchant: ['호텔', '레스토랑', '바', '주점', '꽃', '화훼', '선물', '백화점'],
    usage: ['접대', '거래처', '고객', '선물', '경조사', '조화'],
  },
  '업무추진비': {
    merchant: ['카페', '커피', '찻집', '차', '디저트'],
    usage: ['업무', '회의', '협의', '상담', '출장', '미팅'],
  },
  '복리후생비': {
    merchant: ['워크샵', '체육', '휴양', '펜션', '여행', '리조트'],
    usage: ['복리', '복지', '워크샵', '단체', '야유회', '체육'],
  },
  '소모품비': {
    merchant: ['문구', '사무', '용품', '편의점', 'gs25', 'cu', '세븐일레븐', '이마트24'],
    usage: ['사무용품', '소모품', '비품', '용지', '필기', '문구'],
  },
  '차량유류비': {
    merchant: ['주유', 'sk에너지', 'gs칼텍스', 's-oil', '현대오일뱅크', '세차', '통행료'],
    usage: ['유류', '주유', '기름', '세차', '통행료', '하이패스'],
  },
  '교통비': {
    merchant: ['택시', '지하철', '버스', '주차', '파킹'],
    usage: ['교통', '택시', '주차', '파킹', '대중교통', '통행'],
  },
  '통신비': {
    merchant: ['skt', 'kt', 'lg유플러스', '통신', '인터넷', '모바일'],
    usage: ['통신', '전화', '인터넷', '모바일', '휴대폰'],
  },
  '식비': {
    merchant: ['식당', '음식', '한식', '중식', '일식', '양식', '분식', '치킨', '피자', '햄버거', '베이커리', '도시락'],
    usage: ['식대', '중식', '점심', '저녁', '간식', '야식', '음식'],
  },
  '회의비': {
    merchant: ['카페', '베이커리', '베이킹', '제과'],
    usage: ['회의', '다과', '간담회', '회의용'],
  },
  '교육훈련비': {
    merchant: ['교육', '학원', '세미나', '컨퍼런스', '도서', '서점', '북스'],
    usage: ['교육', '훈련', '세미나', '강의', '연수', '도서', '책'],
  },
  '기타': {
    merchant: [],
    usage: [],
  },
};

/**
 * 거래 데이터를 세금 카테고리로 분류
 *
 * @param merchantName 가맹점명
 * @param usageDescription 사용용도 (nullable)
 * @param amount 거래 금액
 * @returns 분류된 세금 카테고리
 */
export function classifyTransaction(
  merchantName: string,
  usageDescription: string | null,
  amount: number
): TaxCategory {
  const merchant = merchantName.toLowerCase().trim();
  const usage = (usageDescription || '').toLowerCase().trim();

  // 1. 사용용도 우선 매칭 (사용자가 입력한 경우)
  if (usage) {
    for (const [category, rules] of Object.entries(CLASSIFICATION_RULES)) {
      if (category === '기타') continue;

      // 사용용도 키워드 매칭
      if (rules.usage.some(keyword => usage.includes(keyword))) {
        return category as TaxCategory;
      }
    }
  }

  // 2. 가맹점명 매칭
  for (const [category, rules] of Object.entries(CLASSIFICATION_RULES)) {
    if (category === '기타') continue;

    // 가맹점명 키워드 매칭
    if (rules.merchant.some(keyword => merchant.includes(keyword))) {
      // 금액 조건 확인 (있는 경우)
      if (rules.amount) {
        if (rules.amount.min && amount < rules.amount.min) continue;
        if (rules.amount.max && amount > rules.amount.max) continue;
      }

      return category as TaxCategory;
    }
  }

  // 3. 특수 규칙: 식비 vs 회의비 구분
  // 카페/베이커리는 기본적으로 회의비이지만, 명시적으로 식대인 경우 식비로 분류
  if (
    (merchant.includes('카페') || merchant.includes('커피') || merchant.includes('베이커리')) &&
    (usage.includes('식대') || usage.includes('점심') || usage.includes('저녁'))
  ) {
    return '식비';
  }

  // 4. 금액 기반 추론
  // 고액 거래 (100만원 이상): 접대비 가능성
  if (amount >= 1000000) {
    return '접대비';
  }

  // 소액 거래 (1만원 이하): 소모품비 가능성
  if (amount <= 10000 && merchant.includes('편의점')) {
    return '소모품비';
  }

  // 5. 기타로 분류
  return '기타';
}

/**
 * 일괄 분류
 *
 * @param transactions 거래 목록
 * @returns 분류 결과 (거래 ID → 카테고리)
 */
export function classifyTransactions(
  transactions: Array<{
    id: number;
    merchant_name: string;
    usage_description: string | null;
    amount: number;
  }>
): Record<number, TaxCategory> {
  const results: Record<number, TaxCategory> = {};

  for (const tx of transactions) {
    results[tx.id] = classifyTransaction(
      tx.merchant_name,
      tx.usage_description,
      tx.amount
    );
  }

  return results;
}

/**
 * 분류 신뢰도 계산
 *
 * @param merchantName 가맹점명
 * @param usageDescription 사용용도
 * @param category 분류된 카테고리
 * @returns 신뢰도 (0.0 ~ 1.0)
 */
export function getClassificationConfidence(
  merchantName: string,
  usageDescription: string | null,
  category: TaxCategory
): number {
  if (category === '기타') return 0.0;

  const merchant = merchantName.toLowerCase().trim();
  const usage = (usageDescription || '').toLowerCase().trim();
  const rules = CLASSIFICATION_RULES[category];

  let confidence = 0.0;

  // 사용용도 매칭 (높은 신뢰도)
  if (usage && rules.usage.some(keyword => usage.includes(keyword))) {
    confidence += 0.7;
  }

  // 가맹점명 매칭 (중간 신뢰도)
  if (rules.merchant.some(keyword => merchant.includes(keyword))) {
    confidence += 0.5;
  }

  // 최대값 1.0으로 제한
  return Math.min(confidence, 1.0);
}
