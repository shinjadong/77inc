import { supabase, CARD_NUMBER_MAP } from './supabase';
import { findMatch, savePatternFromManualMatch, suggestPatterns, batchMatch } from './matching';
import { exportToExcel, groupTransactionsByCard, formatDateForDB, parseCardStatement } from './excel';
import type {
  User, UserCreate, UserUpdate,
  Card, CardCreate, CardUpdate,
  Transaction,
  Pattern, PatternCreate,
  UploadSession,
} from '@/types';

// ============ Users API ============
export const usersApi = {
  getAll: async (activeOnly = true): Promise<User[]> => {
    console.log('[usersApi.getAll] Starting fetch...');
    try {
      let query = supabase.from('users').select('*');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query.order('name');
      console.log('[usersApi.getAll] Response:', { data: data?.length, error });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[usersApi.getAll] Error:', err);
      throw err;
    }
  },

  getById: async (id: number): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  getCards: async (userId: number): Promise<{ user_id: number; user_name: string; cards: Card[] }> => {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const { data: cards } = await supabase.from('cards').select('*').eq('user_id', userId);
    return {
      user_id: userId,
      user_name: user?.name || '',
      cards: cards || [],
    };
  },

  create: async (userData: UserCreate): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: number, userData: UserUpdate): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deactivate: async (id: number): Promise<void> => {
    await supabase.from('users').update({ is_active: false }).eq('id', id);
  },

  assignCard: async (userId: number, cardId: number): Promise<void> => {
    await supabase.from('cards').update({ user_id: userId }).eq('id', cardId);
  },

  unassignCard: async (_userId: number, cardId: number): Promise<void> => {
    await supabase.from('cards').update({ user_id: null }).eq('id', cardId);
  },

  search: async (name: string): Promise<User[]> => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('name', `%${name}%`);
    return data || [];
  },
};

