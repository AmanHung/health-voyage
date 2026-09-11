export type CatalogDrug = {
  code: string;
  name: string;
  generic: string;
  hasImage: boolean;
  appearance: string;
};
const source =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTl_HoBeP0qBD79IB7Ulp_xAMRX4Gyx65pgU-4Kf15Lu4g4FqGdVBDSn1BEI6sNXht889zjRx6RErb-/pub?output=csv';
// Public formulary data only. No patient identifiers or credentials in requests.
export function parseCatalog(csv: string): CatalogDrug[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, ''));
      cell = '';
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  if (quoted) throw new Error('藥品目錄格式不完整，請重試。');
  const header = (rows.shift() || []).map((v) =>
    v.replace(/^\uFEFF/, '').trim(),
  );
  if (!header.includes('藥品代碼') || !header.includes('學名'))
    throw new Error('藥品目錄欄位已變更，請使用手動建檔。');
  return rows.flatMap((r) => {
    const get = (key: string) => r[header.indexOf(key)]?.trim() || '';
    const code = get('藥品代碼'),
      name = get('商品名(英文)') || get('商品名'),
      generic = get('學名');
    const states = [get('門診停用否'), get('住院停用否')];
    if (
      !/^[a-zA-Z0-9_-]{6}$/.test(code) ||
      !name ||
      (states.includes('Y') && !states.includes('N'))
    )
      return [];
    return [
      {
        code,
        name,
        generic,
        hasImage: get('圖片否') === 'Y' || !!get('圖檔名稱'),
        appearance: get('藥品外觀'),
      },
    ];
  });
}
let pending: Promise<CatalogDrug[]> | undefined;
export function loadDrugCatalog() {
  if (!pending)
    pending = (async () => {
      const abort = new AbortController(),
        timer = setTimeout(() => abort.abort(), 20000);
      try {
        const r = await fetch(source, {
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: abort.signal,
        });
        if (!r.ok) throw new Error();
        return parseCatalog(await r.text());
      } catch {
        pending = undefined;
        throw new Error('藥品目錄暫時無法載入，可重試或手動建檔。');
      } finally {
        clearTimeout(timer);
      }
    })();
  return pending;
}
