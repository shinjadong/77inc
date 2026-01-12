// 사용자 타입
export interface User {
  id: number;
  name: string;
  employee_id: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  card_count?: number;
  cards?: Card[];
}

export interface UserCreate {
  name: string;
  employee_id?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
}

export interface UserUpdate {
  name?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}

// 카드 타입
export interface Card {
  id: number;
  card_number: string;
  card_name: string;
  sheet_name: string | null;
  user_id?: number | null;
  card_type: 'personal' | 'shared' | 'vehicle';
  is_active: boolean;
  transaction_count?: number;
  pattern_count?: number;
  user?: User;
}

export interface CardCreate {
  card_number: string;
  card_name: string;
  sheet_name?: string;
  user_id?: number;
  card_type?: 'personal' | 'shared' | 'vehicle';
}

export interface CardUpdate {
  card_name?: string;
  sheet_name?: string;
  user_id?: number | null;
  card_type?: 'personal' | 'shared' | 'vehicle';
  is_active?: boolean;
}

// 거래 타입
export interface Transaction {
  id: number;
  session_id: number;
  card_id: number;
  transaction_date: string;
  merchant_name: string;
  amount: number;
  industry: string | null;
  usage_description: string | null;
  match_status: 'pending' | 'auto' | 'manual';
  matched_pattern_id: number | null;
  synced_to_sheets: boolean;
  card?: Card;
}

// 패턴 타입
export interface Pattern {
  id: number;
  merchant_name: string;
  usage_description: string;
  card_id: number | null;
  match_type: 'exact' | 'contains' | 'regex';
  priority: number;
  use_count: number;
  created_by: string | null;
}

export interface PatternCreate {
  merchant_name: string;
  usage_description: string;
  card_id?: number;
  match_type?: 'exact' | 'contains' | 'regex';
  priority?: number;
}

// 업로드 세션 타입
export interface UploadSession {
  id: number;
  filename: string;
  upload_date: string;
  total_transactions: number;
  matched_count: number;
  pending_count: number;
  status: 'pending' | 'processing' | 'completed' | 'synced';
  created_by: string | null;
}

// API 응답 타입
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface UsersResponse {
  users: User[];
}

export interface CardsResponse {
  cards: Card[];
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total?: number;
}

export interface PatternsResponse {
  patterns: Pattern[];
}

export interface SessionsResponse {
  sessions: UploadSession[];
}

// 대시보드 통계 타입
export interface DashboardStats {
  total_cards: number;
  total_users: number;
  total_transactions: number;
  pending_transactions: number;
  total_patterns: number;
  recent_sessions: UploadSession[];
}
