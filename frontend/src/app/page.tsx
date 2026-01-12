'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCards, useUsers, useSessions, usePatterns } from '@/hooks/useApi';
import {
  CreditCard,
  Users,
  FileText,
  Layers,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { formatNumber, formatDateTime, getSessionStatusLabel, getSessionStatusColor } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: cards, isLoading: cardsLoading } = useCards();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: patterns, isLoading: patternsLoading } = usePatterns();

  const isLoading = cardsLoading || usersLoading || sessionsLoading || patternsLoading;

  // 통계 계산
  const stats = [
    {
      name: '등록된 카드',
      value: cards?.length || 0,
      icon: CreditCard,
      color: 'text-blue-600 bg-blue-100',
      href: '/cards',
    },
    {
      name: '등록된 사용자',
      value: users?.length || 0,
      icon: Users,
      color: 'text-green-600 bg-green-100',
      href: '/users',
    },
    {
      name: '업로드 세션',
      value: sessions?.length || 0,
      icon: FileText,
      color: 'text-purple-600 bg-purple-100',
      href: '/upload',
    },
    {
      name: '매칭 패턴',
      value: patterns?.length || 0,
      icon: Layers,
      color: 'text-orange-600 bg-orange-100',
      href: '/patterns',
    },
  ];

  // 최근 세션 (최대 5개)
  const recentSessions = sessions?.slice(0, 5) || [];

  // 카드별 사용자 현황
  const cardsByType = {
    personal: cards?.filter(c => c.card_type === 'personal').length || 0,
    shared: cards?.filter(c => c.card_type === 'shared').length || 0,
    vehicle: cards?.filter(c => c.card_type === 'vehicle').length || 0,
  };

  return (
    <div className="min-h-screen">
      <Header title="대시보드" />

      <div className="p-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {isLoading ? '-' : formatNumber(stat.value)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 업로드 세션 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                최근 업로드
              </CardTitle>
              <Link
                href="/upload"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                전체 보기
              </Link>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <p className="text-gray-500 text-sm">로딩 중...</p>
              ) : recentSessions.length === 0 ? (
                <p className="text-gray-500 text-sm">업로드 내역이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {session.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(session.upload_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <p className="text-gray-500">
                            총 {session.total_transactions}건
                          </p>
                          <p className="text-green-600">
                            매칭 {session.matched_count}건
                          </p>
                        </div>
                        <Badge
                          className={getSessionStatusColor(session.status)}
                        >
                          {getSessionStatusLabel(session.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 카드 현황 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-500" />
                카드 현황
              </CardTitle>
              <Link
                href="/cards"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                전체 보기
              </Link>
            </CardHeader>
            <CardContent>
              {cardsLoading ? (
                <p className="text-gray-500 text-sm">로딩 중...</p>
              ) : (
                <div className="space-y-4">
                  {/* 카드 타입별 현황 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {cardsByType.personal}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">개인 카드</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {cardsByType.shared}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">공용 카드</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {cardsByType.vehicle}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">차량 카드</p>
                    </div>
                  </div>

                  {/* 카드 목록 */}
                  <div className="space-y-2">
                    {cards?.slice(0, 5).map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {card.card_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              **** {card.card_number}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={card.is_active ? 'success' : 'default'}
                        >
                          {card.is_active ? '활성' : '비활성'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
