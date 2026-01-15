'use client';

import { Search, FileSpreadsheet, Plus, BarChart3, CreditCard, HelpCircle } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    icon: Search,
    label: '이번 달 거래',
    prompt: '이번 달 거래내역 보여줘',
  },
  {
    icon: BarChart3,
    label: '매칭 현황',
    prompt: '매칭 대기 중인 거래가 몇 건이야?',
  },
  {
    icon: FileSpreadsheet,
    label: '엑셀 다운로드',
    prompt: '이번 달 전체 내역 엑셀로 다운로드해줘',
  },
  {
    icon: Plus,
    label: '패턴 추가',
    prompt: '패턴 추가하고 싶어',
  },
  {
    icon: CreditCard,
    label: '카드 정보',
    prompt: '등록된 카드 목록 보여줘',
  },
  {
    icon: HelpCircle,
    label: '도움말',
    prompt: '어떤 기능을 사용할 수 있어?',
  },
];

interface QuickActionsProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">빠른 실행</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onAction(action.prompt)}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 text-sm
                         bg-white dark:bg-gray-700
                         border border-gray-200 dark:border-gray-600
                         rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-600
                         hover:border-gray-300 dark:hover:border-gray-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         whitespace-nowrap
                         transition-colors"
            >
              <action.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
