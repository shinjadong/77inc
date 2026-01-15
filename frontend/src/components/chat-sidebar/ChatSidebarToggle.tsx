'use client';

import { MessageSquare, X } from 'lucide-react';
import { useChatSidebar } from './ChatSidebarProvider';
import { cn } from '@/lib/utils';

export function ChatSidebarToggle() {
  const { isOpen, toggleSidebar } = useChatSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'fixed z-50 p-4 rounded-full shadow-lg transition-all duration-300',
        'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
        'text-white',
        // 위치: 사이드바가 열리면 숨기기
        isOpen
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100',
        // 데스크탑: 우측 하단
        'bottom-6 right-6',
        // 모바일: 좀 더 작게
        'sm:p-4 p-3'
      )}
      aria-label={isOpen ? 'AI 채팅 닫기' : 'AI 채팅 열기'}
    >
      {isOpen ? (
        <X className="w-6 h-6 sm:w-6 sm:h-6" />
      ) : (
        <MessageSquare className="w-6 h-6 sm:w-6 sm:h-6" />
      )}

      {/* 펄스 애니메이션 (사이드바 닫혀있을 때만) */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-30" />
      )}
    </button>
  );
}
