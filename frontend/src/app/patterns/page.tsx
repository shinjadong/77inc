'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  usePatterns,
  usePatternStats,
  useCreatePattern,
  useUpdatePattern,
  useDeletePattern,
  useBulkDeletePatterns,
  useCards,
} from '@/hooks/useApi';
import {
  Layers,
  Plus,
  Search,
  Zap,
  Hash,
  Type,
  Code,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { Pattern, PatternCreate, PatternUpdate, PatternFilter } from '@/types';

export default function PatternsPage() {
  const { data: patterns, isLoading } = usePatterns();
  const { data: stats } = usePatternStats();
  const { data: cards } = useCards();
  const createPattern = useCreatePattern();
  const updatePattern = useUpdatePattern();
  const deletePattern = useDeletePattern();
  const bulkDeletePatterns = useBulkDeletePatterns();

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // 선택 상태
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 필터 상태
  const [filter, setFilter] = useState<PatternFilter>({
    match_type: 'all',
    card_id: 'all',
    search: '',
    sortBy: 'use_count',
    sortOrder: 'desc',
  });

  // 페이지네이션
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 폼 상태
  const [formData, setFormData] = useState<PatternCreate>({
    merchant_name: '',
    usage_description: '',
    card_id: undefined,
    match_type: 'contains',
    priority: 1,
  });

  // 테스트 폼 상태
  const [testMerchant, setTestMerchant] = useState('');
  const [testResult, setTestResult] = useState<{ match: boolean; pattern?: Pattern } | null>(null);

  // 필터링 및 정렬
  const filteredPatterns = useMemo(() => {
    if (!patterns) return [];

    let result = [...patterns];

    // 검색 필터
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.merchant_name.toLowerCase().includes(searchLower) ||
          p.usage_description.toLowerCase().includes(searchLower)
      );
    }

    // 매칭 타입 필터
    if (filter.match_type && filter.match_type !== 'all') {
      result = result.filter((p) => p.match_type === filter.match_type);
    }

    // 카드 필터
    if (filter.card_id !== 'all') {
      if (filter.card_id === 0) {
        result = result.filter((p) => p.card_id === null);
      } else if (typeof filter.card_id === 'number') {
        result = result.filter((p) => p.card_id === filter.card_id);
      }
    }

    // 정렬
    const sortKey = filter.sortBy || 'use_count';
    const sortAsc = filter.sortOrder === 'asc';
    result.sort((a, b) => {
      const aVal = a[sortKey as keyof Pattern];
      const bVal = b[sortKey as keyof Pattern];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

    return result;
  }, [patterns, filter]);

  // 페이지네이션된 데이터
  const paginatedPatterns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPatterns.slice(start, start + pageSize);
  }, [filteredPatterns, page]);

  const totalPages = Math.ceil(filteredPatterns.length / pageSize);

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      merchant_name: '',
      usage_description: '',
      card_id: undefined,
      match_type: 'contains',
      priority: 1,
    });
  };

  // 생성 모달 열기
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // 편집 모달 열기
  const openEditModal = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setFormData({
      merchant_name: pattern.merchant_name,
      usage_description: pattern.usage_description,
      card_id: pattern.card_id || undefined,
      match_type: pattern.match_type,
      priority: pattern.priority,
    });
    setIsEditModalOpen(true);
  };

  // 삭제 확인 열기
  const openDeleteConfirm = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setIsDeleteConfirmOpen(true);
  };

  // 패턴 생성
  const handleCreate = () => {
    createPattern.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        resetForm();
      },
    });
  };

  // 패턴 수정
  const handleUpdate = () => {
    if (!selectedPattern) return;
    const updateData: PatternUpdate = {
      merchant_name: formData.merchant_name,
      usage_description: formData.usage_description,
      card_id: formData.card_id || null,
      match_type: formData.match_type,
      priority: formData.priority,
    };
    updatePattern.mutate(
      { id: selectedPattern.id, data: updateData },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedPattern(null);
          resetForm();
        },
      }
    );
  };

  // 패턴 삭제
  const handleDelete = () => {
    if (!selectedPattern) return;
    deletePattern.mutate(selectedPattern.id, {
      onSuccess: () => {
        setIsDeleteConfirmOpen(false);
        setSelectedPattern(null);
      },
    });
  };

  // 일괄 삭제
  const handleBulkDelete = () => {
    bulkDeletePatterns.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setIsBulkDeleteConfirmOpen(false);
        setSelectedIds(new Set());
      },
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedPatterns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPatterns.map((p) => p.id)));
    }
  };

  // 개별 선택/해제
  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 필터 초기화
  const resetFilter = () => {
    setFilter({
      match_type: 'all',
      card_id: 'all',
      search: '',
      sortBy: 'use_count',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  // 매칭 타입 라벨
  const getMatchTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      exact: '정확히 일치',
      contains: '포함',
      regex: '정규식',
    };
    return labels[type] || type;
  };

  // 매칭 타입 아이콘
  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case 'exact':
        return <Hash className="h-4 w-4" />;
      case 'contains':
        return <Type className="h-4 w-4" />;
      case 'regex':
        return <Code className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // 매칭 타입 색상
  const getMatchTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      exact: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      contains: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      regex: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen">
      <Header title="패턴 관리" />

      <div className="p-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">전체 패턴</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.total || patterns?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">정확 일치</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.by_type?.exact || patterns?.filter((p) => p.match_type === 'exact').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Hash className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">포함</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats?.by_type?.contains || patterns?.filter((p) => p.match_type === 'contains').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <Type className="h-6 w-6 text-green-500 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">정규식</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats?.by_type?.regex || patterns?.filter((p) => p.match_type === 'regex').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <Code className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 패턴 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              매칭 패턴 목록
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => setIsTestModalOpen(true)}>
                <Zap className="h-4 w-4 mr-1" />
                테스트
              </Button>
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-1" />
                패턴 등록
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 필터 영역 */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
              {/* 검색 */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="패턴 검색..."
                  value={filter.search}
                  onChange={(e) => {
                    setFilter({ ...filter, search: e.target.value });
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 매칭 타입 필터 */}
              <select
                value={filter.match_type}
                onChange={(e) => {
                  setFilter({ ...filter, match_type: e.target.value as PatternFilter['match_type'] });
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">전체 타입</option>
                <option value="exact">정확 일치</option>
                <option value="contains">포함</option>
                <option value="regex">정규식</option>
              </select>

              {/* 카드 필터 */}
              <select
                value={filter.card_id === 'all' ? 'all' : String(filter.card_id)}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilter({
                    ...filter,
                    card_id: val === 'all' ? 'all' : val === '0' ? 0 : Number(val),
                  });
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">전체 카드</option>
                <option value="0">공통 패턴</option>
                {cards?.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.card_name}
                  </option>
                ))}
              </select>

              {/* 정렬 */}
              <select
                value={`${filter.sortBy}-${filter.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilter({
                    ...filter,
                    sortBy: sortBy as PatternFilter['sortBy'],
                    sortOrder: sortOrder as PatternFilter['sortOrder'],
                  });
                }}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="use_count-desc">사용 횟수 (높은순)</option>
                <option value="use_count-asc">사용 횟수 (낮은순)</option>
                <option value="priority-desc">우선순위 (높은순)</option>
                <option value="priority-asc">우선순위 (낮은순)</option>
                <option value="merchant_name-asc">가맹점명 (ㄱ-ㅎ)</option>
                <option value="merchant_name-desc">가맹점명 (ㅎ-ㄱ)</option>
              </select>

              {/* 초기화 */}
              <Button variant="outline" size="sm" onClick={resetFilter}>
                <RefreshCw className="h-4 w-4 mr-1" />
                초기화
              </Button>
            </div>

            {/* 일괄 작업 바 */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  {selectedIds.size}개 선택됨
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  일괄 삭제
                </Button>
              </div>
            )}

            {/* 테이블 */}
            {isLoading ? (
              <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
            ) : filteredPatterns.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {filter.search || filter.match_type !== 'all' || filter.card_id !== 'all'
                  ? '검색 결과가 없습니다.'
                  : '등록된 패턴이 없습니다.'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === paginatedPatterns.length && paginatedPatterns.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </TableHead>
                      <TableHead>가맹점명</TableHead>
                      <TableHead>사용내역</TableHead>
                      <TableHead>매칭 타입</TableHead>
                      <TableHead>적용 카드</TableHead>
                      <TableHead className="text-center">우선순위</TableHead>
                      <TableHead className="text-center">사용 횟수</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatterns.map((pattern) => (
                      <TableRow key={pattern.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pattern.id)}
                            onChange={() => toggleSelect(pattern.id)}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{pattern.merchant_name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {pattern.usage_description}
                        </TableCell>
                        <TableCell>
                          <Badge className={getMatchTypeColor(pattern.match_type)}>
                            <span className="flex items-center gap-1">
                              {getMatchTypeIcon(pattern.match_type)}
                              {getMatchTypeLabel(pattern.match_type)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pattern.card_id ? (
                            <span className="text-gray-900 dark:text-gray-100">
                              {cards?.find((c) => c.id === pattern.card_id)?.card_name || '-'}
                            </span>
                          ) : (
                            <span className="text-gray-400">전체</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{pattern.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-gray-500 dark:text-gray-400">
                          {pattern.use_count}회
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(pattern)}
                              title="편집"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(pattern)}
                              title="삭제"
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 페이지네이션 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    총 {filteredPatterns.length}개 중 {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, filteredPatterns.length)}개 표시
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {page} / {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 생성 모달 */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="패턴 등록"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="가맹점명 패턴"
            value={formData.merchant_name}
            onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
            placeholder="예: 스타벅스, CU편의점"
            required
          />
          <Input
            label="사용내역"
            value={formData.usage_description}
            onChange={(e) => setFormData({ ...formData, usage_description: e.target.value })}
            placeholder="예: 식비, 교통비"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              매칭 타입
            </label>
            <select
              value={formData.match_type}
              onChange={(e) =>
                setFormData({ ...formData, match_type: e.target.value as 'exact' | 'contains' | 'regex' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="contains">포함 (권장)</option>
              <option value="exact">정확히 일치</option>
              <option value="regex">정규식</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              적용 카드
            </label>
            <select
              value={formData.card_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, card_id: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카드</option>
              {cards?.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.card_name} (**** {card.card_number})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="우선순위"
            type="number"
            value={String(formData.priority || 1)}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            min={1}
            max={10}
            helperText="1-10 사이 값 (높을수록 우선)"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={createPattern.isPending}
            disabled={!formData.merchant_name || !formData.usage_description}
          >
            등록
          </Button>
        </ModalFooter>
      </Modal>

      {/* 편집 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPattern(null);
          resetForm();
        }}
        title="패턴 수정"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="가맹점명 패턴"
            value={formData.merchant_name}
            onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
            placeholder="예: 스타벅스, CU편의점"
            required
          />
          <Input
            label="사용내역"
            value={formData.usage_description}
            onChange={(e) => setFormData({ ...formData, usage_description: e.target.value })}
            placeholder="예: 식비, 교통비"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              매칭 타입
            </label>
            <select
              value={formData.match_type}
              onChange={(e) =>
                setFormData({ ...formData, match_type: e.target.value as 'exact' | 'contains' | 'regex' })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="contains">포함 (권장)</option>
              <option value="exact">정확히 일치</option>
              <option value="regex">정규식</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              적용 카드
            </label>
            <select
              value={formData.card_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, card_id: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카드</option>
              {cards?.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.card_name} (**** {card.card_number})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="우선순위"
            type="number"
            value={String(formData.priority || 1)}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
            min={1}
            max={10}
            helperText="1-10 사이 값 (높을수록 우선)"
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditModalOpen(false);
              setSelectedPattern(null);
              resetForm();
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleUpdate}
            isLoading={updatePattern.isPending}
            disabled={!formData.merchant_name || !formData.usage_description}
          >
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedPattern(null);
        }}
        onConfirm={handleDelete}
        title="패턴 삭제"
        message={`"${selectedPattern?.merchant_name}" 패턴을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="danger"
        isLoading={deletePattern.isPending}
      />

      {/* 일괄 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="일괄 삭제"
        message={`선택한 ${selectedIds.size}개의 패턴을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="danger"
        isLoading={bulkDeletePatterns.isPending}
      />

      {/* 테스트 모달 */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setTestMerchant('');
          setTestResult(null);
        }}
        title="패턴 매칭 테스트"
        description="가맹점명을 입력하면 어떤 패턴에 매칭되는지 확인할 수 있습니다."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="가맹점명"
            value={testMerchant}
            onChange={(e) => setTestMerchant(e.target.value)}
            placeholder="예: 스타벅스 강남점"
          />

          {testResult && (
            <div
              className={`p-4 rounded-lg ${
                testResult.match
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}
            >
              {testResult.match && testResult.pattern ? (
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">매칭 성공!</p>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                    <p>패턴: {testResult.pattern.merchant_name}</p>
                    <p>사용내역: {testResult.pattern.usage_description}</p>
                    <p>타입: {getMatchTypeLabel(testResult.pattern.match_type)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">매칭되는 패턴이 없습니다.</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    새 패턴을 등록하면 자동 매칭됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsTestModalOpen(false);
              setTestMerchant('');
              setTestResult(null);
            }}
          >
            닫기
          </Button>
          <Button
            onClick={() => {
              const match = patterns?.find((p) => {
                if (p.match_type === 'exact') {
                  return p.merchant_name === testMerchant;
                } else if (p.match_type === 'contains') {
                  return testMerchant.includes(p.merchant_name);
                } else if (p.match_type === 'regex') {
                  try {
                    return new RegExp(p.merchant_name).test(testMerchant);
                  } catch {
                    return false;
                  }
                }
                return false;
              });
              setTestResult({ match: !!match, pattern: match });
            }}
            disabled={!testMerchant}
          >
            테스트
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
