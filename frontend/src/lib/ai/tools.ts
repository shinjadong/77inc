// AI 어시스턴트 Tool 정의
// Vercel AI SDK tool() 함수를 사용하여 Claude가 호출할 수 있는 도구들을 정의

import { tool } from 'ai';
import { z } from 'zod';
import {
  findCardIdByName,
  getCardInfoById,
  getAllCardInfo,
  queryTransactions,
  queryTransactionStats,
  queryPatterns,
  addPattern,
  autoMatchPendingTransactions,
  formatCurrency,
  formatDate,
  getMatchStatusLabel,
} from './api-adapter';
import type {
  TransactionQueryResult,
  TransactionStatsResult,
  PatternAddResult,
  PatternQueryResult,
  DownloadPrepareResult,
  CardInfoResult,
  MatchTransactionResult,
} from './types';

// Tool 1: 거래내역 조회
export const getTransactionsTool = tool({
  description: '법인카드 거래내역을 조회합니다. 카드명/사용자명, 연도, 월, 매칭 상태로 필터링할 수 있습니다.',
  inputSchema: z.object({
    cardName: z.string().optional().describe('카드 이름 또는 사용자 이름 (예: 김준교, 대표님, 하이패스, 공용)'),
    year: z.number().optional().describe('조회 연도 (예: 2025)'),
    month: z.number().min(1).max(12).optional().describe('조회 월 (1-12)'),
    status: z.enum(['all', 'pending', 'auto', 'manual']).optional().default('all').describe('매칭 상태: all(전체), pending(대기), auto(자동), manual(수동)'),
    limit: z.number().optional().default(20).describe('조회 건수 제한 (기본 20건)'),
  }),
  execute: async ({ cardName, year, month, status, limit }: { cardName?: string; year?: number; month?: number; status?: string; limit?: number }): Promise<TransactionQueryResult> => {
    try {
      const cardId = cardName ? findCardIdByName(cardName) : undefined;

      if (cardName && !cardId) {
        return {
          success: false,
          transactions: [],
          total: 0,
          summary: { totalAmount: 0, pendingCount: 0, matchedCount: 0 },
        };
      }

      const data = await queryTransactions({
        cardId: cardId || undefined,
        year,
        month,
        status,
        limit,
      });

      const transactions = data.map((t: any) => ({
        id: t.id,
        date: formatDate(t.transaction_date),
        merchant: t.merchant_name,
        amount: t.amount,
        usage: t.usage_description,
        status: t.match_status,
        cardName: t.cards?.card_name || '알 수 없음',
      }));

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const pendingCount = transactions.filter(t => t.status === 'pending').length;
      const matchedCount = transactions.filter(t => t.status !== 'pending').length;

      return {
        success: true,
        transactions,
        total: transactions.length,
        summary: {
          totalAmount,
          pendingCount,
          matchedCount,
        },
      };
    } catch (error) {
      console.error('getTransactions error:', error);
      return {
        success: false,
        transactions: [],
        total: 0,
        summary: { totalAmount: 0, pendingCount: 0, matchedCount: 0 },
      };
    }
  },
});

