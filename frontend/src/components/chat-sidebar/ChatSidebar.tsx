'use client';

import { useRef, useEffect, useState, FormEvent, useCallback } from 'react';
import { useChat, Chat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useChatSidebar } from './ChatSidebarProvider';
import { ChatSidebarHeader } from './ChatSidebarHeader';
import { ChatMessage } from '../assistant/ChatMessage';
import { ChatInput } from '../assistant/ChatInput';
import { QuickActions } from '../assistant/QuickActions';
import { cn } from '@/lib/utils';
import { Bot, Sparkles } from 'lucide-react';
import { getAISettings } from '@/lib/ai/settings-store';

// 설정을 포함한 커스텀 트랜스포트 생성
function createChatTransport() {
  return new DefaultChatTransport({
    api: '/api/assistant',
    body: () => {
      // 클라이언트 사이드에서만 설정 가져오기
      if (typeof window !== 'undefined') {
        const settings = getAISettings();
        // 서버 설정 사용 시 API 키는 빈 값으로 전달 (서버가 환경변수 사용)
        return {
          settings: {
            ...settings,
            apiKey: settings.useServerConfig ? '' : settings.apiKey,
          },
        };
      }
      return {};
    },
  });
}

export function ChatSidebar() {
  const { isOpen, closeSidebar } = useChatSidebar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat<UIMessage> | null>(null);
  const [input, setInput] = useState('');
  const [chatKey, setChatKey] = useState(0);

  // Chat 인스턴스 가져오기 (메모이제이션)
  const getChatInstance = useCallback(() => {
    if (!chatRef.current) {
      chatRef.current = new Chat<UIMessage>({
        transport: createChatTransport(),
        messages: [],
      });
    }
    return chatRef.current;
  }, []);

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useChat({
    chat: getChatInstance(),
  });

  // 컴포넌트 언마운트 시 명시적 cleanup
  useEffect(() => {
    return () => {
      if (chatRef.current) {
        // 스트리밍 중단 (있다면)
        if (chatRef.current.stop) {
          chatRef.current.stop();
        }
        chatRef.current = null;
      }
    };
  }, []);

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeSidebar]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatKey((k) => k + 1);
  };

  // 설정 변경 시 Chat 인스턴스 리셋
  const resetChatOnSettingsChange = useCallback(() => {
    if (chatRef.current) {
      // 스트리밍 중단
      if (chatRef.current.stop) {
        chatRef.current.stop();
      }
      chatRef.current = null;
    }
    // 메시지 초기화 및 새 Chat 인스턴스 생성
    setMessages([]);
    getChatInstance();
  }, [getChatInstance, setMessages]);

  return (
    <>
      {/* 오버레이 (모바일) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-xl z-50',
          'transition-transform duration-300 ease-in-out',
          'w-full sm:w-[400px] lg:w-[420px]',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* 헤더 */}
        <ChatSidebarHeader onNewChat={handleNewChat} />

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 space-y-4">
            {/* 환영 메시지 */}
            {messages.length === 0 && <WelcomeMessage />}

            {/* 메시지 목록 */}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* 로딩 인디케이터 */}
            {isLoading && <LoadingIndicator />}

            {/* 에러 메시지 */}
            {error && <ErrorMessage error={error} />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 빠른 액션 */}
        <QuickActions onAction={handleQuickAction} disabled={isLoading} />

        {/* 입력 영역 */}
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="질문하세요..."
        />
      </aside>
    </>
  );
}

// 환영 메시지 컴포넌트
function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-3">
        <Bot className="w-6 h-6 text-white" />
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        무엇을 도와드릴까요?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-4">
        거래내역 조회, 패턴 매칭, 엑셀 다운로드 등을 요청하세요.
      </p>

      {/* 예시 질문 */}
      <div className="space-y-2 w-full max-w-xs">
        <ExampleQuestion text="이번 달 거래 보여줘" />
        <ExampleQuestion text="매칭 대기 몇 건이야?" />
        <ExampleQuestion text="스타벅스 복리후생비로 매칭" />
      </div>
    </div>
  );
}

// 예시 질문 컴포넌트
function ExampleQuestion({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
      <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />
      <span>"{text}"</span>
    </div>
  );
}

// 로딩 인디케이터 컴포넌트
function LoadingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// 에러 메시지 컴포넌트
function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-red-500" />
      </div>
      <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <p className="text-xs text-red-700 dark:text-red-300">
          오류: {error.message}
        </p>
      </div>
    </div>
  );
}
