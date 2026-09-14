import { useState } from 'react';
import { Check, ChevronRight, Lock, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import {
  achievementCollections,
  type BadgeCollection,
} from '../lib/achievements';
import type { VoyageProgress } from '../lib/voyage';
import { BadgeArt } from './badge-art';
import './achievement-gallery.css';
export function AchievementGallery({ progress }: { progress: VoyageProgress }) {
  const collections = achievementCollections(progress),
    earned = collections.reduce((n, s) => n + s.earned, 0);
  const [selection, setSelection] = useState<{
    id: string;
    tier: number;
  } | null>(null);
  const chosen = selection
      ? collections.find((s) => s.id === selection.id)
      : null,
    medal = chosen && selection ? chosen.tiers[selection.tier] : null;
  const closest = collections
    .filter((s) => s.next)
    .sort((a, b) => b.value / b.next!.goal - a.value / a.next!.goal)[0];
  return (
    <div className="achievement-gallery">
      <header className="collection-hero">
        <div className="collection-hero-copy">
          <span className="voyage-eyebrow">健康航程 · 成就收藏館</span>
          <h1>把日常，收藏成光</h1>
          <p>每一份記錄，都讓下一枚徽章更近一點。</p>
          <div className="collection-count">
            <strong>
              {earned}
              <small>／30</small>
            </strong>
            <span>
              枚徽章已解鎖
              <br />6 個系列，慢慢收集
            </span>
          </div>
        </div>
        <div className="collection-hero-art">
          <BadgeArt series="voyage" tier={4} />
          <span>照自己的步調，走出閃亮航程</span>
        </div>
      </header>
      {closest && (
        <div className="collection-next">
          <Sparkles aria-hidden />
          <div>
            <strong>下一枚值得期待：{closest.next!.name}</strong>
            <span>
              再累積 {(closest.next!.goal - closest.value).toLocaleString()}{' '}
              {closest.unit}，解鎖{closest.next!.metal}徽章
            </span>
          </div>
          <a
            href={'#series-' + closest.id}
            aria-label={`查看${closest.name}升級進度`}
          >
            <ChevronRight aria-hidden />
          </a>
        </div>
      )}
      <div className="collection-heading">
        <h2>我的系列收藏</h2>
        <span>點選徽章，欣賞細節與解鎖條件</span>
      </div>
      <div className="collection-series-grid">
        {collections.map((series) => (
          <Series
            key={series.id}
            series={series}
            onSelect={(tier) => setSelection({ id: series.id, tier })}
          />
        ))}
      </div>
      <p className="voyage-reward-note">
        紀念章獎勵持續紀錄；未服用或有疑問的如實回報，也同樣值得肯定。中斷不會歸零，同一天重複儲存不會重複累積；修改或刪除紀錄後，進度依現有資料重新計算。
      </p>
      <Dialog
        open={!!chosen}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      >
        <DialogContent className="prod-dialog collection-dialog">
          {chosen && medal && (
            <>
              <span className="voyage-eyebrow">
                {chosen.name} · {medal.metal}級
              </span>
              <BadgeArt series={chosen.id} tier={medal.index} />
              <DialogTitle>{medal.name}</DialogTitle>
              <DialogDescription>
                累積 {medal.goal.toLocaleString()} {chosen.unit}
                {chosen.id === 'steps'
                  ? '已確認步數'
                  : chosen.id === 'balance'
                    ? '完成三項紀錄'
                    : '紀錄'}
                即可解鎖。
              </DialogDescription>
              <p className="collection-dialog-state">
                {medal.earned ? (
                  <>
                    <Check aria-hidden />
                    已收藏，謝謝每一天的自己
                  </>
                ) : (
                  <>
                    <Lock aria-hidden />
                    還差{' '}
                    {Math.max(
                      0,
                      medal.goal - chosen.value,
                    ).toLocaleString()}{' '}
                    {chosen.unit}
                  </>
                )}
              </p>
              <p>
                {chosen.subtitle}。
                {chosen.id === 'medicine'
                  ? '這枚徽章代表回報參與，不代表服藥達標。'
                  : ''}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Series({
  series,
  onSelect,
}: {
  series: BadgeCollection;
  onSelect: (tier: number) => void;
}) {
  const current = series.current;
  return (
    <section
      className={`collection-series series-${series.id}`}
      id={'series-' + series.id}
      aria-label={series.name}
    >
      <div className="collection-series-top">
        <button
          className="collection-showcase"
          onClick={() => onSelect(current.index)}
          aria-label={`欣賞${current.name}徽章${series.earned ? '，已解鎖' : '，尚未解鎖'}`}
        >
          <BadgeArt
            series={series.id}
            tier={current.index}
            locked={!series.earned}
          />
        </button>
        <div>
          <span className="collection-level">
            {series.earned
              ? `${current.metal}級 · ${series.earned}／5 枚`
              : '等待第一枚徽章'}
          </span>
          <h2>{series.name}</h2>
          <p>{series.subtitle}</p>
          <strong className="collection-value">
            {series.value.toLocaleString()}
            <small> {series.unit}</small>
          </strong>
        </div>
      </div>
      <div className="collection-progress">
        <div>
          <span>
            {series.next ? `下一級：${series.next.name}` : '全系列已收藏'}
          </span>
          <strong>
            {series.next
              ? `${Math.round(Math.min(series.value / series.next.goal, 1) * 100)}％`
              : '5／5'}
          </strong>
        </div>
        <Progress
          value={
            series.next
              ? Math.min(series.value / series.next.goal, 1) * 100
              : 100
          }
          aria-label={`${series.name}，${series.value} ${series.unit}，下一級 ${series.next?.goal || current.goal} ${series.unit}`}
        />
      </div>
      <div className="collection-tier-row">
        {series.tiers.map((t) => (
          <button
            key={t.index}
            className={`collection-tier ${t.earned ? 'is-earned' : ''} ${series.next?.index === t.index ? 'is-next' : ''}`}
            onClick={() => onSelect(t.index)}
            aria-label={`${t.metal}級，${t.name}，累積 ${t.goal} ${series.unit}，${t.earned ? '已解鎖' : '未解鎖'}`}
          >
            <BadgeArt series={series.id} tier={t.index} locked={!t.earned} />
            <span>{t.metal}</span>
            <small>{t.goal.toLocaleString()}</small>
            <i>
              {t.earned ? (
                <Check aria-hidden />
              ) : series.next?.index === t.index ? (
                '下一枚'
              ) : (
                <Lock aria-hidden />
              )}
            </i>
          </button>
        ))}
      </div>
    </section>
  );
}
