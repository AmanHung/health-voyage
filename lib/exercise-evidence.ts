export type Metrics = { steps: number | null; minutes: number | null };
export type OcrLayout = {
  width: number;
  height: number;
  lines: {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }[];
};
export type Recognition = Metrics & {
  text: string;
  status: 'recognized' | 'failed';
  engine: string;
  layout?: OcrLayout | null;
};
export type EvidenceRecord = Metrics & {
  id: string;
  previousId: string | null;
  kind: string;
  date: string;
  createdAt: string;
  reason: string;
  source: 'screenshot' | 'manual';
  recognition: Recognition | null;
  imageKey: string | null;
  imageType: string | null;
  imageHash: string | null;
};
export const DEMO_DATE = '2026-09-02';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Conservative label-based extraction: ambiguous multiple values stay blank.
// Never infer a duration from a phone clock, calories, distance or a target.
export function parseExerciseText(raw: string): Metrics {
  const text = raw
    .normalize('NFKC')
    .replace(/(?<=[\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '');
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const steps = new Set<number>();
  const minutes = new Set<number>();
  const num = '(\\d{1,3}(?:,\\d{3})+|\\d+)';
  const stepsPage = lines.some((line) =>
    /^(?:步數|步数|步行|steps|step count)$/i.test(line),
  );
  let secondarySection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:重點|Highlights|趨勢|Trends)$/i.test(line))
      secondarySection = true;
    if (
      /目標|目标|goal|target|平均|average|每週|每周|本週|本周|weekly|本月|monthly|總計|总计/i.test(
        line,
      )
    )
      continue;
    const stepPatterns = [
      new RegExp(num + '\\s*(?:步(?!速|幅)|steps?\\b)', 'ig'),
      new RegExp('(?:步數|步数|steps?\\b)\\s*[:：]?\\s*' + num, 'ig'),
    ];
    for (const pattern of secondarySection ||
    /步\s*[/／]\s*天|steps?\s*per\s*day/i.test(line)
      ? []
      : stepPatterns)
      for (const match of line.matchAll(pattern)) {
        const value = Number(match[1].replaceAll(',', ''));
        if (Number.isInteger(value) && value >= 0 && value <= 100000)
          steps.add(value);
      }
    if (!secondarySection && /^(?:步數|步数|steps?)\s*[:：]?$/i.test(line)) {
      // Prefer following value; a solitary preceding value is a fallback.
      const adjacent = /^\d[\d,]*$/.test(lines[i + 1] ?? '')
        ? lines[i + 1]
        : lines[i - 1];
      if (/^\d[\d,]*$/.test(adjacent ?? '')) {
        const value = Number(adjacent.replaceAll(',', ''));
        if (value <= 100000) steps.add(value);
      }
    }
    if (!secondarySection && stepsPage && /^(?:今天|今日|today)$/i.test(line)) {
      const adjacent = (lines[i - 1] ?? '').replace(/[ \t]/g, '');
      if (/^(?:\d{1,3}(?:,\d{3})+|\d{1,6})$/.test(adjacent)) {
        const value = Number(adjacent.replaceAll(',', ''));
        if (value <= 100000) steps.add(value);
      }
    }
    if (/配速|pace|\/km|\/公里|睡眠|sleep/i.test(line)) continue;
    const durationLabel =
      /運動時間|运动时间|活動時間|活动时间|鍛鍊|锻炼|運動|运动|exercise|duration|workout|active time|elapsed time/i.test(
        line,
      );
    // A minute unit with an exercise label (same or preceding line) is required.
    const context =
      durationLabel ||
      /^(?:運動時間|运动时间|活動時間|活动时间|exercise|duration|workout|active time)\s*[:：]?$/i.test(
        lines[i - 1] ?? '',
      );
    if (context) {
      const hour = line.match(/(\d+)\s*(?:小時|小时|hours?\b|hr\b|h\b)/i);
      const minute = line.match(/(\d+)\s*(?:分鐘|分钟|分|minutes?\b|mins?\b)/i);
      if (hour || minute) {
        const value = Number(hour?.[1] ?? 0) * 60 + Number(minute?.[1] ?? 0);
        if (value <= 1440) minutes.add(value);
      } else {
        const clock = line.match(
          /(?:duration|運動時間|运动时间|活動時間|活动时间|elapsed time)\s*[:：]?\s*(\d{1,2}):(\d{2}):(\d{2})/i,
        );
        if (clock && Number(clock[2]) < 60 && Number(clock[3]) < 60) {
          const value = Number(clock[1]) * 60 + Number(clock[2]);
          if (value <= 1440) minutes.add(value);
        }
      }
    }
  }
  return {
    steps: steps.size === 1 ? [...steps][0] : null,
    minutes: minutes.size === 1 ? [...minutes][0] : null,
  };
}

