import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Receipt } from '../types/receipt';

const MODULE_EMOJI: Record<string, string> = {
  work: '💼',
  tax: '🧾',
  personal: '🏠',
  general: '📁',
};

// ─── CSV Export ───────────────────────────────────────────
export const exportToCSV = async (receipts: Receipt[], summary: string = ''): Promise<void> => {
  const headers = ['ID', 'Merchant', 'Date', 'Total', 'Category', 'Module', 'Description', 'Items'];

  const rows = receipts.map((r) => [
    r.id,
    r.merchant,
    r.date,
    r.total,
    r.category,
    r.module,
    r.description,
    typeof r.items === 'string' ? r.items : (r.items as string[]).join(', '),
  ]);

  const summaryRow = summary ? `"Export Summary","${summary.replace(/"/g, '""')}"\n\n` : '';

  const csvContent = summaryRow + [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const fileUri = FileSystem.documentDirectory + 'capsule_receipts.csv';
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Receipts CSV',
    UTI: 'public.comma-separated-values-text',
  });
};

// ─── XML Export ───────────────────────────────────────────
export const exportToXML = async (receipts: Receipt[], summary: string = ''): Promise<void> => {
  const summaryXml = summary ? `\n  <summary>${summary}</summary>` : '';

  const xmlRows = receipts.map((r) => `
  <receipt>
    <id>${r.id}</id>
    <merchant>${r.merchant}</merchant>
    <date>${r.date}</date>
    <total>${r.total}</total>
    <category>${r.category}</category>
    <module>${r.module}</module>
    <description>${r.description}</description>
    <items>${typeof r.items === 'string' ? r.items : (r.items as string[]).join(', ')}</items>
  </receipt>`).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<receipts>${summaryXml}
${xmlRows}
</receipts>`;

  const fileUri = FileSystem.documentDirectory + 'capsule_receipts.xml';
  await FileSystem.writeAsStringAsync(fileUri, xmlContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/xml',
    dialogTitle: 'Export Receipts XML',
    UTI: 'public.xml',
  });
};

// ─── PDF Export ───────────────────────────────────────────
export const exportToPDF = async (receipts: Receipt[], summary: string = ''): Promise<void> => {
  const totalSpend = receipts.reduce((sum, r) => sum + r.total, 0);

  const summaryHtml = summary ? `
    <div class="summary-box">
      <h3>Export Summary</h3>
      <p>${summary}</p>
    </div>` : '';

  const tableRows = receipts
    .map(
      (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${MODULE_EMOJI[r.module]} ${r.module.toUpperCase()}</td>
        <td>${r.merchant}</td>
        <td>${r.category}</td>
        <td>${typeof r.items === 'string' ? r.items : (r.items as string[]).join(', ')}</td>
        <td>${r.description}</td>
        <td style="text-align:right;font-weight:bold;">$${Number(r.total).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1F2937; }
          h1 { color: #1C1C1E; font-size: 28px; margin-bottom: 4px; }
          p.subtitle { color: #1C1C1E; font-size: 14px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #1C1C1E; color: white; padding: 10px 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; }
          tr:nth-child(even) { background: #53727B; }
          .summary { margin-top: 24px; padding: 16px; background: #DDDDDD; border-radius: 8px; }
          .summary h3 { margin: 0 0 8px; color: #1C1C1E; }
          .summary p { margin: 4px 0; font-size: 14px; }
          .summary-box { background: #DDDDDD; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .summary-box h3 { margin: 0 0 8px; color: #1C1C1E; font-size: 14px; }
          .summary-box p { margin: 0; font-size: 13px; color: #1C1C1E; line-height: 1.6; }
          .total { font-size: 20px; font-weight: bold; color: #1C1C1E; }
        </style>
      </head>
      <body>
        <h1>💊 Capsule</h1>
        <p class="subtitle">Receipt Export — Generated ${new Date().toLocaleDateString()}</p>
        ${summaryHtml}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Module</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Items</th>
              <th>Description</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <h3>Summary</h3>
          <p>Total Receipts: <strong>${receipts.length}</strong></p>
          <p>Total Spend: <span class="total">$${totalSpend.toFixed(2)}</span></p>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export Receipts PDF',
    UTI: 'com.adobe.pdf',
  });
};