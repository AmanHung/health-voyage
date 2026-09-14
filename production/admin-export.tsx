import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Auth, type AdminPatient, type RecordItem } from './api';
import { exportRangeValid, patientExportSheets } from '../lib/patient-export';

export function AdminExport({ auth, patient, today, disabled }: { auth: Auth; patient: AdminPatient; today: string; disabled: boolean }) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const running = useRef(false);
  async function download() {
    if (running.current || disabled) return;
    if (!exportRangeValid(from, to)) { setError('請確認起訖日期，結束日期不可早於開始日期。'); return; }
    running.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await api<{ records: RecordItem[] }>(auth, 'admin.records', { patientId: patient.id });
      const sheets = patientExportSheets(patient, result.records, from, to);
      const { patientWorkbook } = await import('../lib/patient-workbook');
      const bytes = await patientWorkbook(sheets);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `健康航程_${patient.name}_${from || '全部'}_${to || '全部'}.xlsx`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      const count = sheets.slice(1, 4).reduce((n, s) => n + s.rows.length, 0);
      setNotice(`已產生 Excel 並送出下載，共 ${count} 筆有效紀錄。${count ? '' : '所選期間沒有紀錄，檔案保留摘要與欄位。'}`);
    } catch (e) { setError(e instanceof Error ? e.message : '匯出失敗，請稍後重試。'); }
    finally { running.current = false; setBusy(false); }
  }
  return <details className="admin-history"><summary>匯出個案紀錄 Excel</summary><p>匯出此個案最新有效紀錄，包含運動、飲食、用藥回報與服藥明細。日期留白代表不限。</p><div className="prod-actions"><label>開始日期<input aria-label="匯出開始日期" type="date" value={from} disabled={busy} onChange={e => setFrom(e.target.value)} /></label><label>結束日期<input aria-label="匯出結束日期" type="date" value={to} disabled={busy} onChange={e => setTo(e.target.value)} /></label></div><Button variant="outline" disabled={busy || disabled} onClick={() => void download()}><Download />{busy ? '正在產生 Excel…' : '下載 Excel'}</Button>{error && <p role="alert" className="prod-error">{error}</p>}{notice && <p role="status">{notice}</p>}</details>;
}
