// AI 어시스턴트 API 어댑터
// 기존 API와 AI Tool을 연결하는 유틸리티 함수들

import { supabase } from '../supabase';
import {
  findCardIdByName,
  getCardInfoById,
  getAllCardInfo,
} from '../card-config';

// 카드 정보 관련 함수는 card-config.ts에서 import
// 통합된 카드 정보 관리로 중복 제거 및 성능 최적화 (O(n) → O(1))
export { findCardIdByName, getCardInfoById, getAllCardInfo };

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
