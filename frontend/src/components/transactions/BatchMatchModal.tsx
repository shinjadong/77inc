'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/Autocomplete';
import { usePatterns, useMatchTransaction } from '@/hooks/useApi';
import { USAGE_CATEGORIES } from '@/lib/industryMapping';
import { TAX_CATEGORIES, TAX_CATEGORY_COLORS } from '@/lib/taxCategories';
import { classifyTransaction } from '@/lib/taxClassifier';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Transaction } from '@/types';

interface BatchMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onComplete: () => void;
}

export function BatchMatchModal({
  isOpen,
  onClose,
  transactions,
  onComplete,
}: BatchMatchModalProps) {
  const { data: patterns } = usePatterns();
  const matchTransaction = useMatchTransaction();
  const [value, setValue] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [taxCategory, setTaxCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 자동완성 옵션 생성
  const options: AutocompleteOption[] = [];

  USAGE_CATEGORIES.forEach((category) => {
    options.push({
      value: category,
      label: category,
      category: '자주 사용',
    });
  });

  const usedDescriptions = new Set<string>();
  patterns?.forEach((pattern) => {
    if (!usedDescriptions.has(pattern.usage_description)) {
      usedDescriptions.add(pattern.usage_description);
      if (!USAGE_CATEGORIES.includes(pattern.usage_description as typeof USAGE_CATEGORIES[number])) {
        options.push({
          value: pattern.usage_description,
          label: pattern.usage_description,
          category: '패턴',
        });
      }
    }
  });

  // 가맹점별 그룹화
  const groupedByMerchant = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      if (!acc[tx.merchant_name]) acc[tx.merchant_name] = [];
      acc[tx.merchant_name].push(tx);
      return acc;
    },
    {}
  );

  const handleBatchMatch = async () => {
    if (!value.trim() || transactions.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      // 세금분류가 지정되지 않은 경우 자동 분류
      const finalTaxCategory = taxCategory || classifyTransaction(
        tx.merchant_name,
        value.trim(),
        tx.amount
      );

      await new Promise<void>((resolve) => {
        matchTransaction.mutate(
          {
            id: tx.id,
            usageDescription: value.trim(),
            additionalNotes: additionalNotes || undefined,
            taxCategory: finalTaxCategory || undefined,
          },
          {
            onSuccess: () => resolve(),
            onError: () => resolve(),
          }
        );
      });
      setProgress(((i + 1) / transactions.length) * 100);
    }

    setIsProcessing(false);
    onComplete();
    onClose();
  };

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`일괄 매칭 (${transactions.length}건)`}
      size="lg"
    >
      <div className="space-y-4">
        {/* 선택된 거래 요약 */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-800">선택된 거래</span>
            <span className="text-sm font-bold text-blue-800">
              {transactions.length}건 / {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* 가맹점별 요약 */}
          <div className="space-y-1">
            {Object.entries(groupedByMerchant)
              .slice(0, 5)
              .map(([merchant, txs]) => (
                <div
                  key={merchant}
                  className="flex justify-between text-sm text-blue-700"
                >
                  <span className="truncate mr-2">{merchant}</span>
                  <span className="whitespace-nowrap">{txs.length}건</span>
                </div>
              ))}
            {Object.keys(groupedByMerchant).length > 5 && (
              <div className="text-sm text-blue-600 italic">
                외 {Object.keys(groupedByMerchant).length - 5}개 가맹점...
              </div>
            )}
          </div>
        </div>

        {/* 사용내역 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사용내역 (모든 거래에 동일 적용)
          </label>
          <Autocomplete
            value={value}
            onChange={setValue}
            options={options}
            placeholder="사용내역 입력..."
            autoFocus
          />
        </div>

        {/* 빠른 선택 버튼 */}
        <div>
          <p className="text-sm text-gray-500 mb-2">빠른 선택</p>
          <div className="flex flex-wrap gap-2">
            {['식비', '교통비', '복리후생비', '회의비', '접대비', '소모품비', '차량유류비'].map(
              (desc) => (
                <button
                  key={desc}
                  onClick={() => setValue(desc)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    value === desc
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {desc}
                </button>
              )
            )}
          </div>
        </div>

        {/* 추가메모 입력 (선택) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            추가메모 (선택, 모든 거래에 동일 적용)
          </label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="예: 점심빵 먹느라고 한 거"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">내부 관리용 메모입니다</p>
        </div>

        {/* 세금분류 선택 (선택) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            세금분류 (선택, 미선택 시 자동 분류)
          </label>
          <select
            value={taxCategory}
            onChange={(e) => setTaxCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">자동 분류</option>
            {TAX_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {taxCategory && (
            <div className="mt-2">
              <Badge className={TAX_CATEGORY_COLORS[taxCategory as keyof typeof TAX_CATEGORY_COLORS]}>
                {taxCategory}
              </Badge>
            </div>
          )}
        </div>

        {/* 진행률 */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>처리 중...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 선택된 거래 목록 */}
        <div className="max-h-48 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-500">
                  거래일
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">
                  가맹점
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">
                  금액
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.slice(0, 20).map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[200px]">
                    {tx.merchant_name}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
              {transactions.length > 20 && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-center text-gray-500 italic">
                    외 {transactions.length - 20}건...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          취소
        </Button>
        <Button
          onClick={handleBatchMatch}
          disabled={!value.trim() || isProcessing}
          isLoading={isProcessing}
        >
          {transactions.length}건 일괄 저장
        </Button>
      </ModalFooter>
    </Modal>
  );
}
