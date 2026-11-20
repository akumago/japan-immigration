import React from 'react';
import { Link } from 'react-router-dom';
import newsData from '../data/newsData.json';
import crimeSegments from '../data/crimeSegments.json';
import { getAllEligibleHubs, type HubNewsItem } from '../lib/crimeHubs.mjs';

const ITEMS = newsData as HubNewsItem[];

interface CrimeHubLinksSectionProps {
  variant?: 'home' | 'archive';
}

export const CrimeHubLinksSection: React.FC<CrimeHubLinksSectionProps> = ({ variant = 'home' }) => {
  const eligible = getAllEligibleHubs(ITEMS);
  const nonProsCount = ITEMS.filter(i => i.stage === '不起訴').length;

  const byMode = {
    stage: eligible.filter(h => h.mode === 'stage'),
    topic: eligible.filter(h => h.mode === 'topic'),
    month: eligible.filter(h => h.mode === 'month'),
    area: eligible.filter(h => h.mode === 'area'),
    cross: eligible.filter(h => h.mode === 'cross'),
    category: eligible.filter(h => h.mode === 'category')
  };

  const activePrefs = Object.entries(crimeSegments.prefectures || {})
    .map(([slug, name]) => ({
      slug,
      name: String(name),
      count: ITEMS.filter(i => i.prefecture === name || i.location === name || (i.location && i.location.includes(String(name)))).length
    }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const activeNats = Object.entries(crimeSegments.nationalities || {})
    .map(([slug, name]) => ({
      slug,
      name: String(name),
      count: ITEMS.filter(i => i.nationality && i.nationality.includes(String(name))).length
    }))
    .filter(n => n.count > 0)
    .sort((a, b) => b.count - a.count);

  const prefDisplay = variant === 'home' ? activePrefs.slice(0, 12) : activePrefs;
  const natDisplay = variant === 'home' ? activeNats.slice(0, 10) : activeNats;
  const catDisplay = variant === 'home' ? byMode.category.slice(0, 12) : byMode.category;

  return (
    <section
      aria-label="外国人犯罪報道トピック・地域・国籍別特集インデックス"
      className="mt-12 bg-slate-900/75 border border-white/10 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-amber-400 mb-1">
            DATA-DRIVEN TOPIC HUBS & FACT-CHECKS
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            テーマ別検証・罪種・地域・国籍別アーカイブ索引（全{ITEMS.length}件集計）
          </h2>
        </div>
        <Link
          to="/analysis/crime-news/"
          className="text-xs sm:text-sm font-semibold text-red-300 hover:text-red-200 underline decoration-red-700/60"
        >
          犯罪速報データベース全件を見る →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/analysis/non-prosecution/"
          className="group bg-gradient-to-br from-rose-950/60 to-slate-950/90 border border-rose-700/40 hover:border-rose-500/70 rounded-xl p-4 transition-all"
        >
          <div className="text-xs font-semibold text-rose-300 mb-1">制度解説 × 実録一覧</div>
          <div className="text-sm sm:text-base font-bold text-white group-hover:text-rose-200 mb-1">
            外国人事件の「不起訴」はなぜ？({nonProsCount}件)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            起訴便宜主義・通訳期限・強制送還との関係を最新報道と照合して徹底解説
          </p>
        </Link>

        <Link
          to="/analysis/crime-rate-factcheck/"
          className="group bg-gradient-to-br from-amber-950/50 to-slate-950/90 border border-amber-700/40 hover:border-amber-500/70 rounded-xl p-4 transition-all"
        >
          <div className="text-xs font-semibold text-amber-300 mb-1">統計ファクトチェック</div>
          <div className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 mb-1">
            「外国人犯罪率デマ vs 1.72倍」検証
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            警察庁答弁(0.323% vs 0.188%)と「低い」説の計算式・分母の違いを比較
          </p>
        </Link>

        <Link
          to="/analysis/crime-statistics/"
          className="group bg-gradient-to-br from-blue-950/50 to-slate-950/90 border border-blue-700/40 hover:border-blue-500/70 rounded-xl p-4 transition-all"
        >
          <div className="text-xs font-semibold text-blue-300 mb-1">参院内閣委員会答弁</div>
          <div className="text-sm sm:text-base font-bold text-white group-hover:text-blue-200 mb-1">
            外国人犯罪統計・検挙率詳細グラフ
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            短期滞在者除外ベースでの治安リスクと欧州失敗事例の比較分析
          </p>
        </Link>

        <Link
          to="/analysis/social-security/"
          className="group bg-gradient-to-br from-emerald-950/50 to-slate-950/90 border border-emerald-700/40 hover:border-emerald-500/70 rounded-xl p-4 transition-all"
        >
          <div className="text-xs font-semibold text-emerald-300 mb-1">公費・生活保護・国保</div>
          <div className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-200 mb-1">
            社会保障・福祉財政への負担構造
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            国民健康保険未納・生活保護・医療費未収金問題の実態データ検証
          </p>
        </Link>
      </div>

      <div className="mb-8 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-bold text-amber-300 mb-2.5">
          2026年最新データ増設セクション（検索需要の高い主要検証トピック）
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/analysis/social-security/#notion-addendum-social-security" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-emerald-200 transition-colors">
            国保収納率 外国人63% vs 全体93%（未納5.29倍）
          </Link>
          <Link to="/analysis/summary-statistics/#notion-addendum-summary-statistics" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-sky-200 transition-colors">
            2026年6月末 在留外国人428万人（総人口3.5%）
          </Link>
          <Link to="/analysis/crime-statistics/#notion-addendum-crime-statistics" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-red-200 transition-colors">
            参院法務委質疑：ベトナム検挙構成比32.6% vs 在留18.2%
          </Link>
          <Link to="/analysis/uk-immigration-lesson/#notion-addendum-uk-immigration-lesson" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-200 transition-colors">
            欧州最新：イタリア・メストレ＆スウェーデン2026法案
          </Link>
          <Link to="/analysis/burial-controversy/#notion-addendum-burial-controversy" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-rose-200 transition-colors">
            宗教規範 vs 日本法の優先順位・神戸神社損壊事例
          </Link>
          <Link to="/analysis/national-security/#notion-addendum-national-security" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-purple-200 transition-colors">
            尖閣335日・JIIA沖縄分析・中国邦人拘束17人・日中世論87.7%
          </Link>
          <Link to="/analysis/simulation-model/#notion-addendum-simulation-model" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-cyan-200 transition-colors">
            外国人比率1%上限案（期待件数71.3%減）・みかん理論
          </Link>
          <Link to="/analysis/labor-mismatch/#notion-addendum-labor-mismatch" className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-lime-200 transition-colors">
            人手不足の6分解＆南アフリカ失業率33.7%(LU3 44%)対比
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs sm:text-sm">
        <div className="space-y-4">
          {byMode.stage.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                司法手続ステージ別（不起訴・再逮捕・判決など）
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {byMode.stage.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {byMode.topic.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                注目トピック・急増事犯特集
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {byMode.topic.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/50 text-red-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {byMode.month.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                月別アーカイブ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {byMode.month.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {byMode.area.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                局地エリア・重点地域ハブ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {byMode.area.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-sky-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {catDisplay.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                罪種別データ一覧（主要カテゴリ）
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {catDisplay.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-amber-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {byMode.cross.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                地域 × 国籍 クロス集計ハブ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {byMode.cross.map(h => (
                  <Link
                    key={h.path}
                    to={h.path}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-purple-200 transition-colors"
                  >
                    {h.label} ({h.stats.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {prefDisplay.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                発生都道府県別アーカイブ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {prefDisplay.map(p => (
                  <Link
                    key={p.slug}
                    to={`/analysis/crime-news/pref/${p.slug}/`}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-sky-300 transition-colors"
                  >
                    {p.name} ({p.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {natDisplay.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                国籍別アーカイブ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {natDisplay.map(n => (
                  <Link
                    key={n.slug}
                    to={`/analysis/crime-news/nationality/${n.slug}/`}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-red-200 transition-colors"
                  >
                    {n.name} ({n.count})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