// Tool 2: 거래 통계 조회
export const getTransactionStatsTool = tool({
  description: '거래내역 통계를 조회합니다. 전체 건수, 매칭 대기 건수, 매칭률, 총 금액 등을 확인합니다.',
  inputSchema: z.object({
    cardName: z.string().optional().describe('특정 카드의 통계만 조회할 경우'),
    year: z.number().optional().describe('조회 연도'),
    month: z.number().min(1).max(12).optional().describe('조회 월'),
  }),
  execute: async ({ cardName, year, month }: { cardName?: string; year?: number; month?: number }): Promise<TransactionStatsResult> => {
    try {
      const cardId = cardName ? findCardIdByName(cardName) : undefined;

      const stats = await queryTransactionStats({
        cardId: cardId || undefined,
        year,
        month,
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('getTransactionStats error:', error);
      return {
        success: false,
        stats: {
          totalTransactions: 0,
          pendingCount: 0,
          autoMatchedCount: 0,
          manualMatchedCount: 0,
          matchRate: 0,
          totalAmount: 0,
        },
      };
    }
  },
});

// Tool 3: 패턴 추가
export const addPatternTool = tool({
  description: '가맹점 매칭 패턴을 추가합니다. 추가 후 동일 가맹점명의 대기 거래는 자동으로 매칭됩니다.',
  inputSchema: z.object({
    merchantName: z.string().describe('가맹점명 (예: 스타벅스, 교보문고, GS25)'),
    usageDescription: z.string().describe('사용용도 (예: 복리후생비, 도서인쇄비, 식비)'),
    cardName: z.string().optional().describe('특정 카드에만 적용할 경우 카드명'),
    matchType: z.enum(['exact', 'contains']).optional().default('exact').describe('매칭 방식: exact(정확일치), contains(포함)'),
  }),
  execute: async ({ merchantName, usageDescription, cardName, matchType }: { merchantName: string; usageDescription: string; cardName?: string; matchType?: 'exact' | 'contains' }): Promise<PatternAddResult> => {
    try {
      const cardId = cardName ? findCardIdByName(cardName) : undefined;

      const { pattern, isNew } = await addPattern({
        merchantName,
        usageDescription,
        cardId: cardId || undefined,
        matchType,
      });

      // 대기 거래 자동 매칭
      const autoMatchedCount = await autoMatchPendingTransactions(merchantName, usageDescription);

      return {
        success: true,
        pattern: {
          id: pattern.id,
          merchantName: pattern.merchant_name,
          usageDescription: pattern.usage_description,
          matchType: pattern.match_type,
        },
        autoMatchedCount,
        message: isNew
          ? `"${merchantName}" 패턴이 추가되었습니다. ${autoMatchedCount}건의 대기 거래가 자동 매칭되었습니다.`
          : `"${merchantName}" 패턴이 업데이트되었습니다. ${autoMatchedCount}건의 대기 거래가 자동 매칭되었습니다.`,
      };
    } catch (error) {
      console.error('addPattern error:', error);
      return {
        success: false,
        pattern: { id: 0, merchantName: '', usageDescription: '', matchType: '' },
        autoMatchedCount: 0,
        message: '패턴 추가 중 오류가 발생했습니다.',
      };
    }
  },
});

// Tool 4: 패턴 조회
export const getPatternsTool = tool({
  description: '등록된 매칭 패턴 목록을 조회합니다.',
  inputSchema: z.object({
    search: z.string().optional().describe('가맹점명 검색어'),
    cardName: z.string().optional().describe('특정 카드의 패턴만 조회'),
    limit: z.number().optional().default(20).describe('조회 건수 제한'),
  }),
  execute: async ({ search, cardName, limit }: { search?: string; cardName?: string; limit?: number }): Promise<PatternQueryResult> => {
    try {
      const cardId = cardName ? findCardIdByName(cardName) : undefined;

      const data = await queryPatterns({
        search,
        cardId: cardId || undefined,
        limit,
      });

      const patterns = data.map((p: any) => {
        const cardInfo = p.card_id ? getCardInfoById(p.card_id) : null;
        return {
          id: p.id,
          merchantName: p.merchant_name,
          usageDescription: p.usage_description,
          matchType: p.match_type,
          useCount: p.use_count,
          cardName: cardInfo?.cardName,
        };
      });

      return {
        success: true,
        patterns,
        total: patterns.length,
      };
    } catch (error) {
      console.error('getPatterns error:', error);
      return {
        success: false,
        patterns: [],
        total: 0,
      };
    }
  },
});

// Tool 5: Excel 다운로드 준비
export const prepareExcelDownloadTool = tool({
  description: '거래내역을 Excel 파일로 다운로드할 준비를 합니다. 월별 또는 전체 다운로드, 특정 카드만 다운로드 가능합니다.',
  inputSchema: z.object({
    downloadType: z.enum(['monthly', 'all', 'card']).default('monthly').describe('다운로드 유형: monthly(월별), all(전체), card(카드별)'),
    cardName: z.string().optional().describe('카드별 다운로드 시 카드명'),
    year: z.number().optional().describe('월별 다운로드 시 연도'),
    month: z.number().min(1).max(12).optional().describe('월별 다운로드 시 월'),
  }),
  execute: async ({ downloadType, cardName, year, month }: { downloadType?: 'monthly' | 'all' | 'card'; cardName?: string; year?: number; month?: number }): Promise<DownloadPrepareResult> => {
    try {
      const now = new Date();
      const currentYear = year || now.getFullYear();
      const currentMonth = month || now.getMonth() + 1;

      let filename = '';
      let message = '';
      const params: any = {};

      if (downloadType === 'monthly') {
        params.year = currentYear;
        params.month = currentMonth;
        filename = `칠칠기업_법인카드_${currentYear}_${String(currentMonth).padStart(2, '0')}.xlsx`;
        message = `${currentYear}년 ${currentMonth}월 거래내역을 다운로드합니다. 내보내기 페이지에서 다운로드 버튼을 클릭하세요.`;
      } else if (downloadType === 'all') {
        filename = '칠칠기업_법인카드_전체.xlsx';
        message = '전체 거래내역을 다운로드합니다. 내보내기 페이지에서 다운로드 버튼을 클릭하세요.';
      } else if (downloadType === 'card' && cardName) {
        const cardId = findCardIdByName(cardName);
        if (!cardId) {
          return {
            success: false,
            action: 'download_card',
            params: {},
            filename: '',
            message: `"${cardName}" 카드를 찾을 수 없습니다.`,
          };
        }
        const cardInfo = getCardInfoById(cardId);
        params.cardId = cardId;
        params.cardNumber = cardInfo?.cardNumber;
        filename = `카드_${cardInfo?.cardNumber}.xlsx`;
        message = `${cardInfo?.cardName} 거래내역을 다운로드합니다. 카드 상세 페이지에서 다운로드 버튼을 클릭하세요.`;
      }

      return {
        success: true,
        action: downloadType === 'monthly' ? 'download_monthly' : downloadType === 'all' ? 'download_all' : 'download_card',
        params,
        filename,
        message,
      };
    } catch (error) {
      console.error('prepareExcelDownload error:', error);
      return {
        success: false,
        action: 'download_monthly',
        params: {},
        filename: '',
        message: '다운로드 준비 중 오류가 발생했습니다.',
      };
    }
  },
});

// Tool 6: 카드/사용자 정보 조회
export const getCardInfoTool = tool({
  description: '카드 또는 사용자 정보를 조회합니다. 카드명, 사용자명, 또는 카드번호 끝 4자리로 검색합니다.',
  inputSchema: z.object({
    query: z.string().describe('검색어 (카드명, 사용자명, 또는 카드번호 끝 4자리)'),
  }),
  execute: async ({ query }: { query: string }): Promise<CardInfoResult> => {
    try {
      // 전체 카드 목록 조회 요청인 경우
      if (query === '전체' || query === '모두' || query === '목록') {
        const allCards = getAllCardInfo();
        return {
          success: true,
          card: null,
          message: `등록된 카드 목록:\n${allCards.map(c => `- ${c.cardName} (${c.cardNumber}): ${c.userName}, ${c.cardType}`).join('\n')}`,
        };
      }

      const cardId = findCardIdByName(query);
      if (!cardId) {
        return {
          success: false,
          card: null,
          message: `"${query}"에 해당하는 카드를 찾을 수 없습니다.`,
        };
      }

      const cardInfo = getCardInfoById(cardId);
      if (!cardInfo) {
        return {
          success: false,
          card: null,
          message: `카드 정보를 불러올 수 없습니다.`,
        };
      }

      return {
        success: true,
        card: {
          id: cardId,
          cardNumber: cardInfo.cardNumber,
          cardName: cardInfo.cardName,
          cardType: cardInfo.cardType,
          userName: cardInfo.userName,
        },
        message: `${cardInfo.cardName}: 카드번호 끝4자리 ${cardInfo.cardNumber}, 사용자 ${cardInfo.userName}, ${cardInfo.cardType} 카드입니다.`,
      };
    } catch (error) {
      console.error('getCardInfo error:', error);
      return {
        success: false,
        card: null,
        message: '카드 정보 조회 중 오류가 발생했습니다.',
      };
    }
  },
});

// Tool 모음 export
export const tools = {
  getTransactions: getTransactionsTool,
  getTransactionStats: getTransactionStatsTool,
  addPattern: addPatternTool,
  getPatterns: getPatternsTool,
  prepareExcelDownload: prepareExcelDownloadTool,
  getCardInfo: getCardInfoTool,
};
