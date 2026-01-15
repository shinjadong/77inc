/**
 * 세금 계정 분류 카테고리 정의
 *
 * 목적: 법인카드 거래를 세무 계정으로 자동 분류하여
 *       세무사와의 소통을 최소화하고 회계 처리를 효율화
 */

export const TAX_CATEGORIES = [
  '접대비',        // 고객/거래처 접대, 선물, 경조사비
  '업무추진비',    // 사업 관련 회의, 협의, 출장
  '복리후생비',    // 직원 복지, 단체 식사, 워크숍
  '소모품비',      // 사무용품, 소모성 물품
  '차량유류비',    // 주유, 차량 세차, 통행료
  '교통비',        // 대중교통, 택시, 주차비
  '통신비',        // 전화, 인터넷, 모바일 통신
  '식비',          // 직원 식사(점심, 저녁), 간식
  '회의비',        // 사내 회의 다과, 음료
  '교육훈련비',    // 교육, 세미나, 도서
  '기타',          // 미분류 또는 특수 항목
] as const;

export type TaxCategory = typeof TAX_CATEGORIES[number];

/**
 * 카테고리별 설명
 */
export const TAX_CATEGORY_DESCRIPTIONS: Record<TaxCategory, string> = {
  '접대비': '거래처 접대, 선물, 경조사비 등',
  '업무추진비': '사업 관련 회의, 협상, 출장비용',
  '복리후생비': '직원 복지, 단체 활동, 워크숍',
  '소모품비': '사무용품, 소모성 물품 구매',
  '차량유류비': '차량 운행 관련 유류, 세차, 통행료',
  '교통비': '대중교통, 택시, 주차 등',
  '통신비': '전화, 인터넷, 모바일 통신비',
  '식비': '직원 식사비(점심, 저녁, 간식)',
  '회의비': '사내 회의용 다과, 음료',
  '교육훈련비': '교육, 세미나, 도서 구입',
  '기타': '위 분류에 해당하지 않는 항목',
};

/**
 * 카테고리 색상 (UI 표시용)
 */
export const TAX_CATEGORY_COLORS: Record<TaxCategory, string> = {
  '접대비': 'bg-purple-100 text-purple-800',
  '업무추진비': 'bg-blue-100 text-blue-800',
  '복리후생비': 'bg-green-100 text-green-800',
  '소모품비': 'bg-yellow-100 text-yellow-800',
  '차량유류비': 'bg-orange-100 text-orange-800',
  '교통비': 'bg-cyan-100 text-cyan-800',
  '통신비': 'bg-indigo-100 text-indigo-800',
  '식비': 'bg-red-100 text-red-800',
  '회의비': 'bg-teal-100 text-teal-800',
  '교육훈련비': 'bg-pink-100 text-pink-800',
  '기타': 'bg-gray-100 text-gray-800',
};
