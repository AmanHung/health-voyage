import ExcelJS from 'exceljs';
import type { ExportSheet } from './patient-export';

export async function patientWorkbook(sheets: ExportSheet[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '健康航程';
  for (const data of sheets) {
    const sheet = workbook.addWorksheet(data.name, { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = data.headers.map(header => ({ header, width: ['個案摘要','匯出說明'].includes(data.name) ? (header === '內容' ? 90 : 28) : /名稱|回饋|提醒|疑問/.test(header) ? 36 : 23 }));
    // Assign strings as strings, never formula objects, even if user text starts with '='.
    sheet.addRows(data.rows);
    sheet.eachRow((row, index) => {
      row.font = { name: 'Microsoft JhengHei', size: 11, ...(index === 1 ? { bold: true, color: { argb: 'FFFFFFFF' } } : {}) };
      row.alignment = { vertical: 'top', wrapText: true };
      if (index === 1) { row.height = 32; row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565A8' } }; }
      else if (index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FA' } };
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: data.headers.length } };
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
