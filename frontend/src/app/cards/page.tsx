'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useCards, useUsers, useUpdateCard } from '@/hooks/useApi';
import { CreditCard, Plus, Edit, UserPlus, Eye } from 'lucide-react';
import { getCardTypeLabel } from '@/lib/utils';
import type { Card as CardType } from '@/types';

export default function CardsPage() {
  const router = useRouter();
  const { data: cards, isLoading } = useCards(false); // 전체 조회
  const { data: users } = useUsers();
  const updateCard = useUpdateCard();

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // 편집 폼 상태
  const [editForm, setEditForm] = useState({
    card_name: '',
    sheet_name: '',
  });

  // 사용자 할당 상태
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // 편집 모달 열기
  const openEditModal = (card: CardType) => {
    setSelectedCard(card);
    setEditForm({
      card_name: card.card_name,
      sheet_name: card.sheet_name || '',
    });
    setIsEditModalOpen(true);
  };

  // 사용자 할당 모달 열기
  const openAssignModal = (card: CardType) => {
    setSelectedCard(card);
    setSelectedUserId(card.user_id || null);
    setIsAssignModalOpen(true);
  };

  // 카드 정보 수정
  const handleUpdate = () => {
    if (!selectedCard) return;

    updateCard.mutate(
      { id: selectedCard.id, data: editForm },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedCard(null);
        },
      }
    );
  };

  // 사용자 할당
  const handleAssign = () => {
    if (!selectedCard) return;

    updateCard.mutate(
      { id: selectedCard.id, data: { user_id: selectedUserId } },
      {
        onSuccess: () => {
          setIsAssignModalOpen(false);
          setSelectedCard(null);
        },
      }
    );
  };

  const getCardTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      personal: 'bg-blue-100 text-blue-800',
      shared: 'bg-green-100 text-green-800',
      vehicle: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen">
      <Header title="카드 관리" />

      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              법인카드 목록
            </CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              카드 등록
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카드번호</TableHead>
                    <TableHead>카드명</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>소유자</TableHead>
                    <TableHead>시트명</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards?.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono">
                        **** {card.card_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {card.card_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCardTypeColor(card.card_type)}>
                          {getCardTypeLabel(card.card_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {card.user_id ? (
                          <span className="text-gray-900">
                            {users?.find(u => u.id === card.user_id)?.name || '-'}
                          </span>
                        ) : (
                          <span className="text-gray-400">미배정</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {card.sheet_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={card.is_active ? 'success' : 'default'}>
                          {card.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/cards/${card.id}`)}
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssignModal(card)}
                            title="사용자 할당"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(card)}
                            title="편집"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 편집 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="카드 정보 수정"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="카드명"
            value={editForm.card_name}
            onChange={(e) => setEditForm({ ...editForm, card_name: e.target.value })}
          />
          <Input
            label="시트명"
            value={editForm.sheet_name}
            onChange={(e) => setEditForm({ ...editForm, sheet_name: e.target.value })}
            helperText="Google Sheets 시트명"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            취소
          </Button>
          <Button onClick={handleUpdate} isLoading={updateCard.isPending}>
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 사용자 할당 모달 */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="사용자 할당"
        description={`${selectedCard?.card_name} 카드에 사용자를 할당합니다.`}
        size="md"
      >
        <div className="space-y-3">
          <button
            onClick={() => setSelectedUserId(null)}
            className={`w-full p-3 text-left rounded-lg border transition-colors ${
              selectedUserId === null
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium text-gray-900">미배정</p>
            <p className="text-sm text-gray-500">사용자 할당 해제</p>
          </button>
          {users?.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full p-3 text-left rounded-lg border transition-colors ${
                selectedUserId === user.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">
                {user.department} / {user.position}
              </p>
            </button>
          ))}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
            취소
          </Button>
          <Button onClick={handleAssign} isLoading={updateCard.isPending}>
            할당
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
