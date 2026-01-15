'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, cardsApi, transactionsApi, patternsApi, sessionsApi, uploadApi } from '@/lib/api';
import type { UserCreate, UserUpdate, CardCreate, CardUpdate, PatternCreate, PatternUpdate } from '@/types';

// ============ Users Hooks ============
export function useUsers(activeOnly = true) {
  return useQuery({
    queryKey: ['users', { activeOnly }],
    queryFn: () => usersApi.getAll(activeOnly),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useUserCards(userId: number) {
  return useQuery({
    queryKey: ['users', userId, 'cards'],
    queryFn: () => usersApi.getCards(userId),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) => usersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ============ Cards Hooks ============
export function useCards(activeOnly = true) {
  return useQuery({
    queryKey: ['cards', { activeOnly }],
    queryFn: () => cardsApi.getAll(activeOnly),
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: ['cards', id],
    queryFn: () => cardsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CardCreate) => cardsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CardUpdate }) => cardsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards', variables.id] });
    },
  });
}

// ============ Transactions Hooks ============
export function useTransactions(params?: { card_id?: number; status?: string }) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionsApi.getAll(params),
  });
}

export function usePendingTransactions(cardId?: number) {
  return useQuery({
    queryKey: ['transactions', 'pending', cardId],
    queryFn: () => transactionsApi.getPending(cardId),
  });
}

export function useMatchTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, usageDescription }: { id: number; usageDescription: string }) =>
      transactionsApi.match(id, usageDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ============ Patterns Hooks ============
export function usePatterns() {
  return useQuery({
    queryKey: ['patterns'],
    queryFn: () => patternsApi.getAll(),
  });
}

export function usePatternStats() {
  return useQuery({
    queryKey: ['patterns', 'stats'],
    queryFn: () => patternsApi.getStats(),
  });
}

export function useCreatePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PatternCreate) => patternsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

export function useUpdatePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatternUpdate }) =>
      patternsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

export function useDeletePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => patternsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

export function useBulkDeletePatterns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => patternsApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

// ============ Sessions Hooks ============
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.getAll(),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => sessionsApi.getById(id),
    enabled: !!id,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// ============ Upload Hooks ============
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadApi.uploadFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
