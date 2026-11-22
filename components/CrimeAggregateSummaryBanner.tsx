import React, { useMemo } from 'react';
import newsData from '../data/newsData.json';

interface RawDateItem {
  date?: string;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function calcCalendarSpan(startStr: string, endStr: string) {
  const s = parseYmd(startStr);
  const e = parseYmd(endStr);
  if (!s || !e) {
    return { months: 0, days: 0, totalDays: 0 };
  }

  const sUtc = Date.UTC(s.y, s.m - 1, s.d);
  const eUtc = Date.UTC(e.y, e.m - 1, e.d);
  const totalDays = Math.max(1, Math.round((eUtc - sUtc) / 86400000) + 1);

  let months = (e.y - s.y) * 12 + (e.m - s.m);
  let days = e.d - s.d;
  if (days < 0) {
    months -= 1;
    // 終了月の前月の日数を加算して残日数を算出
    const prevMonthLastDay = new Date(Date.UTC(e.y, e.m - 1, 0)).getUTCDate();
    days += prevMonthLastDay;
  }

  return { months: Math.max(0, months), days: Math.max(0, days), totalDays };
}

function formatJaDate(ymd: string): string {
  const p = parseYmd(ymd);
  return p ? `${p.y}年${p.m}月${p.d}日` : ymd;
}

export const CrimeAggregateSummaryBanner: React.FC = () => {
  const summary = useMemo(() => {
    const items = newsData as RawDateItem[];
    const dates = items
      .map((i) => i.date || '')
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    const startDate = dates[0] || '';
    const endDate = dates[dates.length - 1] || '';
    const span = calcCalendarSpan(startDate, endDate);

    return {
      totalCount: items.length,
      startDate,
      endDate,
      ...span,
    };
  }, []);

  if (!summary.startDate || !summary.endDate) return null;

  return (
    <div
      aria-label="外国人犯罪報道データベース集計期間・件数サマリー"
      className="mb-8 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#111827] to-slate-900/90 border border-white/10 px-6 py-4 shadow-xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left items-center">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">集計対象期間</div>
          <div className="text-sm md:text-base font-bold text-white font-mono">
            {formatJaDate(summary.startDate)} 〜 {formatJaDate(summary.endDate)}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">累積集計期間の長さ</div>
          <div className="text-sm md:text-base font-bold text-amber-300">
            {summary.months}ヶ月{summary.days}日
            <span className="ml-2 text-xs font-normal text-gray-400">
              （通算 {summary.totalDays} 日間）
            </span>
          </div>
        </div>

        <div className="md:text-right">
          <div className="text-xs font-semibold text-gray-400 mb-1">現在の累計収録件数</div>
          <div className="text-lg md:text-xl font-black text-red-400 font-mono">
            全 {summary.totalCount} 件
            <span className="ml-2 text-xs font-normal text-gray-400">（更新ごとに自動変動）</span>
          </div>
        </div>
      </div>
    </div>
  );
};
