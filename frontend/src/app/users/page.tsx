'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useApi';
import { Users, Plus, Edit, CreditCard } from 'lucide-react';
import type { User, UserCreate, UserUpdate } from '@/types';

export default function UsersPage() {
  const { data: users, isLoading } = useUsers(false); // 전체 조회
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<UserCreate>({
    name: '',
    employee_id: '',
    department: '',
    position: '',
    phone: '',
    email: '',
  });

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      name: '',
      employee_id: '',
      department: '',
      position: '',
      phone: '',
      email: '',
    });
  };

  // 생성 모달 열기
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // 편집 모달 열기
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      employee_id: user.employee_id || '',
      department: user.department || '',
      position: user.position || '',
      phone: user.phone || '',
      email: user.email || '',
    });
    setIsEditModalOpen(true);
  };

  // 사용자 생성
  const handleCreate = () => {
    createUser.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        resetForm();
      },
    });
  };

  // 사용자 수정
  const handleUpdate = () => {
    if (!selectedUser) return;

    const updateData: UserUpdate = {
      name: formData.name,
      employee_id: formData.employee_id || undefined,
      department: formData.department || undefined,
      position: formData.position || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    };

    updateUser.mutate(
      { id: selectedUser.id, data: updateData },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          resetForm();
        },
      }
    );
  };

  // 폼 입력 처리
  const handleInputChange = (field: keyof UserCreate, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen">
      <Header title="사용자 관리" />

      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              사용자 목록
            </CardTitle>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" />
              사용자 등록
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>사번</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>직책</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>카드</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {user.employee_id || '-'}
                      </TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>{user.position || '-'}</TableCell>
                      <TableCell className="text-gray-500">
                        {user.phone || '-'}
                      </TableCell>
                      <TableCell>
                        {user.card_count && user.card_count > 0 ? (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span>{user.card_count}장</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'success' : 'default'}>
                          {user.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
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

      {/* 생성 모달 */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="사용자 등록"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="이름"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="사번"
              value={formData.employee_id}
              onChange={(e) => handleInputChange('employee_id', e.target.value)}
            />
            <Input
              label="부서"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="직책"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
            />
            <Input
              label="전화번호"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
          <Input
            label="이메일"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={createUser.isPending}
            disabled={!formData.name}
          >
            등록
          </Button>
        </ModalFooter>
      </Modal>

      {/* 편집 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="사용자 정보 수정"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="이름"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="사번"
              value={formData.employee_id}
              onChange={(e) => handleInputChange('employee_id', e.target.value)}
            />
            <Input
              label="부서"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="직책"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
            />
            <Input
              label="전화번호"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
          <Input
            label="이메일"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleUpdate}
            isLoading={updateUser.isPending}
            disabled={!formData.name}
          >
            저장
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
