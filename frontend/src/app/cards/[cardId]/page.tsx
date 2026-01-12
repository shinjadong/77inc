'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { cardsApi } from '@/lib/api';
import {
  CreditCard, ArrowLeft, Download, RefreshCw, Search,
  FileText, CheckCircle, Clock, Trash2, Plus
} from 'lucide-react';
import type { Transaction, Pattern, Card as CardType } from '@/types';

interface CardStats {
  card_number: string;
  card_name: string;
  total_transactions: number;
  matched: number;
  pending: number;
  match_rate: number;
  monthly: Array<{ year: number; month: number; count: number; total_amount: number }>;
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = Number(params.cardId);

  const [card, setCard] = useState<CardType | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'patterns'>('transactions');

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 모달 상태
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [matchInput, setMatchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{
    pattern_id: number;
    merchant_name: string;
    usage_description: string;
    score: number;
  }>>([]);

  // 패턴 추가 상태
  const [newPattern, setNewPattern] = useState({ merchant_name: '', usage_description: '' });

  // 데이터 로드
  useEffect(() => {
    if (cardId) {
      loadCardData();
    }
  }, [cardId]);

  const loadCardData = async () => {
    try {
      setLoading(true);
      const cardData = await cardsApi.getById(cardId);
      if (!cardData) {
        setCard(null);
        return;
      }
      setCard(cardData);

      // 통계 로드
      const statsData = await cardsApi.getStats(cardData.card_number);
      setStats(statsData);

      // 거래 목록 로드
      await loadTransactions();

      // 패턴 목록 로드
      const patternsData = await cardsApi.getPatterns(cardId);
      setPatterns(patternsData.patterns || []);
    } catch (error) {
      console.error('Failed to load card data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const result = await cardsApi.getTransactions(cardId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      });
      setTransactions(result.transactions);
      setTotalTransactions(result.total);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // 필터 변경시 다시 로드
  useEffect(() => {
    if (cardId) {
      loadTransactions();
    }
  }, [statusFilter]);

  // 매칭 모달 열기
  const openMatchModal = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setMatchInput('');
    setIsMatchModalOpen(true);

    // 패턴 제안 조회
    try {
      const result = await cardsApi.suggestPattern(cardId, transaction.merchant_name);
      setSuggestions(result.suggestions || []);
    } catch (error) {
      setSuggestions([]);
    }
  };

  // 매칭 적용
  const handleMatch = async () => {
    if (!selectedTransaction || !matchInput) return;

    try {
      await cardsApi.matchTransaction(cardId, selectedTransaction.id, matchInput, true);
      setIsMatchModalOpen(false);
      loadTransactions();
      loadCardData();
    } catch (error) {
      console.error('Failed to match transaction:', error);
    }
  };

  // 제안 선택
  const selectSuggestion = (suggestion: typeof suggestions[0]) => {
    setMatchInput(suggestion.usage_description);
  };

  // 재매칭 실행
  const handleRematch = async () => {
    try {
      const result = await cardsApi.rematch(cardId);
      alert(`재매칭 완료: ${result.stats.matched}건 매칭됨`);
      loadTransactions();
      loadCardData();
    } catch (error) {
      console.error('Failed to rematch:', error);
    }
  };

  // Excel 다운로드
  const handleDownload = async () => {
    if (!card) return;
    try {
      await cardsApi.downloadExcel(card.card_number);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  // 패턴 추가
  const handleAddPattern = async () => {
    if (!newPattern.merchant_name || !newPattern.usage_description) return;

    try {
      await cardsApi.addPattern(cardId, newPattern.merchant_name, newPattern.usage_description);
      setIsPatternModalOpen(false);
      setNewPattern({ merchant_name: '', usage_description: '' });
      const patternsData = await cardsApi.getPatterns(cardId);
      setPatterns(patternsData.patterns || []);
    } catch (error) {
      console.error('Failed to add pattern:', error);
    }
  };

  // 패턴 삭제
  const handleDeletePattern = async (patternId: number) => {
    if (!confirm('이 패턴을 삭제하시겠습니까?')) return;

    try {
      await cardsApi.deletePattern(cardId, patternId);
      setPatterns(patterns.filter(p => p.id !== patternId));
    } catch (error) {
      console.error('Failed to delete pattern:', error);
    }
  };

  // 검색 필터
  const filteredTransactions = transactions.filter(t =>
    !searchTerm || t.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="카드 상세" />
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen">
        <Header title="카드 상세" />
        <div className="p-6">
          <p className="text-red-500">카드를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title={`카드 관리 - ${card.card_number}`} />

      <div className="p-6 space-y-6">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRematch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              재매칭
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Excel 다운로드
            </Button>
          </div>
        </div>

        {/* 카드 정보 & 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">카드번호</p>
                  <p className="text-xl font-bold">**** {card.card_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">전체 거래</p>
                  <p className="text-xl font-bold">{stats?.total_transactions || 0}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">매칭 완료</p>
                  <p className="text-xl font-bold text-green-600">{stats?.matched || 0}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">미매칭</p>
                  <p className="text-xl font-bold text-orange-600">{stats?.pending || 0}건</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 매칭률 프로그레스 바 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">매칭률</span>
              <span className="text-sm font-bold text-blue-600">{stats?.match_rate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${stats?.match_rate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 탭 */}
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'transactions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            거래내역 ({totalTransactions})
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'patterns'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('patterns')}
          >
            사용용도 패턴 ({patterns.length})
          </button>
        </div>

        {/* 거래내역 탭 */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>거래내역</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="가맹점 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">전체</option>
                  <option value="pending">미매칭</option>
                  <option value="matched">매칭완료</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>결제일자</TableHead>
                    <TableHead>가맹점명</TableHead>
                    <TableHead className="text-right">이용금액</TableHead>
                    <TableHead>사용용도</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-gray-500">
                        {tx.transaction_date}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.merchant_name}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.amount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        {tx.usage_description || (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.usage_description ? 'success' : 'warning'}>
                          {tx.usage_description ? '완료' : '대기'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMatchModal(tx)}
                        >
                          매칭
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 패턴 탭 */}
        {activeTab === 'patterns' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>사용용도 패턴</CardTitle>
              <Button size="sm" onClick={() => setIsPatternModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                패턴 추가
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>가맹점명</TableHead>
                    <TableHead>사용용도</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead className="text-center">사용횟수</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((pattern) => (
                    <TableRow key={pattern.id}>
                      <TableCell className="font-medium">
                        {pattern.merchant_name}
                      </TableCell>
                      <TableCell>{pattern.usage_description}</TableCell>
                      <TableCell>
                        <Badge variant={pattern.card_id ? 'default' : 'outline'}>
                          {pattern.card_id ? '카드전용' : '공통'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {pattern.use_count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {pattern.card_id === cardId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePattern(pattern.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 매칭 모달 */}
      <Modal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        title="사용용도 매칭"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">가맹점명</p>
            <p className="font-medium">{selectedTransaction?.merchant_name}</p>
            <p className="text-sm text-gray-500 mt-2">금액</p>
            <p className="font-medium">{selectedTransaction?.amount.toLocaleString()}원</p>
          </div>

          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">추천 사용용도</p>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s.pattern_id}
                    onClick={() => selectSuggestion(s)}
                    className={`w-full p-2 text-left rounded-lg border transition-colors ${
                      matchInput === s.usage_description
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-sm">{s.usage_description}</p>
                    <p className="text-xs text-gray-500">
                      {s.merchant_name} (유사도: {s.score}%)
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            label="사용용도"
            value={matchInput}
            onChange={(e) => setMatchInput(e.target.value)}
            placeholder="사용용도를 입력하세요"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsMatchModalOpen(false)}>
            취소
          </Button>
          <Button onClick={handleMatch} disabled={!matchInput}>
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 패턴 추가 모달 */}
      <Modal
        isOpen={isPatternModalOpen}
        onClose={() => setIsPatternModalOpen(false)}
        title="패턴 추가"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="가맹점명"
            value={newPattern.merchant_name}
            onChange={(e) => setNewPattern({ ...newPattern, merchant_name: e.target.value })}
            placeholder="가맹점명을 입력하세요"
          />
          <Input
            label="사용용도"
            value={newPattern.usage_description}
            onChange={(e) => setNewPattern({ ...newPattern, usage_description: e.target.value })}
            placeholder="사용용도를 입력하세요"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsPatternModalOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleAddPattern}
            disabled={!newPattern.merchant_name || !newPattern.usage_description}
          >
            추가
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
