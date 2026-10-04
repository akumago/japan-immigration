'use strict';

const { natOccurrences, verifyHeadlineOnly } = require('./ai-gate.cjs');

const FOREIGN_TERMS = /外国人|外国籍|(?:中国|韓国|台湾|ベトナム|フィリピン|タイ|インド|ブラジル|ネパール|イラン|パキスタン|カンボジア|チリ)(?:国籍|籍|人|出身)/;
const JAPANESE_TERMS = /日本人|日本国籍/;
const JAPANESE_SUSPECT = /日本(?:人|国籍)(?:の)?(?:男|女|男性|女性|少年|少女|容疑者|被告|夫婦|男女)(?:.{0,18}(?:逮捕|送検|起訴|再逮捕|判決|被告))?|(?:逮捕|送検|起訴)されたのは日本(?:人|国籍)/;
const OVERSEAS_TERMS = /海外で(?:起き|発生|逮捕|摘発|起訴|事件)|(?:米国|アメリカ|韓国|中国|タイ|インド|カンボジア|ベトナム|フィリピン|英国|フランス|ドイツ)(?:国内)?で(?:起き|発生|逮捕|摘発|起訴)|外国当局(?:が|に).{0,12}(?:逮捕|摘発|起訴)/;
const SUSPECT_TERMS = /逮捕|容疑|疑い|送検|送致|起訴|再逮捕|被告|容疑者|犯行/;

/** Prioritization only; never decides whether an article is publishable. */
function classifyLegacyRisk(item) {
  const title = String(item.title || '').normalize('NFKC');
  const reasons = [];
  const occurrences = natOccurrences(title);
  const suspectNationality = occurrences.some((occurrence) => occurrence.suspect);
  const foreign = occurrences.length > 0 || FOREIGN_TERMS.test(title);
  const japaneseMention = JAPANESE_TERMS.test(title);
  const japanese = JAPANESE_SUSPECT.test(title);
  const victim = occurrences.some((occurrence) => occurrence.victim);
  const overseas = OVERSEAS_TERMS.test(title);

  if (japanese && foreign) reasons.push('japanese_suspect_and_foreign_person_both_mentioned');
  else if (japaneseMention && foreign) reasons.push('japanese_and_foreign_people_both_mentioned_role_unclear');
  if (victim && foreign) reasons.push('foreign_person_may_be_victim');
  if (overseas) reasons.push('possible_overseas_event');
  if (!suspectNationality && foreign) reasons.push('foreign_nationality_not_clearly_linked_to_suspect');
  if (!foreign) reasons.push('no_explicit_foreign_person_in_title');
  if (item.location === '全国' || !item.location) reasons.push('location_not_specific');

  const high = (japanese && foreign) || (victim && foreign) || overseas || (foreign && !suspectNationality && SUSPECT_TERMS.test(title));
  const medium = !high && (japaneseMention && foreign || item.location === '全国' || !item.location || !SUSPECT_TERMS.test(title) || !foreign);
  return {
    tier: high ? 'high' : medium ? 'medium' : 'low',
    reasons: reasons.length ? reasons : ['explicit_suspect_nationality_and_japan_location_in_title'],
  };
}

function compareLegacyAuditPriority(a, b) {
  const aHeadlineFail = !verifyHeadlineOnly(a.item.title).verified;
  const bHeadlineFail = !verifyHeadlineOnly(b.item.title).verified;
  if (aHeadlineFail !== bHeadlineFail) return aHeadlineFail ? -1 : 1;
  const tierRank = { high: 0, medium: 1, low: 2 };
  const tierDiff = tierRank[a.risk.tier] - tierRank[b.risk.tier];
  if (tierDiff) return tierDiff;
  return String(a.item.date).localeCompare(String(b.item.date));
}

module.exports = { classifyLegacyRisk, compareLegacyAuditPriority };
