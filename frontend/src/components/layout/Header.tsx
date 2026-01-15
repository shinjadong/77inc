'use client';

import { Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* 왼쪽: 페이지 제목 */}
      <div className="ml-12 md:ml-0">
        {title && <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>}
      </div>

      {/* 오른쪽: 검색 및 액션 */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* 검색 (데스크탑만) */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 검색 버튼 (모바일) */}
        <button className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Search className="h-5 w-5" />
        </button>

        {/* 알림 */}
        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 사용자 메뉴 */}
        <button className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">관리자</span>
        </button>
      </div>
    </header>
  );
}
