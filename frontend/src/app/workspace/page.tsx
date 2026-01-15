'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { TransactionsPanel } from '@/components/workspace/TransactionsPanel';
import { UploadPanel } from '@/components/workspace/UploadPanel';
import { ExportPanel } from '@/components/workspace/ExportPanel';
import { Receipt, Upload, Download } from 'lucide-react';

type TabValue = 'transactions' | 'upload' | 'export';

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<TabValue>('transactions');

  // 업로드 완료 후 거래내역 탭으로 전환
  const handleUploadComplete = (result: {
    session_id: number;
    filename: string;
    total: number;
    matched: number;
    pending: number;
  }) => {
    // 대기 거래가 있으면 거래내역 탭으로 전환
    if (result.pending > 0) {
      setTimeout(() => {
        setActiveTab('transactions');
      }, 2000); // 2초 후 전환 (결과 확인 시간)
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="거래관리" />

      <div className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          defaultValue="transactions"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="transactions">
              <Receipt className="h-4 w-4" />
              거래내역
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4" />
              업로드
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4" />
              내보내기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <TransactionsPanel />
          </TabsContent>

          <TabsContent value="upload">
            <UploadPanel onUploadComplete={handleUploadComplete} />
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
