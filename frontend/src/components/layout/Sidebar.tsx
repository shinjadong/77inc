'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Tag,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '분석', href: '/analytics', icon: BarChart3 },
  { name: '카드 관리', href: '/cards', icon: CreditCard },
  { name: '사용자 관리', href: '/users', icon: Users },
  { name: '업로드', href: '/upload', icon: Upload },
  { name: '거래 내역', href: '/transactions', icon: FileText },
  { name: '패턴 관리', href: '/patterns', icon: Tag },
  { name: 'Excel 내보내기', href: '/export', icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 페이지 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ESC 키로 모바일 메뉴 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'flex flex-col bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300',
          // 데스크탑
          'hidden md:flex',
          collapsed ? 'w-16' : 'w-64',
          // 모바일
          mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-64'
        )}
      >
        {/* 로고 영역 */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-bold">칠칠기업</span>
          )}
          {/* 데스크탑 접기 버튼 */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          {/* 모바일 닫기 버튼 */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 하단 정보 */}
        {(!collapsed || mobileOpen) && (
          <div className="p-4 border-t border-gray-800 space-y-3">
            <ThemeToggle />
            <div>
              <p className="text-xs text-gray-500">법인카드 관리 시스템</p>
              <p className="text-xs text-gray-500">v2.1.0</p>
            </div>
          </div>
        )}
      </aside>

      {/* 모바일 전용 사이드바 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 dark:bg-gray-950 text-white w-64 transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 로고 영역 */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          <span className="text-lg font-bold">칠칠기업</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 정보 */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <ThemeToggle />
          <div>
            <p className="text-xs text-gray-500">법인카드 관리 시스템</p>
            <p className="text-xs text-gray-500">v2.1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
