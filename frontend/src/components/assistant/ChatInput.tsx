'use client';

import { FormEvent, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = '메시지를 입력하세요...',
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter로 전송 (Shift+Enter는 줄바꿈 - input에서는 미지원)
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && value.trim()) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-3 max-w-4xl mx-auto">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600
                     bg-gray-50 dark:bg-gray-700
                     text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="p-3 rounded-xl bg-blue-600 text-white
                     hover:bg-blue-700 active:bg-blue-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          aria-label="전송"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}
