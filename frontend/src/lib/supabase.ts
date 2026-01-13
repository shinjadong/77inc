import { createClient } from '@supabase/supabase-js';

// Hardcoded values to ensure they work in all environments
const SUPABASE_URL = 'https://kxcvsgecefbzoiczyxsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ZzZ2VjZWZiem9pY3p5eHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzcwNDgsImV4cCI6MjA4MzgxMzA0OH0.LpzRg_uzhauq-eyp1iNEVyM37wZxU2LmOUt6OAgwUBI';

// Use env vars if available and valid, otherwise use hardcoded values
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = (envUrl && envUrl.startsWith('https://')) ? envUrl : SUPABASE_URL;
const supabaseAnonKey = (envKey && envKey.startsWith('eyJ')) ? envKey : SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing with URL:', supabaseUrl.substring(0, 30) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 카드번호 → card_id 매핑
export const CARD_ID_MAP: Record<string, number> = {
  '3987': 1,  // 김준교
  '4985': 2,  // 김용석 대표님
  '6902': 3,  // 하이패스1
  '6974': 4,  // 노혜경 이사님
  '9980': 5,  // 공용카드
  '6911': 6,  // 하이패스2
};

// card_id → 카드번호 역매핑
export const CARD_NUMBER_MAP: Record<number, string> = {
  1: '3987',
  2: '4985',
  3: '6902',
  4: '6974',
  5: '9980',
  6: '6911',
};

// 카드 시트 순서 (Excel 내보내기용)
export const CARD_ORDER = ['3987', '4985', '6902', '6974', '9980', '6911'];