// Numeric OCR and text OCR are separate passes. The visual candidate must be
// clearly larger than other numeric values, and the page must have a steps title.
// This is still a candidate requiring confirmation, not proof of daily scope.
export function parseExerciseRecognition(
  text: string,
  layout?: OcrLayout | null,
): Metrics {
  const metrics = parseExerciseText(text);
  if (metrics.steps !== null) return metrics;
  const headings = text
    .normalize('NFKC')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]/g, ''));
  if (
    !layout ||
    !headings.some((line) =>
      /^(?:步數|步数|步行|steps|stepcount|dailysteps)$/i.test(line),
    )
  )
    return metrics;
  const candidates = layout.lines
    .flatMap((line) => {
      const token = line.text.trim().replace(/[ \t]/g, '');
      if (!/^(?:\d{1,3}(?:,\d{3})+|\d{1,6})$/.test(token)) return [];
      const value = Number(token.replaceAll(',', ''));
      const height = line.bbox.y1 - line.bbox.y0;
      if (
        value > 100000 ||
        line.confidence < 20 ||
        height < layout.width * 0.035 ||
        line.bbox.y0 < layout.height * 0.14 ||
        line.bbox.y1 > layout.height * 0.56 ||
        line.bbox.x1 - line.bbox.x0 > layout.width * 0.65
      )
        return [];
      return [{ value, height }];
    })
    .sort((a, b) => b.height - a.height);
  if (!candidates.length) return metrics;
  const best = candidates[0];
  const rival = candidates.find((candidate) => candidate.value !== best.value);
  if (rival && best.height < rival.height * 1.35)
    return { ...metrics, steps: null };
  return { ...metrics, steps: best.value };
}

export function validateOcrLayout(value: unknown): OcrLayout | null {
  if (value == null) return null;
  const x = value as OcrLayout;
  if (
    !Number.isInteger(x.width) ||
    !Number.isInteger(x.height) ||
    x.width < 1 ||
    x.height < 1 ||
    x.width * x.height > 16000000 ||
    !Array.isArray(x.lines) ||
    x.lines.length > 80
  )
    throw new Error('辨識版面資料不正確。');
  for (const line of x.lines) {
    if (
      typeof line.text !== 'string' ||
      line.text.length > 80 ||
      !Number.isFinite(line.confidence) ||
      line.confidence < 0 ||
      line.confidence > 100 ||
      !line.bbox
    )
      throw new Error('辨識版面資料不正確。');
    const b = line.bbox;
    if (
      ![b.x0, b.y0, b.x1, b.y1].every(Number.isFinite) ||
      b.x0 < 0 ||
      b.y0 < 0 ||
      b.x1 > x.width ||
      b.y1 > x.height ||
      b.x1 <= b.x0 ||
      b.y1 <= b.y0
    )
      throw new Error('辨識版面資料不正確。');
  }
  return {
    width: x.width,
    height: x.height,
    lines: x.lines.map(({ text, confidence, bbox }) => ({
      text,
      confidence,
      bbox: { x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 },
    })),
  };
}

export function validateMetrics(value: Metrics): Metrics {
  for (const [key, max] of [
    ['steps', 100000],
    ['minutes', 1440],
  ] as const) {
    const n = value[key];
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > max))
      throw new Error(
        key === 'steps'
          ? '步數須為 0～100,000 的整數。'
          : '時間須為 0～1,440 分鐘的整數。',
      );
  }
  if (value.steps === null && value.minutes === null)
    throw new Error('請至少確認步數或運動時間其中一項。');
  return value;
}
export const metricText = (value: number | null | undefined, unit: string) =>
  value == null ? '未提供' : `${value.toLocaleString()} ${unit}`;
export const exerciseText = (x: Metrics) =>
  [
    x.steps == null ? '' : metricText(x.steps, '步'),
    x.minutes == null ? '' : metricText(x.minutes, '分鐘'),
  ]
    .filter(Boolean)
    .join(' · ') || '未辨識';
export function imageMime(bytes: Uint8Array): string | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg';
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}
