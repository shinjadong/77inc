'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatSidebarContextValue {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  selectedTransactionIds: number[];
  setSelectedTransactions: (ids: number[]) => void;
  clearSelection: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue | null>(null);

export function ChatSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setSelectedTransactions = useCallback((ids: number[]) => {
    setSelectedTransactionIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds([]);
  }, []);

  return (
    <ChatSidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        selectedTransactionIds,
        setSelectedTransactions,
        clearSelection,
      }}
    >
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar() {
  const context = useContext(ChatSidebarContext);
  if (!context) {
    throw new Error('useChatSidebar must be used within ChatSidebarProvider');
  }
  return context;
}
