import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { Transaction } from '@/types';
import { CARD_ORDER, CARD_ID_MAP } from './supabase';

export interface ParsedTransaction {
  cardNumber: string;
  transactionDate: Date;
  merchantName: string;
  amount: number;
  industry?: string;
}

/**
 * 카드사 Excel 파일 파싱 (SheetJS)
 * 카드사 청구명세서 형식: 카드번호, 승인일자, 가맹점명, 거래금액(원화), 가맹점업종
 */
export function parseCardStatement(file: File): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const transactions: ParsedTransaction[] = [];

        for (const row of rows as Record<string, unknown>[]) {
          // 카드번호 추출 (끝 4자리)
          const cardNumber = extractCardLast4(row['카드번호']);
          if (!cardNumber) continue;

          // 유효한 카드번호인지 확인
          if (!CARD_ID_MAP[cardNumber]) continue;

          // 승인일자 파싱
          const transactionDate = parseDate(row['승인일자']);
          if (!transactionDate) continue;

          // 가맹점명
          const merchantName = String(row['가맹점명'] || '').trim();
          if (!merchantName || merchantName === 'nan') continue;

          // 거래금액
          const amount = parseAmount(row['거래금액(원화)']);
          if (amount === 0) continue;

          // 가맹점업종 (선택)
          const industry = String(row['가맹점업종'] || '').trim();

          transactions.push({
            cardNumber,
            transactionDate,
            merchantName,
            amount,
            industry: industry && industry !== 'nan' ? industry : undefined,
          });
        }

        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 카드번호에서 끝 4자리 추출
 */
function extractCardLast4(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).replace(/-/g, '').replace(/\s/g, '');
  const last4 = str.slice(-4);
  return /^\d{4}$/.test(last4) ? last4 : null;
}

/**
 * 날짜 파싱
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // 이미 Date 객체인 경우
  if (value instanceof Date) {
    return value;
  }

  // 숫자인 경우 (Excel 시리얼 날짜)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }

  // 문자열인 경우
  const str = String(value).trim();

  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str.slice(0, 10));
  }

  // YYYYMMDD 형식
  if (/^\d{8}$/.test(str)) {
    return new Date(`${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`);
  }

  // 기타 형식
  try {
    const parsed = new Date(value as string);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * 금액 파싱
 */
function parseAmount(value: unknown): number {
  if (!value) return 0;
  const clean = String(value).replace(/[,\s원]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.floor(num);
}

/**
 * Excel 내보내기 (ExcelJS)
 * 칠칠기업_법인카드.xlsx 형태로 생성
 */
export async function exportToExcel(
  transactionsByCard: Record<string, Transaction[]>,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '칠칠기업 법인카드 관리 시스템';
  workbook.created = new Date();

  // 카드 순서대로 시트 생성
  for (const cardNumber of CARD_ORDER) {
    const transactions = transactionsByCard[cardNumber] || [];
    const worksheet = workbook.addWorksheet(cardNumber);

    // 컬럼 정의
    worksheet.columns = [
      { header: '결제일자', key: 'date', width: 12 },
      { header: '가맹점명', key: 'merchant', width: 30 },
      { header: '이용금액', key: 'amount', width: 15 },
      { header: '사용용도', key: 'usage', width: 30 },
      { header: '추가메모', key: 'notes', width: 40 },
      { header: '세금분류', key: 'tax', width: 20 },
    ];

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // 헤더에 테두리 추가
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 데이터 추가
    for (const tx of transactions) {
      const row = worksheet.addRow({
        date: new Date(tx.transaction_date),
        merchant: tx.merchant_name,
        amount: tx.amount,
        usage: tx.usage_description || '',
        notes: tx.additional_notes || '',
        tax: tx.tax_category || '',
      });

      // 날짜 포맷
      row.getCell('date').numFmt = 'YYYY-MM-DD';
      row.getCell('date').alignment = { horizontal: 'center' };

      // 금액 포맷
      row.getCell('amount').numFmt = '#,##0';
      row.getCell('amount').alignment = { horizontal: 'right' };

      // 테두리
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // 빈 시트 처리
    if (transactions.length === 0) {
      const emptyRow = worksheet.addRow({ date: '데이터 없음' });
      worksheet.mergeCells(`A2:F2`);
      emptyRow.getCell(1).alignment = { horizontal: 'center' };
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    }
  }

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 거래 데이터를 카드번호별로 그룹화
 */
export function groupTransactionsByCard(
  transactions: Transaction[],
  cardNumberMap: Record<number, string>
): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};

  // 빈 배열로 초기화
  for (const cardNumber of CARD_ORDER) {
    grouped[cardNumber] = [];
  }

  // 거래 분류
  for (const tx of transactions) {
    const cardNumber = cardNumberMap[tx.card_id];
    if (cardNumber && grouped[cardNumber]) {
      grouped[cardNumber].push(tx);
    }
  }

  // 날짜순 정렬
  for (const cardNumber of CARD_ORDER) {
    grouped[cardNumber].sort((a, b) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
  }

  return grouped;
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
