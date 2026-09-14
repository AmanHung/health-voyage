import type { AdminPatient, RecordItem } from '../production/api';
import { patientExportSheets, taiwanTimestamp, type ExportSheet } from './patient-export.ts';

export async function allPatientExport(
  patients: AdminPatient[],
  readRecords: (patientId: string) => Promise<RecordItem[]>,
  from: string, to: string,
  progress: (done: number, total: number) => void = () => {},
): Promise<ExportSheet[]> {
  const now = new Date();
  const unique = [...new Map(patients.map(p => [p.id, p])).values()];
  const templates = patientExportSheets({id:'',name:'',nickname:'',active:false} as AdminPatient, [], from, to, now);
  const detail = templates.slice(1).map(s => ({...s, headers:['個案編號','姓名','暱稱','帳號狀態',...s.headers], rows:[] as ExportSheet['rows']}));
  const roster: ExportSheet = {name:'個案名冊', headers:['個案編號','姓名','暱稱','帳號狀態','運動紀錄筆數','飲食紀錄筆數','用藥回報筆數'], rows:[]};
  progress(0, unique.length);
  for (const [index, patient] of unique.entries()) {
    // Fail the entire export on any unreadable patient; never download an incomplete report.
    const records = await readRecords(patient.id);
    const sheets = patientExportSheets(patient, records, from, to, now).slice(1);
    const identity = [patient.id, patient.name, patient.nickname, patient.deletedAt ? '已刪除' : patient.active ? '使用中' : '已停用'];
    roster.rows.push([...identity,...sheets.slice(0,3).map(s => s.rows.length)]);
    sheets.forEach((sheet, i) => { for (const row of sheet.rows) detail[i].rows.push([...identity,...row]); });
    progress(index + 1, unique.length);
  }
  return [{name:'匯出說明',headers:['項目','內容'],rows:[
    ['匯出時間（臺灣）',taiwanTimestamp(now.toISOString())],['開始日期',from || '不限'],['結束日期',to || '不限'],['個案總數',unique.length],
    ['個案範圍','全部個案，包含停用及已刪除個案，帳號狀態另列。'],
    ['紀錄範圍','各個案每日每項目最新有效紀錄；排除已刪除紀錄及修訂舊版本。'],
    ['用藥說明','回報完成不是服藥率；尚未回報項目不在服藥明細內。'],
    ['資料說明','空白代表未記錄或不適用；不含照片。依序讀取各個案資料，期間更新可能反映不同讀取時間。'],
  ]},roster,...detail];
}
