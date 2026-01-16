'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ExportFilters, ExportFilterOptions } from '@/components/export/ExportFilters';
import { FileSpreadsheet } from 'lucide-react';

export default function ExportPage() {
  // Handle export with filters
  const handleExport = async (filters: ExportFilterOptions) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      if (filters.cardIds.length > 0) {
        params.append('cardIds', filters.cardIds.join(','));
      } else {
        params.append('cardIds', 'all');
      }
      if (filters.matchStatus !== 'all') {
        params.append('matchStatus', filters.matchStatus);
      }

      // Fetch from API route
      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '다운로드에 실패했습니다.');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '칠칠기업_법인카드.xlsx';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert(error instanceof Error ? error.message : '다운로드에 실패했습니다.');
      throw error;
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Excel 내보내기" />

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Export Filters Card */}
        <ExportFilters onExport={handleExport} />

        {/* 사용 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              사용 안내
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong>필터링 옵션</strong>: 기간, 카드, 매칭상태를 선택하여 원하는 데이터만 다운로드할 수 있습니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong>카드별 시트</strong>: 선택한 각 카드마다 별도의 시트가 생성됩니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong>6컬럼 형식</strong>: 결제일자, 가맹점명, 이용금액, 사용용도, 추가메모, 세금분류
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong>서버 처리</strong>: 대용량 데이터도 안정적으로 다운로드됩니다.
                </span>
              </li>
            </ul>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">💡 팁</h4>
              <ul className="space-y-1 text-xs text-blue-700">
                <li>• 전체 다운로드: 모든 카드를 선택하고 기간 필터를 비워두세요</li>
                <li>• 월별 다운로드: 기간 필터에서 해당 월의 시작일과 종료일을 입력하세요</li>
                <li>• 미매칭 확인: 매칭상태를 "매칭대기"로 설정하여 작업이 필요한 거래만 확인하세요</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
