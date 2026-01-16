'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CARD_ORDER } from '@/lib/supabase';

export interface ExportFilterOptions {
  dateFrom: string;
  dateTo: string;
  cardIds: string[];
  matchStatus: 'all' | 'pending' | 'auto' | 'manual';
}

interface ExportFiltersProps {
  onExport: (filters: ExportFilterOptions) => Promise<void>;
  defaultCardIds?: string[];
  disabled?: boolean;
}

const CARD_NAMES: Record<string, string> = {
  '3987': '김준교',
  '4985': '김용석 대표님',
  '6902': '하이패스1',
  '6974': '노혜경 이사님',
  '9980': '공용카드',
  '6911': '하이패스2',
  '0981': '법인카드 0981',
  '9904': '법인카드 9904',
};

export function ExportFilters({ onExport, defaultCardIds, disabled = false }: ExportFiltersProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(
    new Set(defaultCardIds || [])
  );
  const [matchStatus, setMatchStatus] = useState<'all' | 'pending' | 'auto' | 'manual'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleCardToggle = (cardNumber: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardNumber)) {
      newSelected.delete(cardNumber);
    } else {
      newSelected.add(cardNumber);
    }
    setSelectedCards(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCards.size === CARD_ORDER.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(CARD_ORDER));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport({
        dateFrom,
        dateTo,
        cardIds: Array.from(selectedCards),
        matchStatus,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isExportDisabled = disabled || isExporting || selectedCards.size === 0;

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">다운로드 필터</h3>

        {/* Date Range Filter */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">기간 필터</label>
            <div className="flex gap-3 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="시작일"
                className="flex-1"
              />
              <span className="text-gray-500">~</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="종료일"
                className="flex-1"
              />
            </div>
          </div>

          {/* Card Filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">카드 선택</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedCards.size === CARD_ORDER.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CARD_ORDER.map((cardNumber) => (
                <label
                  key={cardNumber}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCards.has(cardNumber)}
                    onChange={() => handleCardToggle(cardNumber)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {cardNumber} - {CARD_NAMES[cardNumber]}
                  </span>
                </label>
              ))}
            </div>
            {selectedCards.size === 0 && (
              <p className="text-sm text-red-600 mt-2">
                최소 1개 이상의 카드를 선택해주세요.
              </p>
            )}
          </div>

          {/* Match Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">매칭 상태</label>
            <div className="flex gap-4">
              {[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '매칭대기' },
                { value: 'auto', label: '자동매칭' },
                { value: 'manual', label: '수동매칭' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="matchStatus"
                    value={value}
                    checked={matchStatus === value}
                    onChange={(e) =>
                      setMatchStatus(e.target.value as typeof matchStatus)
                    }
                    className="rounded-full"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleExport}
          disabled={isExportDisabled}
          className="w-full"
        >
          {isExporting ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              생성 중...
            </span>
          ) : (
            '엑셀 다운로드'
          )}
        </Button>
        {defaultCardIds && defaultCardIds.length > 0 && (
          <p className="text-sm text-gray-600 mt-2 text-center">
            현재 카드 필터가 기본으로 적용되어 있습니다
          </p>
        )}
      </div>
    </Card>
  );
}
