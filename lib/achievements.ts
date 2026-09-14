import type { VoyageProgress } from './voyage';
export const BADGE_LEVELS = ['暖銅', '亮銀', '耀金', '翡翠', '珍珠'] as const;
export const BADGE_SERIES = [
  {
    id: 'voyage',
    name: '航程日誌',
    subtitle: '把每一次出發，寫進自己的故事',
    unit: '天',
    goals: [1, 7, 21, 60, 180],
    names: ['初航之帆', '追風旅人', '金色航線', '翡翠群島', '星海領航'],
  },
  {
    id: 'exercise',
    name: '運動足跡',
    subtitle: '每個願意活動的日子，都值得收藏',
    unit: '天',
    goals: [1, 7, 30, 90, 180],
    names: ['踏出一步', '沿岸漫步', '山海行者', '森嶼探險', '極光足跡'],
  },
  {
    id: 'steps',
    name: '萬步風景',
    subtitle: '依您確認的步數，慢慢走出新風景',
    unit: '步',
    goals: [1000, 10000, 50000, 200000, 1000000],
    names: ['沿岸小徑', '海風步道', '金色山丘', '翡翠遠征', '星河旅程'],
  },
  {
    id: 'meal',
    name: '餐桌花園',
    subtitle: '一餐一份記錄，讓日常慢慢開花',
    unit: '天',
    goals: [1, 7, 30, 90, 180],
    names: ['餐桌新芽', '雙葉日記', '盛放餐桌', '豐收花園', '四季珍藏'],
  },
  {
    id: 'medicine',
    name: '安心回報',
    subtitle: '已服用、未服用與疑問，都如實留下',
    unit: '天',
    goals: [1, 7, 30, 90, 180],
    names: ['安心信箋', '同行約定', '金色守望', '翡翠守護', '星光陪伴'],
  },
  {
    id: 'balance',
    name: '每日三任務',
    subtitle: '同一天，留下活動、飲食與用藥的記錄',
    unit: '天',
    goals: [1, 5, 15, 30, 90],
    names: ['三葉約定', '日日同行', '金色日常', '和煦之島', '恆星之光'],
  },
] as const;
export type BadgeSeriesId = (typeof BADGE_SERIES)[number]['id'];
export function achievementCollections(progress: VoyageProgress) {
  const rows = progress.latest;
  const days = (kind: string) => rows.filter((r) => r.kind === kind).length;
  const steps = rows
    .filter(
      (r) =>
        r.kind === 'exercise' &&
        r.mode === 'steps' &&
        Number.isInteger(r.value) &&
        r.value! >= 0 &&
        r.value! <= 100000,
    )
    .reduce((n, r) => n + r.value!, 0);
  const balance = progress.dates.filter((date) =>
    ['exercise', 'meal', 'medicine'].every((kind) =>
      rows.some(
        (r) =>
          r.date === date && r.kind === kind && r.medicationComplete !== false,
      ),
    ),
  ).length;
  const values = {
    voyage: progress.totalDays,
    exercise: days('exercise'),
    steps,
    meal: days('meal'),
    medicine: days('medicine'),
    balance,
  };
  return BADGE_SERIES.map((series) => {
    const value = values[series.id],
      tiers = series.goals.map((goal, index) => ({
        goal,
        index,
        name: series.names[index],
        metal: BADGE_LEVELS[index],
        earned: value >= goal,
      }));
    const earned = tiers.filter((t) => t.earned).length,
      next = tiers.find((t) => !t.earned) || null;
    return {
      ...series,
      value,
      tiers,
      earned,
      next,
      current: tiers[Math.max(earned - 1, 0)],
    };
  });
}
export type BadgeCollection = ReturnType<typeof achievementCollections>[number];
