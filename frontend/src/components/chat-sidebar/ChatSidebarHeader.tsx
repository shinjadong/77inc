'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, Bot, Settings } from 'lucide-react';
import { useChatSidebar } from './ChatSidebarProvider';
import { AISettingsModal } from './AISettingsModal';
import { getAISettings } from '@/lib/ai/settings-store';
import { getModelInfo, getDirectModelInfo, PROVIDERS, type Provider } from '@/lib/ai/openrouter-config';

interface ChatSidebarHeaderProps {
  onNewChat?: () => void;
}

export function ChatSidebarHeader({ onNewChat }: ChatSidebarHeaderProps) {
  const { closeSidebar } = useChatSidebar();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modelName, setModelName] = useState('Claude 3.5 Haiku');
  const [providerName, setProviderName] = useState('Anthropic');

  // 설정에서 현재 모델 가져오기
  useEffect(() => {
    const updateModelInfo = () => {
      const settings = getAISettings();
      const provider = PROVIDERS.find(p => p.id === settings.provider);
      setProviderName(provider?.name || 'Anthropic');

      if (settings.provider === 'openrouter') {
        const model = getModelInfo(settings.selectedModel);
        setModelName(model?.name || settings.selectedModel);
      } else {
        const model = getDirectModelInfo(settings.provider as Provider, settings.selectedModel);
        setModelName(model?.name || settings.selectedModel);
      }
    };

    // 마운트 시 즉시 실행
    updateModelInfo();
  }, [isSettingsOpen]); // 설정 창 닫을 때도 업데이트

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI 어시스턴트
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {providerName} · {modelName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="AI 설정"
          >
            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="새 대화"
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={closeSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
