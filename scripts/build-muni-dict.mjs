// 全国の市区町村辞書 (data/municipalities.json) を生成する。年1回程度、再実行すれば十分。
//
//   npm i --no-save @b4moss/jp-local-gov-id @b4moss/jp-local-gov-id-data
//   node scripts/build-muni-dict.mjs            # data/municipalities.json に出力
//   node scripts/build-muni-dict.mjs out.json   # 出力先を指定
//
// 出力形式: { _meta, map: { "川口市": ["埼玉県"], "府中市": ["東京都","広島県"], "中央区": [...] } }
// 複数の都道府県に存在する名称は配列に複数入る。ai-gate.cjs は「1件だけ」のときにしか採用しない。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalGovClient } from '@b4moss/jp-local-gov-id';
import dataset from '@b4moss/jp-local-gov-id-data';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = process.argv[2] || path.join(here, '..', 'data', 'municipalities.json');

const client = await createLocalGovClient({ data: dataset });
const map = new Map();
const add = (name, pref) => {
  if (!name) return;
  const set = map.get(name) || new Set();
  set.add(pref);
  map.set(name, set);
};

let rows = 0;
for (const p of client.listPrefectures()) {
  const munis = await client.listMunicipalitiesByPrefecture(p.code);
  for (const m of munis) {
    const name = String(m.name || '').normalize('NFKC').replace(/\s+/g, '');
    if (!name) continue;
    rows++;
    add(name, p.name);
    // 政令指定都市の区: 「札幌市中央区」→ 区名だけの「中央区」も登録（複数県にまたがるので曖昧扱いになる）
    const ward = name.match(/^.+市(.+区)$/);
    if (ward) add(ward[1], p.name);
  }
}

const obj = {};
for (const [k, v] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ja'))) obj[k] = [...v];
const ambiguous = Object.values(obj).filter((v) => v.length > 1).length;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ _meta: { generatedAt: new Date().toISOString(), source: '@b4moss/jp-local-gov-id-data', rows, keys: map.size, ambiguous }, map: obj }),
  'utf-8'
);
console.log(`rows=${rows} keys=${map.size} ambiguous=${ambiguous} -> ${outPath}`);
