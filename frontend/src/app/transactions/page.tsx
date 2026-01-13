'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useTransactions, usePendingTransactions, useMatchTransaction, useCards } from '@/hooks/useApi';
import { QuickMatchInput, SelectCheckbox } from '@/components/transactions/QuickMatchInput';
import { BatchMatchModal } from '@/components/transactions/BatchMatchModal';
import { Receipt, Edit, Filter, AlertCircle, CheckCircle, Clock, CheckSquare, Square, Users } from 'lucide-react';
import { formatDate, formatCurrency, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';
import type { Transaction } from '@/types';

type FilterStatus = 'all' | 'pending' | 'auto' | 'manual';

export default function TransactionsPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCardId, setFilterCardId] = useState<number | undefined>(undefined);

  const { data: allTransactions, isLoading: allLoading } = useTransactions(
    filterStatus === 'all'
      ? { card_id: filterCardId }
      : { card_id: filterCardId, status: filterStatus }
  );
  const { data: pendingTransactions } = usePendingTransactions();
  const { data: cards } = useCards();
  const matchTransaction = useMatchTransaction();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [usageDescription, setUsageDescription] = useState('');

  // 인라인 편집 상태
  const [editingId, setEditingId] = useState<number | null>(null);

  // 일괄 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // 수동 매칭 모달 열기
  const openMatchModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setUsageDescription(transaction.usage_description || '');
    setIsMatchModalOpen(true);
  };

  // 수동 매칭 처리
  const handleMatch = () => {
    if (!selectedTransaction || !usageDescription) return;

    matchTransaction.mutate(
      { id: selectedTransaction.id, usageDescription },
      {
        onSuccess: () => {
          setIsMatchModalOpen(false);
          setSelectedTransaction(null);
          setUsageDescription('');
        },
      }
    );
  };

  // 필터된 거래 목록
  const transactions = filterStatus === 'pending'
    ? pendingTransactions
    : allTransactions;

  // 통계
  const pendingCount = pendingTransactions?.length || 0;
  const totalCount = allTransactions?.length || 0;

  // 선택된 거래 목록
  const selectedTransactions = useMemo(() => {
    return transactions?.filter((tx) => selectedIds.has(tx.id)) || [];
  }, [transactions, selectedIds]);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!transactions) return;
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((tx) => tx.id)));
    }
  };

  // 단일 선택/해제
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // 동일 가맹점 선택
  const handleSelectSameMerchant = (merchantName: string) => {
    if (!transactions) return;
    const sameTransactions = transactions.filter(
      (tx) => tx.merchant_name === merchantName && tx.match_status === 'pending'
    );
    const newSelected = new Set(selectedIds);
    sameTransactions.forEach((tx) => newSelected.add(tx.id));
    setSelectedIds(newSelected);
  };

  // 일괄 매칭 완료 후
  const handleBatchComplete = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen">
      <Header title="거래내역" />

      <div className="p-6 space-y-6">
        {/* 통계 & 필터 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 통계 배지 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              <Receipt className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">전체</span>
              <span className="font-bold text-gray-900">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">대기</span>
              <span className="font-bold text-yellow-700">{pendingCount}</span>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">상태:</span>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '대기' },
                { value: 'auto', label: '자동' },
                { value: 'manual', label: '수동' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value as FilterStatus)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    filterStatus === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <select
              value={filterCardId || ''}
              onChange={(e) => setFilterCardId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카드</option>
              {cards?.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.card_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 대기 중 거래 알림 */}
        {pendingCount > 0 && filterStatus !== 'pending' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {pendingCount}건의 거래가 매칭 대기 중입니다
                </p>
                <p className="text-sm text-yellow-700">
                  수동으로 사용내역을 입력해주세요.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setFilterStatus('pending')}>
              대기 거래 보기
            </Button>
          </div>
        )}

        {/* 일괄 선택 툴바 */}
        {selectedIds.size > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedIds.size}건 선택됨
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                선택 해제
              </Button>
              <Button
                size="sm"
                onClick={() => setIsBatchModalOpen(true)}
              >
                일괄 매칭
              </Button>
            </div>
          </div>
        )}

        {/* 거래 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                거래 목록
                {filterStatus !== 'all' && (
                  <Badge className={getMatchStatusColor(filterStatus)}>
                    {getMatchStatusLabel(filterStatus)}
                  </Badge>
                )}
              </div>
              {transactions && transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-gray-500"
                >
                  {selectedIds.size === transactions.length ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      전체 해제
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      전체 선택
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allLoading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : transactions?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-gray-500 mt-3">
                  {filterStatus === 'pending'
                    ? '대기 중인 거래가 없습니다.'
                    : '표시할 거래가 없습니다.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <SelectCheckbox
                        checked={(transactions?.length ?? 0) > 0 && selectedIds.size === (transactions?.length ?? 0)}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>거래일</TableHead>
                    <TableHead>카드</TableHead>
                    <TableHead>가맹점</TableHead>
                    <TableHead>업종</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="min-w-[200px]">사용내역</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={selectedIds.has(transaction.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <SelectCheckbox
                          checked={selectedIds.has(transaction.id)}
                          onChange={(checked) => handleSelect(transaction.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(transaction.transaction_date)}
                      </TableCell>
                      <TableCell>
                        {cards?.find(c => c.id === transaction.card_id)?.card_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.merchant_name}</span>
                          {transaction.match_status === 'pending' && (
                            <button
                              onClick={() => handleSelectSameMerchant(transaction.merchant_name)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="동일 가맹점 선택"
                            >
                              <Users className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {transaction.industry || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {editingId === transaction.id ? (
                          <QuickMatchInput
                            transaction={transaction}
                            onComplete={() => setEditingId(null)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <div
                            onClick={() => !transaction.synced_to_sheets && setEditingId(transaction.id)}
                            className={`cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 ${
                              !transaction.synced_to_sheets ? '' : 'cursor-not-allowed'
                            }`}
                          >
                            {transaction.usage_description ? (
                              <span className="text-gray-900">
                                {transaction.usage_description}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">
                                클릭하여 입력...
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getMatchStatusColor(transaction.match_status)}>
                          {getMatchStatusLabel(transaction.match_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMatchModal(transaction)}
                          disabled={transaction.synced_to_sheets}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 수동 매칭 모달 */}
      <Modal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        title="사용내역 입력"
        size="md"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            {/* 거래 정보 */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">거래일</span>
                <span className="text-sm font-medium">
                  {formatDate(selectedTransaction.transaction_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">가맹점</span>
                <span className="text-sm font-medium">
                  {selectedTransaction.merchant_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">금액</span>
                <span className="text-sm font-medium">
                  {formatCurrency(selectedTransaction.amount)}
                </span>
              </div>
              {selectedTransaction.industry && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">업종</span>
                  <span className="text-sm font-medium">
                    {selectedTransaction.industry}
                  </span>
                </div>
              )}
            </div>

            {/* 사용내역 입력 */}
            <Input
              label="사용내역"
              value={usageDescription}
              onChange={(e) => setUsageDescription(e.target.value)}
              placeholder="예: 점심 식대, 업무용 교통비"
              required
            />

            {/* 빠른 입력 버튼 */}
            <div>
              <p className="text-sm text-gray-500 mb-2">빠른 입력</p>
              <div className="flex flex-wrap gap-2">
                {['식비', '교통비', '회의비', '접대비', '소모품비', '유류비'].map((desc) => (
                  <button
                    key={desc}
                    onClick={() => setUsageDescription(desc)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {desc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsMatchModalOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleMatch}
            isLoading={matchTransaction.isPending}
            disabled={!usageDescription}
          >
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 일괄 매칭 모달 */}
      <BatchMatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        transactions={selectedTransactions}
        onComplete={handleBatchComplete}
      />
    </div>
  );
}
