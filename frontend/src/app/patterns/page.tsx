'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { usePatterns, usePatternStats, useCreatePattern, useCards } from '@/hooks/useApi';
import { Layers, Plus, Search, Zap, Hash, Type, Code } from 'lucide-react';
import type { Pattern, PatternCreate } from '@/types';

export default function PatternsPage() {
  const { data: patterns, isLoading } = usePatterns();
  const { data: stats } = usePatternStats();
  const { data: cards } = useCards();
  const createPattern = useCreatePattern();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 생성 폼 상태
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

  // 패턴 생성
  const handleCreate = () => {
    createPattern.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        resetForm();
      },
    });
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
      exact: 'bg-blue-100 text-blue-800',
      contains: 'bg-green-100 text-green-800',
      regex: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // 검색 필터링
  const filteredPatterns = patterns?.filter(
    (pattern) =>
      pattern.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.usage_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <p className="text-sm text-gray-500">전체 패턴</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.total || patterns?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Layers className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">정확 일치</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.by_type?.exact || patterns?.filter(p => p.match_type === 'exact').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Hash className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">포함</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.by_type?.contains || patterns?.filter(p => p.match_type === 'contains').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Type className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">정규식</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.by_type?.regex || patterns?.filter(p => p.match_type === 'regex').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Code className="h-6 w-6 text-purple-500" />
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="패턴 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
            {isLoading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : filteredPatterns?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 패턴이 없습니다.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>가맹점명</TableHead>
                    <TableHead>사용내역</TableHead>
                    <TableHead>매칭 타입</TableHead>
                    <TableHead>적용 카드</TableHead>
                    <TableHead className="text-center">우선순위</TableHead>
                    <TableHead className="text-center">사용 횟수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatterns?.map((pattern) => (
                    <TableRow key={pattern.id}>
                      <TableCell className="font-medium">
                        {pattern.merchant_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
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
                          <span className="text-gray-900">
                            {cards?.find(c => c.id === pattern.card_id)?.card_name || '-'}
                          </span>
                        ) : (
                          <span className="text-gray-400">전체</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{pattern.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-gray-500">
                        {pattern.use_count}회
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매칭 타입
            </label>
            <select
              value={formData.match_type}
              onChange={(e) => setFormData({ ...formData, match_type: e.target.value as 'exact' | 'contains' | 'regex' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="contains">포함 (권장)</option>
              <option value="exact">정확히 일치</option>
              <option value="regex">정규식</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              적용 카드
            </label>
            <select
              value={formData.card_id || ''}
              onChange={(e) => setFormData({ ...formData, card_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className={`p-4 rounded-lg ${
              testResult.match
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {testResult.match && testResult.pattern ? (
                <div>
                  <p className="font-medium text-green-800">매칭 성공!</p>
                  <div className="mt-2 text-sm text-green-700">
                    <p>패턴: {testResult.pattern.merchant_name}</p>
                    <p>사용내역: {testResult.pattern.usage_description}</p>
                    <p>타입: {getMatchTypeLabel(testResult.pattern.match_type)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-yellow-800">매칭되는 패턴이 없습니다.</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    새 패턴을 등록하면 자동 매칭됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => {
            setIsTestModalOpen(false);
            setTestMerchant('');
            setTestResult(null);
          }}>
            닫기
          </Button>
          <Button
            onClick={() => {
              // 간단한 클라이언트 사이드 테스트 (실제로는 API 호출)
              const match = patterns?.find(p => {
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
