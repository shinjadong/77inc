import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { CARD_ORDER, CARD_NUMBER_MAP } from '@/lib/supabase';
import type { Transaction } from '@/types';

// Use Node.js runtime for file operations
export const runtime = 'nodejs';
// Set max duration (60s for Pro, 10s for Hobby)
export const maxDuration = 60;

interface TransactionWithCard extends Transaction {
  cards: {
    card_number: string;
    card_name: string;
  } | null;
}

/**
 * GET /api/export
 *
 * Query Parameters:
 * - dateFrom: string (YYYY-MM-DD) - Start date filter
 * - dateTo: string (YYYY-MM-DD) - End date filter
 * - cardIds: string (comma-separated card numbers) - e.g., "3987,4985" or "all"
 * - matchStatus: string - "pending" | "auto" | "manual" | "all"
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const cardIdsParam = searchParams.get('cardIds');
    const matchStatus = searchParams.get('matchStatus') || 'all';

    // Parse card IDs
    const cardIds = cardIdsParam && cardIdsParam !== 'all'
      ? cardIdsParam.split(',').map(id => id.trim())
      : [];

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        cards!inner(card_number, card_name)
      `)
      .order('transaction_date', { ascending: true });

    // Apply date filters
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    // Apply match status filter
    if (matchStatus !== 'all') {
      query = query.eq('match_status', matchStatus);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      );
    }

    // Type assertion for Supabase response
    const transactions = data as unknown as TransactionWithCard[];

    // Filter by card IDs if specified
    let filteredTransactions = transactions;
    if (cardIds.length > 0) {
      filteredTransactions = transactions.filter(tx =>
        tx.cards && cardIds.includes(tx.cards.card_number)
      );
    }

    // Group transactions by card
    const transactionsByCard = groupTransactionsByCard(filteredTransactions);

    // Generate Excel workbook
    const workbook = await generateExcelWorkbook(transactionsByCard);

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `칠칠기업_법인카드_${timestamp}.xlsx`;

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Group transactions by card number
 */
function groupTransactionsByCard(
  transactions: TransactionWithCard[]
): Record<string, TransactionWithCard[]> {
  const grouped: Record<string, TransactionWithCard[]> = {};

  // Initialize empty arrays for all cards in order
  for (const cardNumber of CARD_ORDER) {
    grouped[cardNumber] = [];
  }

  // Group transactions by card number
  for (const tx of transactions) {
    const cardNumber = tx.cards?.card_number || CARD_NUMBER_MAP[tx.card_id];
    if (cardNumber && grouped[cardNumber] !== undefined) {
      grouped[cardNumber].push(tx);
    }
  }

  // Sort each group by transaction date
  for (const cardNumber of CARD_ORDER) {
    grouped[cardNumber].sort((a, b) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
  }

  return grouped;
}

/**
 * Generate Excel workbook with all card sheets
 * Based on exportToExcel function from frontend/src/lib/excel.ts
 */
async function generateExcelWorkbook(
  transactionsByCard: Record<string, TransactionWithCard[]>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '칠칠기업 법인카드 관리 시스템';
  workbook.created = new Date();

  // Create sheet for each card in order
  for (const cardNumber of CARD_ORDER) {
    const transactions = transactionsByCard[cardNumber] || [];
    const worksheet = workbook.addWorksheet(cardNumber);

    // Define columns
    worksheet.columns = [
      { header: '결제일자', key: 'date', width: 12 },
      { header: '가맹점명', key: 'merchant', width: 30 },
      { header: '이용금액', key: 'amount', width: 15 },
      { header: '사용용도', key: 'usage', width: 30 },
      { header: '추가메모', key: 'notes', width: 40 },
      { header: '세금분류', key: 'tax', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add data rows
    for (const tx of transactions) {
      const row = worksheet.addRow({
        date: new Date(tx.transaction_date),
        merchant: tx.merchant_name,
        amount: tx.amount,
        usage: tx.usage_description || '',
        notes: tx.additional_notes || '',
        tax: tx.tax_category || '',
      });

      // Format date column
      row.getCell('date').numFmt = 'YYYY-MM-DD';
      row.getCell('date').alignment = { horizontal: 'center' };

      // Format amount column
      row.getCell('amount').numFmt = '#,##0';
      row.getCell('amount').alignment = { horizontal: 'right' };

      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Handle empty sheets
    if (transactions.length === 0) {
      const emptyRow = worksheet.addRow({ date: '데이터 없음' });
      worksheet.mergeCells('A2:F2');
      emptyRow.getCell(1).alignment = { horizontal: 'center' };
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    }
  }

  return workbook;
}
