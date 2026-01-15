'use client';

import { useRef, useEffect, useState, FormEvent } from 'react';
import { useChat, Chat } from '@ai-sdk/react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { Bot, Sparkles } from 'lucide-react';
import { DefaultChatTransport, UIMessage } from 'ai';

// 채팅 인스턴스 생성 (transport 설정)
const chatInstance = new Chat<UIMessage>({
  transport: new DefaultChatTransport({
    api: '/api/assistant',
  }),
  messages: [],
});

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    chat: chatInstance,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 새 메시지 추가 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 전송 핸들러
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input.trim() });
    setInput('');
  };

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 빠른 액션 핸들러
  const handleQuickAction = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
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
        placeholder="거래내역 조회, 패턴 매칭, 다운로드 등을 요청하세요..."
      />
    </div>
  );
}

// 환영 메시지 컴포넌트
function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        AI 어시스턴트
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        법인카드 거래내역 조회, 패턴 매칭, 엑셀 다운로드 등을
        자연어로 요청할 수 있습니다.
      </p>

      {/* 예시 질문 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <ExampleQuestion text="1월 거래내역 보여줘" />
        <ExampleQuestion text="매칭 대기 거래 몇 건이야?" />
        <ExampleQuestion text="스타벅스는 복리후생비로 매칭해줘" />
        <ExampleQuestion text="이번 달 내역 다운로드" />
      </div>
    </div>
  );
}

// 예시 질문 컴포넌트
function ExampleQuestion({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
      <Sparkles className="w-4 h-4 text-purple-500" />
      <span>"{text}"</span>
    </div>
  );
}

// 로딩 인디케이터 컴포넌트
function LoadingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// 에러 메시지 컴포넌트
function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <Bot className="w-5 h-5 text-red-500" />
      </div>
      <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <p className="text-sm text-red-700 dark:text-red-300">
          오류가 발생했습니다: {error.message}
        </p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
          잠시 후 다시 시도해주세요.
        </p>
      </div>
    </div>
  );
}
