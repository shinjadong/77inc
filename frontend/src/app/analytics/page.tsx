'use client';

import { useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MonthlySpendingChart } from '@/components/charts/MonthlySpendingChart';
import { CardDistributionChart } from '@/components/charts/CardDistributionChart';
import { MatchingStatusChart } from '@/components/charts/MatchingStatusChart';
import { IndustryChart } from '@/components/charts/IndustryChart';
import { useTransactions, useCards } from '@/hooks/useApi';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  Zap,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data: transactions, isLoading } = useTransactions({});
  const { data: cards } = useCards();

  // 월별 데이터 집계
  const monthlyData = useMemo(() => {
    if (!transactions) return [];

    const monthly: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

      if (!monthly[monthKey]) {
        monthly[monthKey] = { amount: 0, count: 0 };
      }
      monthly[monthKey].amount += tx.amount;
      monthly[monthKey].count += 1;
    });

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        return {
          month: `${month}월`,
          amount: value.amount,
          count: value.count,
        };
      });
  }, [transactions]);

  // 카드별 데이터 집계
  const cardData = useMemo(() => {
    if (!transactions || !cards) return [];

    const byCard: Record<number, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      if (!byCard[tx.card_id]) {
        byCard[tx.card_id] = { amount: 0, count: 0 };
      }
      byCard[tx.card_id].amount += tx.amount;
      byCard[tx.card_id].count += 1;
    });

    return cards.map((card) => ({
      name: card.card_name,
      amount: byCard[card.id]?.amount || 0,
      count: byCard[card.id]?.count || 0,
    })).filter((item) => item.amount > 0);
  }, [transactions, cards]);

  // 매칭 상태 데이터
  const matchingData = useMemo(() => {
    if (!transactions) return [];

    const counts = { pending: 0, auto: 0, manual: 0 };
    transactions.forEach((tx) => {
      counts[tx.match_status as keyof typeof counts]++;
    });

    return [
      { status: 'auto', label: '자동 매칭', count: counts.auto, color: '#10b981' },
      { status: 'manual', label: '수동 매칭', count: counts.manual, color: '#3b82f6' },
      { status: 'pending', label: '대기중', count: counts.pending, color: '#f59e0b' },
    ];
  }, [transactions]);

  // 업종별 데이터 집계
  const industryData = useMemo(() => {
    if (!transactions) return [];

    const byIndustry: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      const industry = tx.industry || '기타';
      if (!byIndustry[industry]) {
        byIndustry[industry] = { amount: 0, count: 0 };
      }
      byIndustry[industry].amount += tx.amount;
      byIndustry[industry].count += 1;
    });

    return Object.entries(byIndustry)
      .map(([industry, data]) => ({
        industry,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // 통계 계산
  const stats = useMemo(() => {
    if (!transactions) {
      return {
        totalAmount: 0,
        totalCount: 0,
        avgAmount: 0,
        matchRate: 0,
        pendingCount: 0,
        thisMonthAmount: 0,
        lastMonthAmount: 0,
        monthChange: 0,
      };
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCount = transactions.length;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const pendingCount = transactions.filter((tx) => tx.match_status === 'pending').length;
    const matchedCount = totalCount - pendingCount;
    const matchRate = totalCount > 0 ? (matchedCount / totalCount) * 100 : 0;

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`;

    let thisMonthAmount = 0;
    let lastMonthAmount = 0;

    transactions.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthKey === thisMonth) {
        thisMonthAmount += tx.amount;
      } else if (monthKey === lastMonth) {
        lastMonthAmount += tx.amount;
      }
    });

    const monthChange = lastMonthAmount > 0
      ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100
      : 0;

    return {
      totalAmount,
      totalCount,
      avgAmount,
      matchRate,
      pendingCount,
      thisMonthAmount,
      lastMonthAmount,
      monthChange,
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="분석" />
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="분석" />

      <div className="p-6 space-y-6">
        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 총 지출 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">총 지출</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <Receipt className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-gray-500 dark:text-gray-400">{stats.totalCount}건</span>
              </div>
            </CardContent>
          </Card>

          {/* 이번 달 지출 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">이번 달</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(stats.thisMonthAmount)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  stats.monthChange >= 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {stats.monthChange >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className={`font-medium ${
                  stats.monthChange >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {stats.monthChange >= 0 ? '+' : ''}{stats.monthChange.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">전월 대비</span>
              </div>
            </CardContent>
          </Card>

          {/* 매칭률 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">매칭률</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.matchRate.toFixed(1)}%
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.totalCount - stats.pendingCount}건 매칭 완료
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 대기 중 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">대기 중</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.pendingCount}건
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  매칭 대기 중인 거래
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 월별 지출 추이 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                월별 지출 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <MonthlySpendingChart data={monthlyData} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 카드별 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                카드별 지출 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cardData.length > 0 ? (
                <CardDistributionChart data={cardData} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 업종별 지출 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              업종별 지출 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {industryData.length > 0 ? (
              <IndustryChart data={industryData} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 매칭 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              매칭 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <MatchingStatusChart data={matchingData} />
              </div>
              <div className="space-y-4">
                {matchingData.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{item.count}건</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stats.totalCount > 0
                          ? ((item.count / stats.totalCount) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
