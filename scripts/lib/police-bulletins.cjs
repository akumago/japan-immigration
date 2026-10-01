'use strict';

const crypto = require('crypto');

const CHIBA_INDEX = 'https://www.police.pref.chiba.jp/kohoka/safe-life_trouble.html';
const SHIZUOKA_INDEX = 'https://www.pref.shizuoka.jp/police/about/kohomemo/index.html';

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(?:p|li|h[1-6]|div|dt|dd)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\r/g, '')
    .split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

function parseChibaIndex(html, baseUrl = CHIBA_INDEX) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']*orders_prefecture_\d+\.html(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const label = htmlToText(match[2]);
    const url = new URL(decodeEntities(match[1]), baseUrl).href;
    if (/最新事件・事故ファイル/.test(label) && !links.some((x) => x.url === url)) {
      links.push({ url, label });
    }
  }
  return links;
}

function parseChibaBulletin(html, url) {
  const text = htmlToText(html);
  const report = text.match(/最新事件・事故ファイル（(\d{4})年(\d{1,2})月(\d{1,2})日）/);
  if (!report) return [];
  const reportDate = `${report[1]}-${String(report[2]).padStart(2, '0')}-${String(report[3]).padStart(2, '0')}`;
  const contentStart = text.indexOf(report[0]) + report[0].length;
  const contentEnd = text.indexOf('前のページに戻る', contentStart);
  const content = text.slice(contentStart, contentEnd < 0 ? undefined : contentEnd);
  const blocks = content.split(/(?=・)/).map((x) => x.trim()).filter((x) => x.startsWith('・'));
  const candidates = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((x) => x.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const title = lines[0].replace(/^・/, '').trim();
    const bodyText = lines.slice(1).join(' ');
    if (!/(?:国籍|外国籍|外国人|中国籍|韓国籍|ベトナム籍|フィリピン籍|タイ籍|ブラジル籍|ネパール籍|イラン籍|パキスタン籍|ミャンマー籍|スリランカ籍|台湾籍|ドミニカ(?:共和国)?籍)/.test(`${title} ${bodyText}`)) continue;
    const recordKey = crypto.createHash('sha256').update(`${url}\n${title}\n${bodyText}`).digest('hex').slice(0, 20);
    candidates.push({
      id: recordKey,
      sourceRecordId: `chiba-police:${recordKey}`,
      sourceType: 'police_bulletin',
      sourceBody: `${title}。${bodyText}`,
      url,
      title,
      media: '千葉県警察',
      date: reportDate,
      pubDate: new Date(`${reportDate}T12:00:00+09:00`).toISOString(),
    });
  }
  return candidates;
}

async function collectChibaBulletins(httpRequest, { now = Date.now(), maxDays = 5 } = {}) {
  const indexResponse = await httpRequest(CHIBA_INDEX, { timeoutMs: 12000, maxBytes: 800000 });
  if (indexResponse.status < 200 || indexResponse.status >= 300) throw new Error(`chiba_index_http_${indexResponse.status}`);
  const pages = parseChibaIndex(indexResponse.body.toString('utf8'));
  if (!pages.length) throw new Error('no_chiba_bulletin_pages_found');
  const cutoff = now - maxDays * 24 * 60 * 60 * 1000;
  const candidates = [];
  let requestedPages = 1; // index取得後、最初の事件ページにも間隔を空ける
  for (const page of pages) {
    const date = page.label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!date) continue;
    const pageTime = new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), 23, 59, 59).getTime();
    if (pageTime < cutoff || pageTime > now + 24 * 60 * 60 * 1000) continue;
    if (requestedPages > 0) await new Promise((resolve) => setTimeout(resolve, 2500));
    const response = await httpRequest(page.url, { timeoutMs: 12000, maxBytes: 800000 });
    requestedPages++;
    if (response.status === 429 || response.status === 403) throw new Error(`chiba_bulletin_http_${response.status}`);
    if (response.status < 200 || response.status >= 300) continue;
    candidates.push(...parseChibaBulletin(response.body.toString('utf8'), page.url));
  }
  return candidates;
}

function parseShizuokaIndex(html, { now = Date.now(), maxDays = 5, baseUrl = SHIZUOKA_INDEX } = {}) {
  const links = [];
  const htmlText = String(html || '');
  const nowJst = new Date(now + 9 * 60 * 60 * 1000);
  const currentYear = nowJst.getUTCFullYear();
  const currentMonth = nowJst.getUTCMonth() + 1;
  const cutoff = now - maxDays * 24 * 60 * 60 * 1000;
  const re = /<a\b[^>]*href=["']([^"']*\/police\/about\/kohomemo\/\d+\.html(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(htmlText))) {
    const label = htmlToText(match[2]);
    const dateMatch = label.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    const year = month > currentMonth ? currentYear - 1 : currentYear;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timestamp = new Date(`${date}T23:59:59+09:00`).getTime();
    if (timestamp < cutoff || timestamp > now + 24 * 60 * 60 * 1000) continue;
    const url = new URL(decodeEntities(match[1]), baseUrl).href;
    if (!links.some((item) => item.url === url)) links.push({ url, date });
  }
  return links;
}

function parseShizuokaBulletin(html, url, date) {
  const rows = String(html || '').match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const candidates = [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => htmlToText(m[1]));
    if (cells.length < 4 || !/^\d+$/.test(cells[0])) continue;
    const title = cells[1].trim();
    const unit = cells[2].trim();
    const body = cells.slice(3).join(' ').trim();
    const sourceBody = `${title}。${unit}警察署発表。${body}`;
    if (!/(?:国籍|外国籍|外国人|中国籍|韓国籍|ベトナム籍|フィリピン籍|タイ籍|ブラジル籍|ネパール籍|イラン籍|パキスタン籍|ミャンマー籍|スリランカ籍|台湾籍|ドミニカ(?:共和国)?籍|中国人|韓国人|ベトナム人|フィリピン人|タイ人|ブラジル人|ネパール人|ペルー国籍)/.test(sourceBody)) continue;
    const recordKey = crypto.createHash('sha256').update(`${url}\n${cells.join('\n')}`).digest('hex').slice(0, 20);
    candidates.push({
      id: recordKey,
      sourceRecordId: `shizuoka-police:${recordKey}`,
      sourceType: 'police_bulletin',
      sourceBody,
      url,
      title,
      media: '静岡県警察',
      date,
      pubDate: new Date(`${date}T12:00:00+09:00`).toISOString(),
    });
  }
  return candidates;
}

async function collectShizuokaBulletins(httpRequest, { now = Date.now(), maxDays = 5, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const indexResponse = await httpRequest(SHIZUOKA_INDEX, { timeoutMs: 12000, maxBytes: 800000 });
  if (indexResponse.status < 200 || indexResponse.status >= 300) throw new Error(`shizuoka_index_http_${indexResponse.status}`);
  const pages = parseShizuokaIndex(indexResponse.body.toString('utf8'), { now, maxDays });
  const candidates = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) await pause(2500);
    const response = await httpRequest(pages[i].url, { timeoutMs: 12000, maxBytes: 800000 });
    if (response.status === 429 || response.status === 403) throw new Error(`shizuoka_bulletin_http_${response.status}`);
    if (response.status < 200 || response.status >= 300) continue;
    candidates.push(...parseShizuokaBulletin(response.body.toString('utf8'), pages[i].url, pages[i].date));
  }
  return candidates;
}

module.exports = { CHIBA_INDEX, SHIZUOKA_INDEX, parseChibaIndex, parseChibaBulletin, collectChibaBulletins, parseShizuokaIndex, parseShizuokaBulletin, collectShizuokaBulletins };
