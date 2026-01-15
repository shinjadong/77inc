'use client';

import { User, Bot, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/ai/api-adapter';
import type { UIMessage } from 'ai';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 아바타 */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'}`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* 메시지 내용 */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-4 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          {/* 메시지 파트 렌더링 */}
          {message.parts.map((part, idx) => (
            <MessagePartRenderer key={idx} part={part} isUser={isUser} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 메시지 파트 렌더러
function MessagePartRenderer({ part, isUser }: { part: any; isUser: boolean }) {
  switch (part.type) {
    case 'text':
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {part.text}
        </p>
      );

    case 'tool-invocation':
      // Tool 호출 결과 렌더링
      if (part.state === 'result') {
        return <ToolResultRenderer toolName={part.toolName} result={part.result} />;
      }
      // 호출 중일 때
      if (part.state === 'call') {
        return (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            도구 호출 중: {part.toolName}
          </div>
        );
      }
      return null;

    case 'reasoning':
      return (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 italic">
          {part.text}
        </div>
      );

    default:
      return null;
  }
}

// Tool 결과 렌더러
function ToolResultRenderer({ toolName, result }: { toolName: string; result: any }) {
  if (!result) return null;

  switch (toolName) {
    case 'getTransactions':
      return <TransactionResult result={result} />;
    case 'getTransactionStats':
      return <StatsResult result={result} />;
    case 'addPattern':
      return <PatternAddedResult result={result} />;
    case 'getPatterns':
      return <PatternsResult result={result} />;
    case 'prepareExcelDownload':
      return <DownloadResult result={result} />;
    case 'getCardInfo':
      return <CardInfoResult result={result} />;
    default:
      return (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      );
  }
}

// 거래내역 결과 컴포넌트
function TransactionResult({ result }: { result: any }) {
  if (!result.success || result.transactions.length === 0) {
    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        조회된 거래내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {/* 요약 */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>총 {result.total}건</span>
        <span>합계 {formatCurrency(result.summary.totalAmount)}</span>
        {result.summary.pendingCount > 0 && (
          <span className="text-yellow-600">대기 {result.summary.pendingCount}건</span>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <th className="px-2 py-1.5 text-left font-medium">날짜</th>
              <th className="px-2 py-1.5 text-left font-medium">가맹점</th>
              <th className="px-2 py-1.5 text-right font-medium">금액</th>
              <th className="px-2 py-1.5 text-left font-medium">용도</th>
              <th className="px-2 py-1.5 text-center font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {result.transactions.slice(0, 10).map((t: any) => (
              <tr key={t.id} className="text-gray-700 dark:text-gray-200">
                <td className="px-2 py-1.5 whitespace-nowrap">{t.date}</td>
                <td className="px-2 py-1.5 truncate max-w-[120px]">{t.merchant}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatCurrency(t.amount)}</td>
                <td className="px-2 py-1.5 truncate max-w-[80px]">{t.usage || '-'}</td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.total > 10 && (
        <p className="text-xs text-gray-400 mt-2">
          외 {result.total - 10}건 더 있습니다.
        </p>
      )}
    </div>
  );
}

// 통계 결과 컴포넌트
function StatsResult({ result }: { result: any }) {
  if (!result.success) {
    return <ErrorMessage message="통계 조회에 실패했습니다." />;
  }

  const { stats } = result;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400">전체 거래</div>
        <div className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalTransactions}건</div>
      </div>
      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400">총 금액</div>
        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalAmount)}</div>
      </div>
      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="text-xs text-yellow-600 dark:text-yellow-400">매칭 대기</div>
        <div className="font-semibold text-yellow-700 dark:text-yellow-300">{stats.pendingCount}건</div>
      </div>
      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-xs text-green-600 dark:text-green-400">매칭률</div>
        <div className="font-semibold text-green-700 dark:text-green-300">{stats.matchRate}%</div>
      </div>
    </div>
  );
}

// 패턴 추가 결과 컴포넌트
function PatternAddedResult({ result }: { result: any }) {
  if (!result.success) {
    return <ErrorMessage message={result.message} />;
  }

  return (
    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
        <span className="font-medium">패턴 추가 완료</span>
      </div>
      <div className="mt-1 text-xs text-green-600 dark:text-green-400">
        {result.pattern.merchantName} → {result.pattern.usageDescription}
      </div>
      {result.autoMatchedCount > 0 && (
        <div className="mt-1 text-xs text-green-600 dark:text-green-400">
          {result.autoMatchedCount}건의 대기 거래가 자동 매칭되었습니다.
        </div>
      )}
    </div>
  );
}

// 패턴 목록 결과 컴포넌트
function PatternsResult({ result }: { result: any }) {
  if (!result.success || result.patterns.length === 0) {
    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        등록된 패턴이 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        총 {result.total}개 패턴
      </div>
      {result.patterns.slice(0, 10).map((p: any) => (
        <div
          key={p.id}
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
        >
          <span className="text-gray-700 dark:text-gray-200 font-medium">{p.merchantName}</span>
          <span className="text-gray-500 dark:text-gray-400">→ {p.usageDescription}</span>
          <span className="text-gray-400 dark:text-gray-500">({p.useCount}회)</span>
        </div>
      ))}
    </div>
  );
}

// 다운로드 결과 컴포넌트
function DownloadResult({ result }: { result: any }) {
  if (!result.success) {
    return <ErrorMessage message={result.message} />;
  }

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="text-sm text-blue-700 dark:text-blue-300">
        {result.message}
      </div>
      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
        파일명: {result.filename}
      </div>
      <a
        href="/export"
        className="mt-2 inline-block px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
      >
        내보내기 페이지로 이동
      </a>
    </div>
  );
}

// 카드 정보 결과 컴포넌트
function CardInfoResult({ result }: { result: any }) {
  if (!result.success || !result.card) {
    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        {result.message}
      </div>
    );
  }

  const { card } = result;

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{card.cardName}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
        <div>카드번호: ****-****-****-{card.cardNumber}</div>
        <div>사용자: {card.userName}</div>
        <div>유형: {card.cardType}</div>
      </div>
    </div>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    auto: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    manual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const labels = {
    pending: '대기',
    auto: '자동',
    manual: '수동',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status as keyof typeof styles] || ''}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

// 에러 메시지 컴포넌트
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-red-500" />
      <span className="text-sm text-red-700 dark:text-red-300">{message}</span>
    </div>
  );
}
