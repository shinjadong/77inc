'use client';

import { useState, useEffect } from 'react';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/Autocomplete';
import { usePatterns, useMatchTransaction } from '@/hooks/useApi';
import { USAGE_CATEGORIES } from '@/lib/industryMapping';
import { Check, X, Loader2 } from 'lucide-react';
import type { Transaction } from '@/types';

interface QuickMatchInputProps {
  transaction: Transaction;
  onComplete: () => void;
  onCancel: () => void;
}

export function QuickMatchInput({
  transaction,
  onComplete,
  onCancel,
}: QuickMatchInputProps) {
  const { data: patterns } = usePatterns();
  const matchTransaction = useMatchTransaction();
  const [value, setValue] = useState(transaction.usage_description || '');

  // 자동완성 옵션 생성
  const options: AutocompleteOption[] = [];

  // 1. 기본 카테고리 (우선순위 높음)
  USAGE_CATEGORIES.forEach((category) => {
    options.push({
      value: category,
      label: category,
      category: '자주 사용',
    });
  });

  // 2. 패턴에서 가져온 사용내역 (중복 제거)
  const usedDescriptions = new Set<string>();
  patterns?.forEach((pattern) => {
    if (!usedDescriptions.has(pattern.usage_description)) {
      usedDescriptions.add(pattern.usage_description);
      // 이미 기본 카테고리에 있으면 추가하지 않음
      if (!USAGE_CATEGORIES.includes(pattern.usage_description as typeof USAGE_CATEGORIES[number])) {
        options.push({
          value: pattern.usage_description,
          label: pattern.usage_description,
          description: pattern.merchant_name,
          category: '패턴',
        });
      }
    }
  });

  const handleSave = async () => {
    if (!value.trim()) return;

    matchTransaction.mutate(
      { id: transaction.id, usageDescription: value.trim() },
      {
        onSuccess: onComplete,
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2" onKeyDown={handleKeyDown}>
      <Autocomplete
        value={value}
        onChange={setValue}
        options={options}
        placeholder="사용내역 입력..."
        autoFocus
        onEnter={handleSave}
        onEscape={onCancel}
        className="flex-1 min-w-[200px]"
      />
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={!value.trim() || matchTransaction.isPending}
          className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="저장 (Enter)"
        >
          {matchTransaction.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
          title="취소 (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// 일괄 선택을 위한 체크박스 컴포넌트
interface SelectCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SelectCheckbox({ checked, onChange, disabled }: SelectCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
    />
  );
}
