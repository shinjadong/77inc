import { supabase } from './supabase';

interface MatchResult {
  usageDescription: string;
  patternId: number;
}

/**
 * 패턴 매칭 로직 (3단계 우선순위)
 * 1. 카드 전용 정확 매칭 (card_id가 있는 exact 패턴)
 * 2. 공통 정확 매칭 (card_id가 NULL인 exact 패턴)
 * 3. 포함 매칭 (contains 패턴)
 */
export async function findMatch(
  merchantName: string,
  cardId: number
): Promise<MatchResult | null> {
  // 1. 카드 전용 정확 매칭
  const { data: cardExact } = await supabase
    .from('patterns')
    .select('*')
    .eq('card_id', cardId)
    .eq('match_type', 'exact')
    .eq('merchant_name', merchantName)
    .order('priority', { ascending: false })
    .limit(1);

  if (cardExact && cardExact.length > 0) {
    await incrementUseCount(cardExact[0].id);
    return {
      usageDescription: cardExact[0].usage_description,
      patternId: cardExact[0].id,
    };
  }

  // 2. 공통 정확 매칭
  const { data: commonExact } = await supabase
    .from('patterns')
    .select('*')
    .is('card_id', null)
    .eq('match_type', 'exact')
    .eq('merchant_name', merchantName)
    .order('priority', { ascending: false })
    .limit(1);

  if (commonExact && commonExact.length > 0) {
    await incrementUseCount(commonExact[0].id);
    return {
      usageDescription: commonExact[0].usage_description,
      patternId: commonExact[0].id,
    };
  }

  // 3. 포함 매칭
  const { data: containsPatterns } = await supabase
    .from('patterns')
    .select('*')
    .eq('match_type', 'contains')
    .order('priority', { ascending: false });

  if (containsPatterns) {
    for (const pattern of containsPatterns) {
      if (merchantName.includes(pattern.merchant_name)) {
        // 카드 전용 또는 공통 패턴만 적용
        if (pattern.card_id === null || pattern.card_id === cardId) {
          await incrementUseCount(pattern.id);
          return {
            usageDescription: pattern.usage_description,
            patternId: pattern.id,
          };
        }
      }
    }
  }

  return null;
}

/**
 * 패턴 사용 횟수 증가
 */
async function incrementUseCount(patternId: number): Promise<void> {
  try {
    // RPC로 use_count 증가 시도
    const { error } = await supabase.rpc('increment_pattern_use_count', { pattern_id: patternId });
    if (error) {
      // RPC가 없으면 직접 업데이트
      await supabase
        .from('patterns')
        .update({ use_count: 1 })
        .eq('id', patternId);
    }
  } catch {
    // 실패 시 무시 (비필수 기능)
  }
}

/**
 * 거래 일괄 매칭
 */
export async function batchMatch(
  transactions: Array<{ id: number; merchantName: string; cardId: number }>
): Promise<{ matched: number; failed: number }> {
  let matched = 0;
  let failed = 0;

  for (const tx of transactions) {
    const result = await findMatch(tx.merchantName, tx.cardId);
    if (result) {
      await supabase
        .from('transactions')
        .update({
          usage_description: result.usageDescription,
          matched_pattern_id: result.patternId,
          match_status: 'auto',
        })
        .eq('id', tx.id);
      matched++;
    } else {
      failed++;
    }
  }

  return { matched, failed };
}

/**
 * 패턴 제안 (유사 패턴 검색)
 */
export async function suggestPatterns(
  merchantName: string,
  cardId?: number
): Promise<Array<{
  patternId: number;
  merchantName: string;
  usageDescription: string;
  score: number;
}>> {
  let query = supabase.from('patterns').select('*');

  if (cardId) {
    query = query.or(`card_id.eq.${cardId},card_id.is.null`);
  }

  const { data: patterns } = await query;
  if (!patterns) return [];

  const suggestions: Array<{
    patternId: number;
    merchantName: string;
    usageDescription: string;
    score: number;
  }> = [];

  for (const pattern of patterns) {
    let score = 0;

    if (pattern.merchant_name === merchantName) {
      score = 100;
    } else if (pattern.merchant_name.includes(merchantName)) {
      score = 80;
    } else if (merchantName.includes(pattern.merchant_name)) {
      score = 60;
    } else {
      // 단어 단위 매칭
      const words = pattern.merchant_name.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && merchantName.includes(word)) {
          score = Math.max(score, 40);
        }
      }
    }

    if (score > 0) {
      suggestions.push({
        patternId: pattern.id,
        merchantName: pattern.merchant_name,
        usageDescription: pattern.usage_description,
        score,
      });
    }
  }

  // 점수순 정렬 후 상위 5개
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * 수동 매칭 시 패턴 저장
 */
export async function savePatternFromManualMatch(
  merchantName: string,
  usageDescription: string,
  cardId?: number
): Promise<void> {
  // 기존 패턴 확인
  let query = supabase
    .from('patterns')
    .select('id')
    .eq('merchant_name', merchantName)
    .eq('match_type', 'exact');

  if (cardId) {
    query = query.eq('card_id', cardId);
  } else {
    query = query.is('card_id', null);
  }

  const { data: existing } = await query.limit(1);

  if (existing && existing.length > 0) {
    // 기존 패턴 업데이트
    await supabase
      .from('patterns')
      .update({ usage_description: usageDescription })
      .eq('id', existing[0].id);
  } else {
    // 새 패턴 생성
    await supabase.from('patterns').insert({
      merchant_name: merchantName,
      usage_description: usageDescription,
      card_id: cardId || null,
      match_type: 'exact',
      priority: cardId ? 10 : 0,
      use_count: 1,
    });
  }
}
