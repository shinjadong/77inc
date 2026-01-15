// 카드 정보 통합 설정
// 단일 소스로 모든 카드 정보 관리
// 사용처: api-adapter.ts, system-prompt.ts

export interface Card {
  id: number;
  number: string;
  name: string;
  userName: string;
  cardType: '개인' | '차량' | '공용' | '법인';
  sheetName: string;
  aliases: string[]; // 검색용 별칭 목록
}

// 모든 카드 정보
export const CARDS: Card[] = [
  {
    id: 1,
    number: '3987',
    name: '김준교 카드',
    userName: '김준교',
    cardType: '개인',
    sheetName: '김준교',
    aliases: ['김준교', '준교', '3987'],
  },
  {
    id: 2,
    number: '4985',
    name: '대표님 카드',
    userName: '김용석',
    cardType: '개인',
    sheetName: '김용석',
    aliases: ['김용석', '용석', '대표님', '대표', '4985'],
  },
  {
    id: 3,
    number: '6902',
    name: '하이패스1',
    userName: '-',
    cardType: '차량',
    sheetName: '하이패스',
    aliases: ['하이패스1', '하이패스 1', '6902'],
  },
  {
    id: 4,
    number: '6974',
    name: '이사님 카드',
    userName: '노혜경',
    cardType: '개인',
    sheetName: '노혜경',
    aliases: ['노혜경', '혜경', '이사님', '이사', '6974'],
  },
  {
    id: 5,
    number: '9980',
    name: '공용카드',
    userName: '-',
    cardType: '공용',
    sheetName: '공용',
    aliases: ['공용', '공용카드', '9980'],
  },
  {
    id: 6,
    number: '6911',
    name: '하이패스2',
    userName: '-',
    cardType: '차량',
    sheetName: '하이패스',
    aliases: ['하이패스2', '하이패스 2', '6911'],
  },
  {
    id: 7,
    number: '0981',
    name: '법인카드 0981',
    userName: '-',
    cardType: '법인',
    sheetName: '0981',
    aliases: ['법인카드 0981', '법인 0981', '0981'],
  },
  {
    id: 8,
    number: '9904',
    name: '법인카드 9904',
    userName: '-',
    cardType: '법인',
    sheetName: '9904',
    aliases: ['법인카드 9904', '법인 9904', '9904'],
  },
];

// 정규식 패턴 (성능 최적화: O(n) → O(1))
interface CardPattern {
  id: number;
  pattern: RegExp;
}

const CARD_PATTERNS: CardPattern[] = CARDS.map(card => ({
  id: card.id,
  pattern: new RegExp(
    card.aliases
      .map(alias => alias.replace(/[-\s]/g, '\\s*')) // 공백/하이픈 유연하게
      .join('|'),
    'i'
  ),
}));

/**
 * 카드명/사용자명/카드번호로 카드 찾기
 * @param name 검색할 이름 (카드명, 사용자명, 카드번호 등)
 * @returns 매칭된 Card 객체 또는 null
 */
export function findCardByName(name: string): Card | null {
  if (!name) return null;

  const normalizedName = name.trim();

  // 정규식 패턴으로 빠른 매칭
  const match = CARD_PATTERNS.find(p => p.pattern.test(normalizedName));
  if (match) {
    return CARDS.find(c => c.id === match.id) || null;
  }

  return null;
}

/**
 * 카드명/사용자명/카드번호로 카드 ID 찾기
 * @param name 검색할 이름
 * @returns 카드 ID 또는 null
 */
export function findCardIdByName(name: string): number | null {
  const card = findCardByName(name);
  return card ? card.id : null;
}

/**
 * 카드 ID로 카드 정보 가져오기
 * @param cardId 카드 ID
 * @returns Card 객체 또는 null
 */
export function getCardById(cardId: number): Card | null {
  return CARDS.find(c => c.id === cardId) || null;
}

/**
 * 카드 ID로 카드 정보 가져오기 (레거시 포맷)
 * @param cardId 카드 ID
 * @returns 레거시 카드 정보 객체
 */
export function getCardInfoById(cardId: number) {
  const card = getCardById(cardId);
  if (!card) return null;

  return {
    cardNumber: card.number,
    cardName: card.name,
    userName: card.userName,
    cardType: card.cardType,
  };
}

/**
 * 모든 카드 정보 가져오기
 * @returns 모든 Card 객체 배열
 */
export function getAllCards(): Card[] {
  return [...CARDS];
}

/**
 * 모든 카드 정보 가져오기 (레거시 포맷)
 * @returns 레거시 카드 정보 배열
 */
export function getAllCardInfo() {
  return CARDS.map(card => ({
    id: card.id,
    cardNumber: card.number,
    cardName: card.name,
    userName: card.userName,
    cardType: card.cardType,
  }));
}

/**
 * AI 시스템 프롬프트용 카드 테이블 생성
 * @returns 마크다운 테이블 문자열
 */
export function getCardInfoTable(): string {
  const header = '| 카드번호 | 사용자 | 시트명 |';
  const divider = '|----------|--------|--------|';
  const rows = CARDS.map(
    c => `| ${c.number} | ${c.userName === '-' ? c.name : c.userName} | ${c.sheetName} |`
  );

  return [header, divider, ...rows].join('\n');
}

/**
 * 카드 통계 정보
 */
export const CARD_STATS = {
  total: CARDS.length,
  byType: {
    개인: CARDS.filter(c => c.cardType === '개인').length,
    차량: CARDS.filter(c => c.cardType === '차량').length,
    공용: CARDS.filter(c => c.cardType === '공용').length,
    법인: CARDS.filter(c => c.cardType === '법인').length,
  },
} as const;
