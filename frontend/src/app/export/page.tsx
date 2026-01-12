'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { exportApi } from '@/lib/api';
import { Download, FileSpreadsheet, Calendar, Loader2 } from 'lucide-react';

interface MonthInfo {
  year: number;
  month: number;
  count: number;
}

export default function ExportPage() {
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingMonthly, setDownloadingMonthly] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // 가용 월 목록 조회
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const months = await exportApi.getAvailableMonths();
        setAvailableMonths(months);
      } catch (error) {
        console.error('Failed to fetch months:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonths();
  }, []);

  // 월별 다운로드
  const handleMonthlyDownload = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    setDownloadingMonthly(key);
    try {
      await exportApi.downloadMonthly(year, month);
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드에 실패했습니다.');
    } finally {
      setDownloadingMonthly(null);
    }
  };

  // 전체 다운로드
  const handleAllDownload = async () => {
    setDownloadingAll(true);
    try {
      await exportApi.downloadAll();
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드에 실패했습니다.');
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatMonth = (year: number, month: number) => {
    return `${year}년 ${month}월`;
  };

  return (
    <div className="min-h-screen">
      <Header title="Excel 내보내기" />

      <div className="p-6 space-y-6">
        {/* 전체 내보내기 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              전체 데이터 내보내기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <h3 className="font-semibold text-green-800">칠칠기업_법인카드.xlsx</h3>
                <p className="text-sm text-green-600 mt-1">
                  모든 거래 내역을 카드별 시트로 구분하여 내보냅니다.
                </p>
                <p className="text-xs text-green-500 mt-2">
                  시트: 3987, 4985, 6902, 6974, 9980, 6911
                </p>
              </div>
              <Button
                onClick={handleAllDownload}
                disabled={downloadingAll}
                className="bg-green-600 hover:bg-green-700"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    전체 다운로드
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 월별 내보내기 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              월별 데이터 내보내기
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">로딩 중...</span>
              </div>
            ) : availableMonths.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>내보낼 거래 데이터가 없습니다.</p>
                <p className="text-sm mt-1">먼저 청구명세서를 업로드해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableMonths.map(({ year, month, count }) => {
                  const key = `${year}-${month}`;
                  const isDownloading = downloadingMonthly === key;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {formatMonth(year, month)}
                        </h4>
                        <Badge variant="info" className="mt-1">
                          {count.toLocaleString()}건
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMonthlyDownload(year, month)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 사용 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용 안내</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">1.</span>
                <span>청구명세서를 업로드하면 자동으로 카드별/월별로 분류됩니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">2.</span>
                <span>미매칭 거래는 수동으로 사용용도를 입력해주세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">3.</span>
                <span>모든 거래 매칭이 완료되면 Excel 파일을 다운로드하세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">4.</span>
                <span>다운로드된 파일을 세무사에게 전달하면 됩니다.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
