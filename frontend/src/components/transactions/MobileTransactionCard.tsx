'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectCheckbox } from './QuickMatchInput';
import { Edit, Users } from 'lucide-react';
import { formatDate, formatCurrency, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';
import type { Transaction, Card as CardType } from '@/types';

interface MobileTransactionCardProps {
  transaction: Transaction;
  card?: CardType;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onSelectSameMerchant: () => void;
}

export function MobileTransactionCard({
  transaction,
  card,
  isSelected,
  onSelect,
  onEdit,
  onSelectSameMerchant,
}: MobileTransactionCardProps) {
  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-lg border ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* 헤더: 체크박스, 상태, 금액 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <SelectCheckbox checked={isSelected} onChange={onSelect} />
          <Badge className={getMatchStatusColor(transaction.match_status)}>
            {getMatchStatusLabel(transaction.match_status)}
          </Badge>
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {formatCurrency(transaction.amount)}
        </span>
      </div>

      {/* 가맹점명 */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {transaction.merchant_name}
          </span>
          {transaction.match_status === 'pending' && (
            <button
              onClick={onSelectSameMerchant}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded"
              title="동일 가맹점 선택"
            >
              <Users className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {transaction.industry && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {transaction.industry}
          </span>
        )}
      </div>

      {/* 날짜 & 카드 */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <span>{formatDate(transaction.transaction_date)}</span>
        {card && <span>{card.card_name}</span>}
      </div>

      {/* 사용내역 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex-1">
          {transaction.usage_description ? (
            <span className="text-gray-900 dark:text-gray-100">
              {transaction.usage_description}
            </span>
          ) : (
            <span className="text-gray-400 italic">사용내역 미입력</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
