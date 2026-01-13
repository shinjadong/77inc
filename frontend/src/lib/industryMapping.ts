/**
 * 업종 기반 자동 매칭 모듈
 * 가맹점명에서 업종 키워드를 추출하여 사용용도를 자동 매칭
 */

// 업종 키워드 → 사용용도 매핑
export const INDUSTRY_MAPPINGS: Record<string, string> = {
  // 음식점/식비
  '한식': '식비',
  '중식': '식비',
  '일식': '식비',
  '양식': '식비',
  '레스토랑': '식비',
  '식당': '식비',
  '음식점': '식비',
  '분식': '식비',
  '치킨': '식비',
  '피자': '식비',
  '햄버거': '식비',
  '버거': '식비',
  '초밥': '식비',
  '회': '식비',
  '고기': '식비',
  '갈비': '식비',
  '삼겹살': '식비',
  '국밥': '식비',
  '냉면': '식비',
  '면옥': '식비',
  '칼국수': '식비',
  '우동': '식비',
  '라멘': '식비',
  '돈까스': '식비',
  '백반': '식비',
  '정식': '식비',
  '한정식': '식비',
  '족발': '식비',
  '보쌈': '식비',
  '닭발': '식비',
  '곱창': '식비',
  '막창': '식비',
  '찜닭': '식비',
  '닭볶음탕': '식비',
  '순대': '식비',
  '떡볶이': '식비',
  '김밥': '식비',
  '도시락': '식비',
  '죽': '식비',
  '덮밥': '식비',
  '카레': '식비',
  '짜장': '식비',
  '짬뽕': '식비',
  '탕수육': '식비',

  // 커피/카페
  '스타벅스': '복리후생비',
  '이디야': '복리후생비',
  '메가커피': '복리후생비',
  '투썸': '복리후생비',
  '빽다방': '복리후생비',
  '컴포즈': '복리후생비',
  '카페': '복리후생비',
  '커피': '복리후생비',
  '베이커리': '복리후생비',
  '제과': '복리후생비',
  '빵': '복리후생비',
  '디저트': '복리후생비',

  // 편의점
  'GS25': '복리후생비',
  'CU': '복리후생비',
  '세븐일레븐': '복리후생비',
  '이마트24': '복리후생비',
  '편의점': '복리후생비',
  '미니스톱': '복리후생비',

  // 마트/슈퍼
  '이마트': '복리후생비',
  '홈플러스': '복리후생비',
  '롯데마트': '복리후생비',
  '코스트코': '복리후생비',
  '트레이더스': '복리후생비',
  '마트': '복리후생비',
  '슈퍼': '복리후생비',
  '농협': '복리후생비',
  '하나로': '복리후생비',

  // 주유/차량
  'SK에너지': '차량유류비',
  'GS칼텍스': '차량유류비',
  'S-OIL': '차량유류비',
  '에쓰오일': '차량유류비',
  '현대오일뱅크': '차량유류비',
  '주유소': '차량유류비',
  '주유': '차량유류비',
  'LPG': '차량유류비',
  '충전': '차량유류비',
  '세차': '차량유지비',
  '정비': '차량유지비',
  '오토': '차량유지비',
  '타이어': '차량유지비',
  '카센터': '차량유지비',

  // 교통
  '하이패스': '교통비',
  '고속도로': '교통비',
  '톨게이트': '교통비',
  '한국도로공사': '교통비',
  '도로공사': '교통비',
  '택시': '교통비',
  '카카오택시': '교통비',
  '버스': '교통비',
  '지하철': '교통비',
  '철도': '교통비',
  'KTX': '교통비',
  'SRT': '교통비',
  '항공': '교통비',
  '대한항공': '교통비',
  '아시아나': '교통비',
  '제주항공': '교통비',
  '진에어': '교통비',
  '에어부산': '교통비',
  '티웨이': '교통비',
  '주차': '주차비',
  '파킹': '주차비',

  // 통신
  'SKT': '통신비',
  'KT': '통신비',
  'LG유플러스': '통신비',
  '통신': '통신비',
  '인터넷': '통신비',

  // 숙박
  '호텔': '숙박비',
  '모텔': '숙박비',
  '리조트': '숙박비',
  '펜션': '숙박비',
  '민박': '숙박비',
  '게스트하우스': '숙박비',
  '여관': '숙박비',

  // 의료/건강
  '병원': '의료비',
  '의원': '의료비',
  '클리닉': '의료비',
  '치과': '의료비',
  '한의원': '의료비',
  '약국': '의료비',
  '헬스': '복리후생비',
  '피트니스': '복리후생비',
  '짐': '복리후생비',

  // 사무용품/비품
  '다이소': '소모품비',
  '오피스': '소모품비',
  '문구': '소모품비',
  '사무용품': '소모품비',
  '알파': '소모품비',

  // 전자/IT
  '전자': '비품구입비',
  '하이마트': '비품구입비',
  '일렉트로마트': '비품구입비',
  '컴퓨터': '비품구입비',

  // 배달
  '배달의민족': '식비',
  '요기요': '식비',
  '쿠팡이츠': '식비',

  // 교육/도서
  '교보문고': '도서인쇄비',
  '영풍문고': '도서인쇄비',
  '반디앤루니스': '도서인쇄비',
  '알라딘': '도서인쇄비',
  '예스24': '도서인쇄비',
  '인터파크': '도서인쇄비',
  '서점': '도서인쇄비',
  '도서': '도서인쇄비',
  '인쇄': '도서인쇄비',
  '복사': '도서인쇄비',
  '출력': '도서인쇄비',

  // 택배/우편
  '우체국': '운반비',
  'CJ대한통운': '운반비',
  '한진택배': '운반비',
  '로젠': '운반비',
  '택배': '운반비',
  '퀵서비스': '운반비',
  '퀵': '운반비',
};

