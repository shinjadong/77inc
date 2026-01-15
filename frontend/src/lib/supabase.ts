import { createClient } from '@supabase/supabase-js';

// Always use these hardcoded values - Vercel env vars were causing issues
const supabaseUrl = 'https://kxcvsgecefbzoiczyxsp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ZzZ2VjZWZiem9pY3p5eHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzcwNDgsImV4cCI6MjA4MzgxMzA0OH0.LpzRg_uzhauq-eyp1iNEVyM37wZxU2LmOUt6OAgwUBI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 카드번호 → card_id 매핑
export const CARD_ID_MAP: Record<string, number> = {
  '3987': 1,  // 김준교
  '4985': 2,  // 김용석 대표님
  '6902': 3,  // 하이패스1
  '6974': 4,  // 노혜경 이사님
  '9980': 5,  // 공용카드
  '6911': 6,  // 하이패스2
  '0981': 7,  // 법인카드 0981
  '9904': 8,  // 법인카드 9904
};

// card_id → 카드번호 역매핑
export const CARD_NUMBER_MAP: Record<number, string> = {
  1: '3987',
  2: '4985',
  3: '6902',
  4: '6974',
  5: '9980',
  6: '6911',
  7: '0981',
  8: '9904',
};

// 카드 시트 순서 (Excel 내보내기용)
export const CARD_ORDER = ['3987', '4985', '6902', '6974', '9980', '6911', '0981', '9904'];
