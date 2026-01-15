// AI 어시스턴트 API 어댑터
// 기존 API와 AI Tool을 연결하는 유틸리티 함수들

import { supabase } from '../supabase';

// 카드명 → 카드ID 매핑
const CARD_NAME_MAP: Record<string, number> = {
  // 사용자명
  '김준교': 1,
  '준교': 1,
  '김용석': 2,
  '용석': 2,
  '대표님': 2,
  '대표': 2,
  '노혜경': 4,
  '혜경': 4,
  '이사님': 4,
  '이사': 4,
  // 카드 유형
  '하이패스1': 3,
  '하이패스2': 6,
  '공용': 5,
  '공용카드': 5,
  // 카드번호 끝4자리
  '3987': 1,
  '4985': 2,
  '6902': 3,
  '6974': 4,
  '9980': 5,
  '6911': 6,
};

// 카드ID → 카드정보 매핑
const CARD_INFO_MAP: Record<number, { cardNumber: string; cardName: string; userName: string; cardType: string }> = {
  1: { cardNumber: '3987', cardName: '김준교 카드', userName: '김준교', cardType: '개인' },
  2: { cardNumber: '4985', cardName: '대표님 카드', userName: '김용석', cardType: '개인' },
  3: { cardNumber: '6902', cardName: '하이패스1', userName: '-', cardType: '차량' },
  4: { cardNumber: '6974', cardName: '이사님 카드', userName: '노혜경', cardType: '개인' },
  5: { cardNumber: '9980', cardName: '공용카드', userName: '-', cardType: '공용' },
  6: { cardNumber: '6911', cardName: '하이패스2', userName: '-', cardType: '차량' },
};

/**
 * 카드명/사용자명/카드번호로 카드 ID 찾기
 */
export function findCardIdByName(name: string): number | null {
  if (!name) return null;

  const normalizedName = name.trim().toLowerCase();

  // 직접 매핑 검색
  for (const [key, id] of Object.entries(CARD_NAME_MAP)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return id;
    }
  }

  return null;
}

/**
 * 카드 ID로 카드 정보 가져오기
 */
export function getCardInfoById(cardId: number) {
  return CARD_INFO_MAP[cardId] || null;
}

/**
 * 모든 카드 정보 가져오기
 */
export function getAllCardInfo() {
  return Object.entries(CARD_INFO_MAP).map(([id, info]) => ({
    id: parseInt(id),
    ...info,
  }));
}

/**
 * 자연어 날짜 파싱
 */
export function parseNaturalDate(text: string): { year?: number; month?: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // "2025년 1월" 형식
  const fullMatch = text.match(/(\d{4})년?\s*(\d{1,2})월/);
  if (fullMatch) {
    return { year: parseInt(fullMatch[1]), month: parseInt(fullMatch[2]) };
  }

  // "1월", "12월" 등
  const monthMatch = text.match(/(\d{1,2})월/);
  if (monthMatch) {
    const month = parseInt(monthMatch[1]);
    // 현재 월보다 큰 월은 작년으로 간주
    const year = month > currentMonth ? currentYear - 1 : currentYear;
    return { year, month };
  }

  // "이번 달", "이달"
  if (text.includes('이번') || text.includes('이달') || text.includes('금월')) {
    return { year: currentYear, month: currentMonth };
  }

  // "지난 달", "저번 달"
  if (text.includes('지난') || text.includes('저번') || text.includes('전월')) {
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const year = currentMonth === 1 ? currentYear - 1 : currentYear;
    return { year, month: lastMonth };
  }

  // "올해"
  if (text.includes('올해') || text.includes('금년')) {
    return { year: currentYear };
  }

  // "작년"
  if (text.includes('작년') || text.includes('전년')) {
    return { year: currentYear - 1 };
  }

  return {};
}

/**
 * 금액 포맷팅
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 매칭 상태 라벨
 */
export function getMatchStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '대기',
    auto: '자동매칭',
    manual: '수동매칭',
  };
  return labels[status] || status;
}

/**
 * 거래내역 조회 (Supabase 직접 호출)
 */
