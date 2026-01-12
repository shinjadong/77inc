import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 클래스 병합 유틸리티
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 숫자 포맷 (금액)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// 숫자 포맷 (천단위 구분)
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

// 날짜 포맷
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// 날짜/시간 포맷
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// 카드 타입 한글 변환
export function getCardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    personal: '개인',
    shared: '공용',
    vehicle: '차량',
  };
  return labels[type] || type;
}

// 매칭 상태 한글 변환
export function getMatchStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '대기',
    auto: '자동매칭',
    manual: '수동매칭',
  };
  return labels[status] || status;
}

// 매칭 상태 색상
export function getMatchStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    auto: 'bg-green-100 text-green-800',
    manual: 'bg-blue-100 text-blue-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// 세션 상태 한글 변환
export function getSessionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '처리 대기',
    processing: '처리 중',
    completed: '완료',
    synced: '동기화 완료',
  };
  return labels[status] || status;
}

// 세션 상태 색상
export function getSessionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    synced: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
