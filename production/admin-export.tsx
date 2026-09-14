import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Auth, type AdminPatient, type RecordItem } from './api';
import { exportRangeValid } from '../lib/patient-export';
import { allPatientExport } from '../lib/all-patient-export';

export function AdminExport({ auth, today, disabled }: { auth: Auth; today: string; disabled: boolean }) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(today);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const running = useRef(false);
  async function download() {
    if (running.current || disabled) return;
    if (!exportRangeValid(from, to)) { setError('請確認起訖日期，結束日期不可早於開始日期。'); return; }
    running.current = true; setBusy(true); setError(''); setNotice(''); setProgress('讀取個案名冊…');
    try {
      const { patients } = await api<{ patients: AdminPatient[] }>(auth, 'admin.patients');
      const sheets = await allPatientExport(patients, async patientId => {
        const result = await api<{ records: RecordItem[] }>(auth, 'admin.records', { patientId });
        return result.records;
      }, from, to, (done, total) => setProgress(`已讀取 ${done}／${total} 位個案`));
      setProgress('正在製作 Excel 檔案…');
      const { patientWorkbook } = await import('../lib/patient-workbook');
      const bytes = await patientWorkbook(sheets);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `健康航程_所有個案_${from || '全部'}_${to || '全部'}.xlsx`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      const count = sheets.slice(2, 5).reduce((n, s) => n + s.rows.length, 0);
      setNotice(`已產生 Excel 並送出下載，共 ${sheets[1].rows.length} 位個案、${count} 筆有效紀錄。${count ? '' : '所選期間沒有紀錄，檔案保留摘要與欄位。'}`);
    } catch (e) { setError(e instanceof Error ? e.message : '匯出失敗，請稍後重試。'); }
    finally { running.current = false; setBusy(false); setProgress(''); }
  }
  return <details className="admin-history"><summary>匯出所有個案紀錄 Excel</summary><p>一次下載全部個案的運動、飲食與用藥紀錄，包含停用及已刪除個案，各筆標示姓名、編號與帳號狀態。排除已刪除紀錄及修訂舊版本；日期留白代表不限。</p><div className="prod-actions"><label>開始日期<input aria-label="匯出開始日期" type="date" value={from} disabled={busy} onChange={e => setFrom(e.target.value)} /></label><label>結束日期<input aria-label="匯出結束日期" type="date" value={to} disabled={busy} onChange={e => setTo(e.target.value)} /></label></div><Button variant="outline" disabled={busy || disabled} onClick={() => void download()}><Download />{busy ? '正在產生 Excel…' : '一次下載所有個案 Excel'}</Button>{progress && <p role="status">{progress}</p>}{error && <p role="alert" className="prod-error">{error}</p>}{notice && <p role="status">{notice}</p>}</details>;
}