export async function queryTransactions(params: {
  cardId?: number;
  year?: number;
  month?: number;
  status?: string;
  limit?: number;
}) {
  let query = supabase
    .from('transactions')
    .select(`
      id,
      transaction_date,
      merchant_name,
      amount,
      usage_description,
      match_status,
      card_id,
      cards (
        id,
        card_number,
        card_name
      )
    `)
    .order('transaction_date', { ascending: false });

  if (params.cardId) {
    query = query.eq('card_id', params.cardId);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('match_status', params.status);
  }

  if (params.year && params.month) {
    const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
    const endDate = new Date(params.year, params.month, 0).toISOString().split('T')[0];
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  } else if (params.year) {
    const startDate = `${params.year}-01-01`;
    const endDate = `${params.year}-12-31`;
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * 거래 통계 조회
 */
export async function queryTransactionStats(params: {
  cardId?: number;
  year?: number;
  month?: number;
}) {
  let query = supabase
    .from('transactions')
    .select('id, amount, match_status, card_id');

  if (params.cardId) {
    query = query.eq('card_id', params.cardId);
  }

  if (params.year && params.month) {
    const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
    const endDate = new Date(params.year, params.month, 0).toISOString().split('T')[0];
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  } else if (params.year) {
    const startDate = `${params.year}-01-01`;
    const endDate = `${params.year}-12-31`;
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const transactions = data || [];
  const totalTransactions = transactions.length;
  const pendingCount = transactions.filter(t => t.match_status === 'pending').length;
  const autoMatchedCount = transactions.filter(t => t.match_status === 'auto').length;
  const manualMatchedCount = transactions.filter(t => t.match_status === 'manual').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const matchRate = totalTransactions > 0
    ? Math.round(((autoMatchedCount + manualMatchedCount) / totalTransactions) * 100)
    : 0;

  return {
    totalTransactions,
    pendingCount,
    autoMatchedCount,
    manualMatchedCount,
    matchRate,
    totalAmount,
  };
}

/**
 * 패턴 조회
 */
export async function queryPatterns(params: {
  search?: string;
  cardId?: number;
  limit?: number;
}) {
  let query = supabase
    .from('patterns')
    .select('*')
    .order('use_count', { ascending: false });

  if (params.search) {
    query = query.ilike('merchant_name', `%${params.search}%`);
  }

  if (params.cardId) {
    query = query.eq('card_id', params.cardId);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * 패턴 추가
 */
export async function addPattern(params: {
  merchantName: string;
  usageDescription: string;
  cardId?: number;
  matchType?: 'exact' | 'contains';
}) {
  // 기존 패턴 확인
  const { data: existing } = await supabase
    .from('patterns')
    .select('id')
    .eq('merchant_name', params.merchantName)
    .maybeSingle();

  if (existing) {
    // 기존 패턴 업데이트
    const { data, error } = await supabase
      .from('patterns')
      .update({
        usage_description: params.usageDescription,
        card_id: params.cardId || null,
        match_type: params.matchType || 'exact',
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return { pattern: data, isNew: false };
  } else {
    // 새 패턴 생성
    const { data, error } = await supabase
      .from('patterns')
      .insert({
        merchant_name: params.merchantName,
        usage_description: params.usageDescription,
        card_id: params.cardId || null,
        match_type: params.matchType || 'exact',
        priority: 0,
        use_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return { pattern: data, isNew: true };
  }
}

/**
 * 패턴 기반 대기 거래 자동 매칭
 */
export async function autoMatchPendingTransactions(merchantName: string, usageDescription: string) {
  // 가맹점명이 일치하는 대기 거래 찾기
  const { data: pendingTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('match_status', 'pending')
    .ilike('merchant_name', `%${merchantName}%`);

  if (!pendingTransactions || pendingTransactions.length === 0) {
    return 0;
  }

  // 일괄 업데이트
  const ids = pendingTransactions.map(t => t.id);
  const { error } = await supabase
    .from('transactions')
    .update({
      usage_description: usageDescription,
      match_status: 'auto',
    })
    .in('id', ids);

  if (error) throw error;
  return ids.length;
}
