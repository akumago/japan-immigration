import crimeHubs from '../data/crimeHubs.json' with { type: 'json' };

const HUB_SITE_URL = 'https://endearing-blini-b688ce.netlify.app';

export function formatMonthLabel(ym) {
  const m = String(ym || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(ym || '');
  return `${m[1]}年${Number(m[2])}月`;
}

function combinedSearchText(item) {
  return `${item.title || ''} ${item.summary || ''} ${item.locationBasis || ''} ${item.evidence?.suspect || ''} ${item.crimeCategory || ''}`;
}

export function getMonthDefinitions(items) {
  const monthCounts = new Map();
  for (const item of items) {
    const ym = String(item.date || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(ym)) {
      monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
    }
  }
  return Array.from(monthCounts.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((ym) => {
      const jp = formatMonthLabel(ym);
      return {
        slug: ym,
        month: ym,
        label: `${jp}の外国人犯罪報道`,
        seoKeyword: `外国人犯罪 ${jp},外国人 逮捕 まとめ ${jp},外国人事件 ${ym}`,
        guidePath: '/analysis/crime-statistics/',
        guideLabel: '年次統計・検挙率データを見る',
      };
    });
}

export function getHubDefinition(items, mode, slug) {
  if (mode === 'category') return crimeHubs.categories.find((c) => c.slug === slug) || null;
  if (mode === 'stage') return crimeHubs.stages.find((s) => s.slug === slug) || null;
  if (mode === 'topic') return crimeHubs.topics.find((t) => t.slug === slug) || null;
  if (mode === 'area') return crimeHubs.areas.find((a) => a.slug === slug) || null;
  if (mode === 'cross') return crimeHubs.cross.find((x) => x.slug === slug) || null;
  if (mode === 'month') return getMonthDefinitions(items).find((m) => m.slug === slug) || null;
  return null;
}

export function filterItemsByHub(items, mode, defOrSlug) {
  const def = typeof defOrSlug === 'string' ? getHubDefinition(items, mode, defOrSlug) : defOrSlug;
  if (!def) return [];
  if (mode === 'category') return items.filter((i) => i.crimeCategory === def.category);
  if (mode === 'stage') return items.filter((i) => i.stage === def.stage);
  if (mode === 'month') return items.filter((i) => String(i.date || '').startsWith(def.month));
  if (mode === 'topic' || mode === 'area') {
    const re = new RegExp(def.pattern, 'i');
    return items.filter((i) => re.test(combinedSearchText(i)));
  }
  if (mode === 'cross') {
    return items.filter((i) => {
      if (def.location && i.location !== def.location) return false;
      if (def.nationality && i.nationality !== def.nationality) return false;
      if (def.crimeCategory && i.crimeCategory !== def.crimeCategory) return false;
      return true;
    });
  }
  return [];
}

function topEntries(map, limit = 3) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function summarizeHubItems(items, matched) {
  const natMap = new Map();
  const prefMap = new Map();
  const catMap = new Map();
  const stageMap = new Map();
  let latestDate = '';
  for (const item of matched) {
    if (item.date && item.date > latestDate) latestDate = item.date;
    const nat = item.nationality || '外国籍';
    const pref = item.location || '国内';
    const cat = item.crimeCategory || 'その他刑事事件';
    const stg = item.stage || '逮捕';
    natMap.set(nat, (natMap.get(nat) || 0) + 1);
    prefMap.set(pref, (prefMap.get(pref) || 0) + 1);
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
    stageMap.set(stg, (stageMap.get(stg) || 0) + 1);
  }
  const sharePct = items.length > 0 ? ((matched.length * 100) / items.length).toFixed(1) : '0.0';
  return {
    totalAll: items.length,
    count: matched.length,
    sharePct,
    latestDate: latestDate || '最新',
    topNats: topEntries(natMap, 8),
    topPrefs: topEntries(prefMap, 8),
    topCats: topEntries(catMap, 8),
    topStages: topEntries(stageMap, 8),
  };
}

export function buildHubSeoMeta(items, mode, def, matched) {
  const stats = summarizeHubItems(items, matched);
  const topNatText = stats.topNats.slice(0, 3).map(([k, v]) => `${k}(${v}件)`).join('・');
  const topPrefText = stats.topPrefs.slice(0, 3).map(([k, v]) => `${k}(${v}件)`).join('・');
  const pathUrl = `/analysis/crime-news/${mode}/${def.slug}/`;

  let badge = '📂 分野別アーカイブ';
  let title = `${def.label}の外国人犯罪ニュース一覧（全${stats.count}件）| 日本の岐路`;
  let h1 = `${def.label}の外国人事件・逮捕報道一覧（全${stats.count}件）`;
  let desc = `全国の地方紙・テレビ局・警察発表から自動集計した${def.label}の事件報道全${stats.count}件（全体${stats.totalAll}件中${stats.sharePct}%・最新${stats.latestDate}）。上位国籍：${topNatText}／上位地域：${topPrefText}。`;
  let leadParagraph = `当サイトの全自動事件データベース（累計${stats.totalAll}件）のうち、「${def.label}」に該当する国内報道は${stats.count}件（全体の${stats.sharePct}%、最新収録日：${stats.latestDate}）です。報道されている国籍別の上位は${topNatText}、発生・検挙地域の上位は${topPrefText}となっています。`;

  if (mode === 'stage' && def.slug === 'non-prosecution') {
    badge = '⚖️ 司法処分・不起訴ニュースアーカイブ';
    title = `外国人 不起訴ニュース一覧【毎日更新】処分保留・起訴猶予（全${stats.count}件）| 日本の岐路`;
    h1 = `外国人被疑者の「不起訴・処分保留」ニュース一覧（全${stats.count}件）`;
    desc = `【${stats.latestDate}最新】日本国内で逮捕後に不起訴処分（起訴猶予・嫌疑不十分・処分保留）となった外国人事件の報道一覧全${stats.count}件。上位国籍：${topNatText}。検察判断の背景解説も併載。`;
    leadParagraph = `逮捕後に検察庁が不起訴（起訴猶予・嫌疑不十分等）と判断し報道された国内外国人事件は全${stats.count}件（全体の${stats.sharePct}%）収録されています。法務省『犯罪白書』に基づく統計上の起訴率の実態や、強制送還（退去強制）との違いについては詳細検証レポートもあわせてご覧ください。`;
  } else if (mode === 'topic') {
    badge = '🔥 注目手口・急上昇トピックDB';
    title = `${def.label} 外国人逮捕・事件一覧（全${stats.count}件）| 日本の岐路`;
    leadParagraph = `近年社会問題化している「${def.label}」をめぐる日本国内の外国人事件・検挙報道は${stats.count}件記録されています（最新日：${stats.latestDate}）。主な国籍は${topNatText}、主な発生地域は${topPrefText}です。`;
  } else if (mode === 'area') {
    badge = `📍 地域・拠点別事件DB（${def.pref}）`;
    title = `${def.label}の外国人犯罪・逮捕ニュース一覧（全${stats.count}件）| 日本の岐路`;
    h1 = `${def.label} 周辺の外国人事件・逮捕ニュース一覧（全${stats.count}件）`;
    leadParagraph = `${def.label}（${def.pref}）周辺で報道された外国籍被疑者による逮捕・起訴・事件ニュースは${stats.count}件収録されています（最新日：${stats.latestDate}）。国籍別の内訳上位は${topNatText}、主な罪種は${stats.topCats.slice(0, 3).map(([k, v]) => `${k}(${v}件)`).join('・')}です。`;
  } else if (mode === 'month') {
    badge = '🗓️ 月次リアルタイム集計レポート';
    title = `${def.label}まとめ【${stats.count}件・国籍別/県別一覧】| 日本の岐路`;
    h1 = `${def.label}・逮捕ニュース月次まとめ（全${stats.count}件）`;
    leadParagraph = `${formatMonthLabel(def.month)}に日本国内の地方紙・テレビ局・警察発表から記録された外国籍被疑者の事件報道は合計${stats.count}件（最終更新：${stats.latestDate}）です。国籍別の上位は${topNatText}、発生地域の上位は${topPrefText}となりました。`;
  } else if (mode === 'cross') {
    badge = '🔍 国籍×地域／罪種 クロス分析DB';
    title = `${def.label}ニュース一覧（全${stats.count}件）| 日本の岐路`;
    h1 = `${def.label} 関連ニュース一覧（全${stats.count}件）`;
  }

  const faqs = [
    {
      q: `${def.label}の外国人事件ニュースは現在何件収録されていますか？`,
      a: `現在、当サイトの自動集計データベース（全${stats.totalAll}件）に「${def.label}」関連の国内一次報道が${stats.count}件（全体の${stats.sharePct}%）記録されています（最新収録日：${stats.latestDate}）。`,
    },
    {
      q: `${def.label}ではどの国籍・地域が多く報じられていますか？`,
      a: `報道ベースの上位国籍は${topNatText || '複数国籍'}、上位の都道府県は${topPrefText || '全国各地'}です。すべて日本国内の新聞社・放送局・警察公式発表から外国籍被疑者と明記された事件のみを自動検証して集計しています。`,
    },
  ];

  return {
    mode,
    slug: def.slug,
    label: def.label,
    path: pathUrl,
    canonicalUrl: `${HUB_SITE_URL}${pathUrl}`,
    badge,
    title,
    h1,
    desc,
    keywords: def.seoKeyword || `${def.label},外国人犯罪,逮捕 ニュース,データベース`,
    leadParagraph,
    guidePath: def.guidePath || '/analysis/crime-statistics/',
    guideLabel: def.guideLabel || '外国人犯罪統計と公的データを詳しく見る',
    stats,
    faqs,
  };
}

export function getAllEligibleHubs(items) {
  const minHub = Number(crimeHubs.minHubCount) || 5;
  const minCross = Number(crimeHubs.minCrossCount) || 8;
  const list = [];

  const pushGroup = (mode, defs, minCount) => {
    for (const def of defs) {
      const matched = filterItemsByHub(items, mode, def);
      if (matched.length < minCount) continue;
      const meta = buildHubSeoMeta(items, mode, def, matched);
      list.push({ ...meta, def, items: matched });
    }
  };

  pushGroup('stage', crimeHubs.stages, minHub);
  pushGroup('topic', crimeHubs.topics, minHub);
  pushGroup('category', crimeHubs.categories, minHub);
  pushGroup('area', crimeHubs.areas, minHub);
  pushGroup('month', getMonthDefinitions(items), minHub);
  pushGroup('cross', crimeHubs.cross, minCross);

  return list;
}

export { crimeHubs };