// ============ Cards API ============
export const cardsApi = {
  getAll: async (activeOnly = true): Promise<Card[]> => {
    console.log('[cardsApi.getAll] Starting fetch...');
    try {
      let query = supabase.from('cards').select('*, users(*)');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query.order('id');
      console.log('[cardsApi.getAll] Response:', { data: data?.length, error });
      if (error) throw error;
      return (data || []).map(card => ({
        ...card,
        user: card.users,
      }));
    } catch (err) {
      console.error('[cardsApi.getAll] Error:', err);
      throw err;
    }
  },

  getById: async (id: number): Promise<Card | null> => {
    const { data, error } = await supabase
      .from('cards')
      .select('*, users(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? { ...data, user: data.users } : null;
  },

  create: async (cardData: CardCreate): Promise<Card> => {
    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: number, cardData: CardUpdate): Promise<Card> => {
    const { data, error } = await supabase
      .from('cards')
      .update({ ...cardData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deactivate: async (id: number): Promise<void> => {
    await supabase.from('cards').update({ is_active: false }).eq('id', id);
  },

  getTransactions: async (
    cardId: number,
    params?: { year?: number; month?: number; status?: string; limit?: number; offset?: number }
  ): Promise<{
    card_id: number;
    card_number: string;
    card_name: string;
    total: number;
    transactions: Transaction[];
  }> => {
    const { data: card } = await supabase.from('cards').select('*').eq('id', cardId).single();

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('card_id', cardId)
      .order('transaction_date', { ascending: false });

    if (params?.status && params.status !== 'all') {
      query = query.eq('match_status', params.status);
    }
    if (params?.year && params?.month) {
      const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
      const endDate = `${params.year}-${String(params.month).padStart(2, '0')}-31`;
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      card_id: cardId,
      card_number: card?.card_number || '',
      card_name: card?.card_name || '',
      total: count || 0,
      transactions: data || [],
    };
  },

  getPatterns: async (cardId: number): Promise<{
    card_id: number;
    card_number: string;
    patterns: Pattern[];
  }> => {
    const { data: card } = await supabase.from('cards').select('*').eq('id', cardId).single();
    const { data: patterns } = await supabase
      .from('patterns')
      .select('*')
      .or(`card_id.eq.${cardId},card_id.is.null`)
      .order('use_count', { ascending: false });

    return {
      card_id: cardId,
      card_number: card?.card_number || '',
      patterns: patterns || [],
    };
  },

  addPattern: async (cardId: number, merchantName: string, usageDescription: string): Promise<Pattern> => {
    const { data, error } = await supabase
      .from('patterns')
      .insert({
        merchant_name: merchantName,
        usage_description: usageDescription,
        card_id: cardId,
        match_type: 'exact',
        priority: 10,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deletePattern: async (_cardId: number, patternId: number): Promise<void> => {
    await supabase.from('patterns').delete().eq('id', patternId);
  },

  matchTransaction: async (
    _cardId: number,
    transactionId: number,
    usageDescription: string,
    savePattern = true
  ): Promise<{ success: boolean; transaction: Transaction; pattern_saved: boolean }> => {
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    await supabase
      .from('transactions')
      .update({
        usage_description: usageDescription,
        match_status: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    let patternSaved = false;
    if (savePattern && tx) {
      await savePatternFromManualMatch(tx.merchant_name, usageDescription, tx.card_id);
      patternSaved = true;
    }

    const { data: updated } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    return {
      success: true,
      transaction: updated!,
      pattern_saved: patternSaved,
    };
  },

  rematch: async (cardId: number): Promise<{
    success: boolean;
    stats: { total: number; matched: number; failed: number };
  }> => {
    const { data: pending } = await supabase
      .from('transactions')
      .select('*')
      .eq('card_id', cardId)
      .eq('match_status', 'pending');

    if (!pending || pending.length === 0) {
      return { success: true, stats: { total: 0, matched: 0, failed: 0 } };
    }

    const result = await batchMatch(
      pending.map(tx => ({
        id: tx.id,
        merchantName: tx.merchant_name,
        cardId: tx.card_id,
      }))
    );

    return {
      success: true,
      stats: { total: pending.length, ...result },
    };
  },

  suggestPattern: async (cardId: number, merchantName: string) => {
    const suggestions = await suggestPatterns(merchantName, cardId);
    return {
      merchant_name: merchantName,
      suggestions: suggestions.map(s => ({
        pattern_id: s.patternId,
        merchant_name: s.merchantName,
        usage_description: s.usageDescription,
        score: s.score,
        is_card_specific: false,
      })),
    };
  },

  getStats: async (cardNumber: string) => {
    const { data: card } = await supabase
      .from('cards')
      .select('*')
      .eq('card_number', cardNumber)
      .single();

    if (!card) throw new Error('카드를 찾을 수 없습니다');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('card_id', card.id);

    const total = transactions?.length || 0;
    const matched = transactions?.filter(t => t.match_status !== 'pending').length || 0;
    const pending = total - matched;

    return {
      card_number: cardNumber,
      card_name: card.card_name,
      total_transactions: total,
      matched,
      pending,
      match_rate: total > 0 ? Math.round((matched / total) * 100) : 0,
      monthly: [],
    };
  },

  downloadExcel: async (cardNumber: string, year?: number, month?: number): Promise<void> => {
    const { data: card } = await supabase
      .from('cards')
      .select('*')
      .eq('card_number', cardNumber)
      .single();

    if (!card) throw new Error('카드를 찾을 수 없습니다');

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('card_id', card.id)
      .order('transaction_date');

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }

    const { data: transactions } = await query;

    const grouped = { [cardNumber]: transactions || [] };
    const filename = year && month
      ? `카드_${cardNumber}_${year}_${String(month).padStart(2, '0')}.xlsx`
      : `카드_${cardNumber}_전체.xlsx`;

    await exportToExcel(grouped, filename);
  },
};

// ============ Transactions API ============
export const transactionsApi = {
  getAll: async (params?: { card_id?: number; status?: string; limit?: number; offset?: number }): Promise<Transaction[]> => {
    let query = supabase.from('transactions').select('*, cards(*)');
    if (params?.card_id) query = query.eq('card_id', params.card_id);
    if (params?.status && params.status !== 'all') query = query.eq('match_status', params.status);
    const { data, error } = await query.order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(tx => ({ ...tx, card: tx.cards }));
  },

  getPending: async (cardId?: number): Promise<Transaction[]> => {
    let query = supabase
      .from('transactions')
      .select('*, cards(*)')
      .eq('match_status', 'pending');
    if (cardId) query = query.eq('card_id', cardId);
    const { data, error } = await query.order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(tx => ({ ...tx, card: tx.cards }));
  },

  match: async (id: number, usageDescription: string): Promise<Transaction> => {
    const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single();

    await supabase
      .from('transactions')
      .update({
        usage_description: usageDescription,
        match_status: 'manual',
      })
      .eq('id', id);

    if (tx) {
      await savePatternFromManualMatch(tx.merchant_name, usageDescription, tx.card_id);
    }

    const { data: updated } = await supabase.from('transactions').select('*').eq('id', id).single();
    return updated!;
  },

  bulkMatch: async (matches: { id: number; usage_description: string }[]): Promise<void> => {
    for (const match of matches) {
      await transactionsApi.match(match.id, match.usage_description);
    }
  },
};

// ============ Patterns API ============
export const patternsApi = {
  getAll: async (): Promise<Pattern[]> => {
    const { data, error } = await supabase
      .from('patterns')
      .select('*, cards(*)')
      .order('use_count', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getStats: async (): Promise<{ total: number; by_type: Record<string, number> }> => {
    const { data } = await supabase.from('patterns').select('match_type');
    const byType: Record<string, number> = {};
    for (const p of data || []) {
      byType[p.match_type] = (byType[p.match_type] || 0) + 1;
    }
    return { total: data?.length || 0, by_type: byType };
  },

  create: async (patternData: PatternCreate): Promise<Pattern> => {
    const { data, error } = await supabase
      .from('patterns')
      .insert(patternData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  testMatch: async (merchantName: string, cardId?: number): Promise<{ match: boolean; pattern?: Pattern }> => {
    const result = await findMatch(merchantName, cardId || 0);
    if (result) {
      const { data: pattern } = await supabase
        .from('patterns')
        .select('*')
        .eq('id', result.patternId)
        .single();
      return { match: true, pattern: pattern || undefined };
    }
    return { match: false };
  },
};

// ============ Sessions API ============
export const sessionsApi = {
  getAll: async (): Promise<UploadSession[]> => {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .order('upload_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: number): Promise<UploadSession | null> => {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await supabase.from('transactions').delete().eq('session_id', id);
    await supabase.from('upload_sessions').delete().eq('id', id);
  },
};

// ============ Upload API ============
export const uploadApi = {
  uploadFile: async (file: File): Promise<{
    session_id: number;
    filename: string;
    total: number;
    matched: number;
    pending: number;
  }> => {
    // 1. Excel 파싱
    const parsed = await parseCardStatement(file);

    // 2. 세션 생성
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        filename: file.name,
        status: 'processing',
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    // 3. 카드 정보 조회
    const { data: cards } = await supabase.from('cards').select('*');
    const cardIdByNumber: Record<string, number> = {};
    for (const card of cards || []) {
      cardIdByNumber[card.card_number] = card.id;
    }

    // 4. 거래 삽입 및 매칭
    let inserted = 0;
    let matched = 0;

    for (const tx of parsed) {
      const cardId = cardIdByNumber[tx.cardNumber];
      if (!cardId) continue;

      // 중복 확인
      const dateStr = formatDateForDB(tx.transactionDate);
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('card_id', cardId)
        .eq('transaction_date', dateStr)
        .eq('merchant_name', tx.merchantName)
        .eq('amount', tx.amount)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // 패턴 매칭
      const matchResult = await findMatch(tx.merchantName, cardId);

      // 거래 삽입
      await supabase.from('transactions').insert({
        session_id: session.id,
        card_id: cardId,
        transaction_date: dateStr,
        merchant_name: tx.merchantName,
        amount: tx.amount,
        industry: tx.industry,
        usage_description: matchResult?.usageDescription || null,
        match_status: matchResult ? 'auto' : 'pending',
        matched_pattern_id: matchResult?.patternId || null,
      });

      inserted++;
      if (matchResult) matched++;
    }

    // 5. 세션 업데이트
    await supabase
      .from('upload_sessions')
      .update({
        status: 'completed',
        total_transactions: inserted,
        matched_count: matched,
        pending_count: inserted - matched,
      })
      .eq('id', session.id);

    return {
      session_id: session.id,
      filename: file.name,
      total: inserted,
      matched,
      pending: inserted - matched,
    };
  },
};

// ============ Export API ============
export const exportApi = {
  getAvailableMonths: async (): Promise<{ year: number; month: number; count: number }[]> => {
    const { data } = await supabase.from('transactions').select('transaction_date');
    const monthCounts: Record<string, number> = {};

    for (const tx of data || []) {
      const date = new Date(tx.transaction_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }

    return Object.entries(monthCounts)
      .map(([key, count]) => {
        const [year, month] = key.split('-').map(Number);
        return { year, month, count };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  },

  downloadMonthly: async (year: number, month: number): Promise<void> => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date');

    const grouped = groupTransactionsByCard(transactions || [], CARD_NUMBER_MAP);
    const filename = `칠칠기업_법인카드_${year}_${String(month).padStart(2, '0')}.xlsx`;
    await exportToExcel(grouped, filename);
  },

  downloadAll: async (): Promise<void> => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date');

    const grouped = groupTransactionsByCard(transactions || [], CARD_NUMBER_MAP);
    await exportToExcel(grouped, '칠칠기업_법인카드.xlsx');
  },
};

// ============ Health Check ============
export const healthApi = {
  check: async (): Promise<{ status: string }> => {
    const { error } = await supabase.from('cards').select('id').limit(1);
    return { status: error ? 'error' : 'healthy' };
  },
};
