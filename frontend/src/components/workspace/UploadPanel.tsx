'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useSessions, useUploadFile, useDeleteSession } from '@/hooks/useApi';
import { Upload, FileSpreadsheet, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime, getSessionStatusLabel, getSessionStatusColor } from '@/lib/utils';

interface UploadPanelProps {
  onUploadComplete?: (result: {
    session_id: number;
    filename: string;
    total: number;
    matched: number;
    pending: number;
  }) => void;
}

export function UploadPanel({ onUploadComplete }: UploadPanelProps) {
  const { data: sessions, isLoading } = useSessions();
  const uploadFile = useUploadFile();
  const deleteSession = useDeleteSession();

  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    session_id: number;
    filename: string;
    total: number;
    matched: number;
    pending: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 드래그 이벤트 핸들러
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // 드롭 이벤트 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // 파일 선택 이벤트 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 파일 처리
  const handleFile = (file: File) => {
    // 파일 확장자 검증
    const validExtensions = ['.xls', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert('엑셀 파일(.xls, .xlsx)만 업로드 가능합니다.');
      return;
    }

    setUploadResult(null);
    uploadFile.mutate(file, {
      onSuccess: (result) => {
        setUploadResult(result);
        onUploadComplete?.(result);
      },
      onError: (error) => {
        console.error('Upload failed:', error);
        alert('파일 업로드에 실패했습니다.');
      },
    });
  };

  // 파일 선택 버튼 클릭
  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 세션 삭제
  const handleDeleteSession = (id: number) => {
    if (confirm('이 업로드 세션을 삭제하시겠습니까? 관련 거래 데이터도 함께 삭제됩니다.')) {
      deleteSession.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 업로드 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            청구명세서 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 드래그 앤 드롭 영역 */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleChange}
              className="hidden"
            />

            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                  파일을 드래그하여 업로드하거나
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  엑셀 파일(.xls, .xlsx)만 지원됩니다
                </p>
              </div>
              <Button
                onClick={onButtonClick}
                isLoading={uploadFile.isPending}
                disabled={uploadFile.isPending}
              >
                파일 선택
              </Button>
            </div>
          </div>

          {/* 업로드 결과 */}
          {uploadResult && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    업로드 완료
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {uploadResult.filename} 파일이 성공적으로 업로드되었습니다.
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {uploadResult.total}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">총 거래</p>
                    </div>
                    <div className="text-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {uploadResult.matched}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">자동 매칭</p>
                    </div>
                    <div className="text-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {uploadResult.pending}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">대기 중</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 업로드 중 상태 */}
          {uploadFile.isPending && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    업로드 중...
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    파일을 처리하고 있습니다. 잠시만 기다려주세요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 업로드 히스토리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            업로드 히스토리
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : sessions?.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-3">
                업로드 내역이 없습니다.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                청구명세서 파일을 업로드하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>파일명</TableHead>
                    <TableHead>업로드 일시</TableHead>
                    <TableHead className="text-center">총 거래</TableHead>
                    <TableHead className="text-center">매칭</TableHead>
                    <TableHead className="text-center">대기</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions?.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                          {session.filename}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {formatDateTime(session.upload_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {session.total_transactions}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {session.matched_count}
                      </TableCell>
                      <TableCell className="text-center text-yellow-600 font-medium">
                        {session.pending_count}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSessionStatusColor(session.status)}>
                          {getSessionStatusLabel(session.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
