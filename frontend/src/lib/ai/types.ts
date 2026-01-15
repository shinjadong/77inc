// AI 어시스턴트 타입 정의

// 메시지 역할
export type MessageRole = 'user' | 'assistant' | 'system';

// 메시지 콘텐츠 타입
export type MessageContentType =
  | 'text'
  | 'transaction_list'
  | 'transaction_stats'
  | 'download_action'
  | 'pattern_list'
  | 'pattern_added'
  | 'card_info'
  | 'error';

// 거래내역 조회 결과
export interface TransactionQueryResult {
  success: boolean;
  transactions: {
    id: number;
    date: string;
    merchant: string;
    amount: number;
    usage: string | null;
    status: 'pending' | 'auto' | 'manual';
    cardName: string;
  }[];
  total: number;
  summary: {
    totalAmount: number;
    pendingCount: number;
    matchedCount: number;
  };
}

// 거래 통계 결과
export interface TransactionStatsResult {
  success: boolean;
  stats: {
    totalTransactions: number;
    pendingCount: number;
    autoMatchedCount: number;
    manualMatchedCount: number;
    matchRate: number;
    totalAmount: number;
    byCard?: {
      cardName: string;
      count: number;
      amount: number;
    }[];
  };
}

// 패턴 추가 결과
export interface PatternAddResult {
  success: boolean;
  pattern: {
    id: number;
    merchantName: string;
    usageDescription: string;
    matchType: string;
  };
  autoMatchedCount: number;
  message: string;
}

// 패턴 조회 결과
export interface PatternQueryResult {
  success: boolean;
  patterns: {
    id: number;
    merchantName: string;
    usageDescription: string;
    matchType: string;
    useCount: number;
    cardName?: string;
  }[];
  total: number;
}

// 다운로드 준비 결과
export interface DownloadPrepareResult {
  success: boolean;
  action: 'download_monthly' | 'download_all' | 'download_card';
  params: {
    year?: number;
    month?: number;
    cardId?: number;
    cardNumber?: string;
  };
  filename: string;
  message: string;
}

// 카드 정보 결과
export interface CardInfoResult {
  success: boolean;
  card: {
    id: number;
    cardNumber: string;
    cardName: string;
    cardType: string;
    userName?: string;
    transactionCount?: number;
  } | null;
  message: string;
}

// 거래 매칭 결과
export interface MatchTransactionResult {
  success: boolean;
  matchedCount: number;
  patternSaved: boolean;
  message: string;
}

// Tool 실행 결과 유니온 타입
export type ToolResult =
  | TransactionQueryResult
  | TransactionStatsResult
  | PatternAddResult
  | PatternQueryResult
  | DownloadPrepareResult
  | CardInfoResult
  | MatchTransactionResult;