// 특수 가맹점명 → 사용용도 (정확 매칭 우선)
export const MERCHANT_EXACT_MAPPINGS: Record<string, string> = {
  '한국도로공사': '교통비',
  '한국전력공사': '수도광열비',
  '한전': '수도광열비',
  '상수도': '수도광열비',
  '가스공사': '수도광열비',
  '도시가스': '수도광열비',
};

/**
 * 업종 기반 매칭 수행
 * @param merchantName 가맹점명
 * @returns 매칭된 사용용도 또는 null
 */
export function matchByIndustry(merchantName: string): string | null {
  const normalized = merchantName.toUpperCase().replace(/\s+/g, '');

  // 1. 정확 매칭 먼저 시도
  for (const [key, value] of Object.entries(MERCHANT_EXACT_MAPPINGS)) {
    if (normalized.includes(key.toUpperCase().replace(/\s+/g, ''))) {
      return value;
    }
  }

  // 2. 업종 키워드 매칭
  for (const [keyword, usage] of Object.entries(INDUSTRY_MAPPINGS)) {
    if (normalized.includes(keyword.toUpperCase().replace(/\s+/g, ''))) {
      return usage;
    }
  }

  return null;
}

/**
 * 업종 기반 매칭 결과 상세 정보
 */
export interface IndustryMatchResult {
  usageDescription: string;
  matchedKeyword: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 업종 기반 매칭 (상세 결과)
 */
export function matchByIndustryDetailed(merchantName: string): IndustryMatchResult | null {
  const normalized = merchantName.toUpperCase().replace(/\s+/g, '');

  // 1. 정확 매칭 (높은 신뢰도)
  for (const [key, value] of Object.entries(MERCHANT_EXACT_MAPPINGS)) {
    if (normalized.includes(key.toUpperCase().replace(/\s+/g, ''))) {
      return {
        usageDescription: value,
        matchedKeyword: key,
        confidence: 'high',
      };
    }
  }

  // 2. 브랜드명 매칭 (높은 신뢰도)
  const brandKeywords = ['스타벅스', '이디야', '메가커피', 'GS25', 'CU', '세븐일레븐',
    'SK에너지', 'GS칼텍스', '하이패스', '이마트', '홈플러스', '롯데마트', '코스트코'];
  for (const keyword of brandKeywords) {
    if (normalized.includes(keyword.toUpperCase().replace(/\s+/g, ''))) {
      const usage = INDUSTRY_MAPPINGS[keyword];
      if (usage) {
        return {
          usageDescription: usage,
          matchedKeyword: keyword,
          confidence: 'high',
        };
      }
    }
  }

  // 3. 일반 업종 키워드 매칭 (중간 신뢰도)
  for (const [keyword, usage] of Object.entries(INDUSTRY_MAPPINGS)) {
    if (normalized.includes(keyword.toUpperCase().replace(/\s+/g, ''))) {
      return {
        usageDescription: usage,
        matchedKeyword: keyword,
        confidence: 'medium',
      };
    }
  }

  return null;
}

/**
 * 사용 가능한 모든 사용용도 목록
 */
export const USAGE_CATEGORIES = [
  '식비',
  '복리후생비',
  '차량유류비',
  '차량유지비',
  '교통비',
  '주차비',
  '통신비',
  '숙박비',
  '의료비',
  '소모품비',
  '비품구입비',
  '도서인쇄비',
  '운반비',
  '수도광열비',
  '접대비',
  '회의비',
  '광고선전비',
  '지급수수료',
  '기타',
] as const;

export type UsageCategory = typeof USAGE_CATEGORIES[number];
