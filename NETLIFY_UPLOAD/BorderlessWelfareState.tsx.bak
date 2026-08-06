import { useEffect, useRef, useState } from "react";

const PLUS_BARS = [
  { name: "🇯🇵 日本", val: 477, pct: 95, color: "#ffd700", grad: "linear-gradient(90deg,#1a4a8a,#ffd700)", bold: true },
  { name: "北米（米・加）", val: 521, pct: 100, color: "#2ecc71", grad: "linear-gradient(90deg,#0d4a20,#2ecc71)" },
  { name: "北欧", val: 506, pct: 96, color: "#2ecc71", grad: "linear-gradient(90deg,#0d4a20,#2ecc71)" },
  { name: "英国・アイルランド", val: 437, pct: 83, color: "#2ecc71", grad: "linear-gradient(90deg,#0d4a20,#2ecc71)" },
  { name: "オセアニア", val: 433, pct: 82, color: "#2ecc71", grad: "linear-gradient(90deg,#0d4a20,#2ecc71)" },
  { name: "フランス", val: 379, pct: 72, color: "#2ecc71", grad: "linear-gradient(90deg,#0d4a20,#2ecc71)" },
  { name: "韓国・台湾・HK・SG", val: 39, pct: 8, color: "#4fc3f7", grad: "linear-gradient(90deg,#0a3a5a,#4fc3f7)" },
];

const MINUS_BARS = [
  { name: "中東欧（CEE）", val: -110, pct: 10, color: "#ff9800", grad: "linear-gradient(270deg,#7b3800,#ff9800)" },
  { name: "トルコ", val: -549, pct: 48, color: "#e74c3c", grad: "linear-gradient(270deg,#7b0e1e,#c8102e)" },
  { name: "アフリカ（モロッコ除く）", val: -603, pct: 53, color: "#e74c3c", grad: "linear-gradient(270deg,#7b0e1e,#c8102e)" },
  { name: "カリブ海", val: -614, pct: 54, color: "#e74c3c", grad: "linear-gradient(270deg,#7b0e1e,#c8102e)" },
  { name: "モロッコ", val: -806, pct: 71, color: "#ff4d4d", grad: "linear-gradient(270deg,#4a0010,#c8102e)", bold: true },
  { name: "ホルン・オブ・アフリカ", val: -1140, pct: 100, color: "#ff2020", grad: "linear-gradient(270deg,#3a0008,#c8102e)", bold: true },
];

const TABLE_ROWS = [
  { r: "オランダ人参照値", g1: "+199", g2: "-1", t: "+198", bold: true },
  { r: "全移民平均", g1: "-130", g2: "-140", t: "-270", bold: true },
  { r: "▼ 西洋系", header: true },
  { r: "北欧（デンマーク・スウェーデン・フィンランド）", g1: "+498", g2: "+8", t: "+506" },
  { r: "英国・アイルランド", g1: "+457", g2: "-20", t: "+437" },
  { r: "フランス", g1: "+396", g2: "-17", t: "+379" },
  { r: "北米（米国・カナダ）", g1: "+536", g2: "-15", t: "+521" },
  { r: "オセアニア", g1: "+472", g2: "-39", t: "+433" },
  { r: "中東欧（CEE）", g1: "-67", g2: "-43", t: "-110" },
  { r: "▼ アジア系", header: true },
  { r: "🇯🇵 日本", g1: "+440", g2: "+37", t: "+477", jp: true },
  { r: "韓国・台湾・HK・シンガポール", g1: "+38", g2: "+1", t: "+39" },
  { r: "イスラエル", g1: "+145", g2: "-24", t: "+121" },
  { r: "インドネシア", g1: "-9", g2: "-15", t: "-24" },
  { r: "アジア全体（日・インドネシア除く）", g1: "-252", g2: "-66", t: "-318" },
  { r: "トルコ", g1: "-326", g2: "-223", t: "-549", bold: true },
  { r: "▼ アフリカ・その他", header: true },
  { r: "南部アフリカ", g1: "+378", g2: "-31", t: "+346" },
  { r: "モロッコ", g1: "-389", g2: "-417", t: "-806", bold: true },
  { r: "アフリカ（モロッコ除く）", g1: "-306", g2: "-297", t: "-603" },
  { r: "ホルン・オブ・アフリカ・スーダン", g1: "-557", g2: "-583", t: "-1,140", bold: true },
  { r: "カリブ海", g1: "-363", g2: "-251", t: "-614" },
  { r: "ラテンアメリカ", g1: "-135", g2: "-111", t: "-246" },
];

const GEN2_PLUS = [
  { c: "🇯🇵 日本", g1: "+440", g2: "+37", g1col: "#ffd700", g2col: "#2ecc71" },
  { c: "北欧", g1: "+498", g2: "+8", g1col: "#2ecc71", g2col: "#2ecc71" },
  { c: "韓国・台湾・HK・SG", g1: "+38", g2: "+1", g1col: "#2ecc71", g2col: "#2ecc71" },
  { c: "北米", g1: "+536", g2: "-15", g1col: "#2ecc71", g2col: "#e74c3c" },
];
const GEN2_MINUS = [
  { c: "モロッコ", g1: "-389", g2: "-417", g1col: "#e74c3c", g2col: "#ff4d4d" },
  { c: "トルコ", g1: "-326", g2: "-223", g1col: "#e74c3c", g2col: "#e74c3c" },
  { c: "ホルン・オブ・アフリカ", g1: "-557", g2: "-583", g1col: "#ff4d4d", g2col: "#ff2020" },
  { c: "アフリカ全体", g1: "-306", g2: "-297", g1col: "#e74c3c", g2col: "#e74c3c" },
];

const JAPAN_RISKS = [
  {
    icon: "🏥",
    title: "国民健康保険・介護保険",
    items: [
      "外国人の保険料滞納率は一部地域で日本人平均を大幅に上回る",
      "医療目的での高齢親族呼び寄せによる高額医療利用",
      "「経営・管理」ビザ等を通じた短期加入・高額受診問題",
      "就労不能後の保険料未納と医療費受益のギャップ",
    ],
  },
  {
    icon: "🏦",
    title: "年金制度（国民年金・厚生年金）",
    items: [
      "短期就労・帰国による脱退一時金（制度上の「払い損」構造）",
      "将来の無年金外国人高齢者の増大と生活保護への転落リスク",
      "永住後の高齢化に伴う年金受給と保険料拠出のアンバランス",
      "家族帯同で来日した非就労配偶者の無年金問題",
    ],
  },
  {
    icon: "🆘",
    title: "生活保護・社会扶助",
    items: [
      "永住資格取得後に生活保護受給資格が事実上発生する制度的構造",
      "就労不能・高齢化・疾病時の長期受給リスク",
      "オランダ研究でも「統合失敗グループほど福祉依存が固定化」を確認",
      "第2世代の教育格差が低収入→生活保護という連鎖を生む可能性",
    ],
  },
  {
    icon: "👴",
    title: "老後・介護コスト",
    items: [
      "高齢化した移民の医療・介護コストはライフサイクル後半に集中",
      "オランダ研究でもこの「後半コスト急増」パターンが確認されている",
      "介護保険料の拠出期間が短い場合の受益とのアンバランス",
      "日本語コミュニケーション困難による介護コストの追加的増大",
    ],
  },
];

function colOf(v: string) {
  if (v.startsWith("+")) return "#2ecc71";
  if (v.startsWith("-")) return "#e74c3c";
  return "rgba(255,255,255,.4)";
}

const S = {
  wrap: {
    fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif",
    background: "linear-gradient(160deg,#08080f 0%,#0f0a1a 50%,#080f08 100%)",
    color: "#f0f0f0",
    borderRadius: 10,
    overflow: "hidden",
  } as React.CSSProperties,
  sec: {
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid rgba(255,255,255,.07)",
  } as React.CSSProperties,
  secHeading: {
    fontSize: ".6rem",
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,.3)",
    marginBottom: ".5rem",
    display: "flex",
    alignItems: "center",
    gap: ".5rem",
  },
  secHeadingLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,.07)",
  },
  subLabel: {
    fontSize: ".58rem",
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,.25)",
    margin: ".5rem 0 .35rem",
  },
  barRow: {
    display: "grid",
    gridTemplateColumns: "130px 1fr 56px",
    alignItems: "center",
    gap: ".5rem",
    marginBottom: ".4rem",
  } as React.CSSProperties,
  barName: {
    fontSize: ".72rem",
    color: "rgba(255,255,255,.7)",
    textAlign: "right" as const,
    lineHeight: 1.3,
  },
  track: {
    height: 18,
    background: "rgba(255,255,255,.06)",
    borderRadius: 3,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  fillBase: {
    position: "absolute" as const,
    top: 0,
    height: "100%",
    borderRadius: 3,
    transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
    width: 0,
  },
  divider: {
    border: "none",
    borderTop: "1px dashed rgba(255,255,255,.08)",
    margin: ".5rem 0",
  } as React.CSSProperties,
  insight: (col: string) =>
    ({
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.07)",
      borderLeft: `3px solid ${col}`,
      padding: ".75rem .9rem",
      borderRadius: "0 6px 6px 0",
      marginTop: ".75rem",
    } as React.CSSProperties),
  insLabel: (col: string) => ({
    fontSize: ".58rem",
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
    color: col,
    marginBottom: ".35rem",
  }),
  insText: {
    fontSize: ".76rem",
    color: "rgba(255,255,255,.65)",
    lineHeight: 1.75,
  } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: ".72rem" },
  th: (left?: boolean) =>
    ({
      fontSize: ".58rem",
      letterSpacing: 2,
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,.3)",
      padding: ".35rem .55rem",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      textAlign: (left ? "left" : "right") as React.CSSProperties["textAlign"],
    }),
  td: (right?: boolean, jp?: boolean, bold?: boolean) =>
    ({
      padding: ".4rem .55rem",
      borderBottom: "1px solid rgba(255,255,255,.04)",
      textAlign: (right ? "right" : "left") as React.CSSProperties["textAlign"],
      color: jp ? "#ffd700" : bold ? "#fff" : "rgba(255,255,255,.75)",
      fontWeight: bold ? 700 : 400,
      background: jp ? "rgba(230,200,0,.06)" : "transparent",
    }),
  gen2Grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: ".75rem",
    marginTop: ".75rem",
  } as React.CSSProperties,
  gen2Card: {
    background: "rgba(255,255,255,.02)",
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 6,
    padding: ".8rem .9rem",
  } as React.CSSProperties,
  gen2Row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: ".72rem",
    padding: ".28rem 0",
    borderBottom: "1px solid rgba(255,255,255,.04)",
  } as React.CSSProperties,
};

function SectionHeading({ label, color = "rgba(255,255,255,.3)" }: { label: string; color?: string }) {
  return (
    <div style={{ ...S.secHeading, color }}>
      <span>{label}</span>
      <div style={S.secHeadingLine} />
    </div>
  );
}

export default function BorderlessWelfareState() {
  const [anim, setAnim] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (e) => { if (e[0].isIntersecting) { setAnim(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={S.wrap}>

      {/* ── ヘッダー ── */}
      <div style={S.sec}>
        <div style={{ fontSize: ".6rem", letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: ".5rem" }}>
          Amsterdam University School of Economics — Borderless Welfare State (2023)
        </div>
        <div style={{ fontSize: "clamp(1.3rem,3vw,1.9rem)", fontWeight: 900, lineHeight: 1.1, color: "#fff", marginBottom: ".45rem" }}>
          移民の出身国別 <span style={{ color: "#c8102e" }}>生涯財政純貢献度</span>の真実
        </div>
        <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>
          オランダ全住民1,700万人の匿名マイクロデータによる世代会計分析。移民到着時から死亡（または帰国）までの
          生涯全体の財政貢献と負担を第1・第2世代にわたって算出。（×€1,000 / 2016年価格・永住前提）
        </div>
      </div>

      {/* ── KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        {[
          { n: "-€270万", l: "全移民平均\n生涯純負担", c: "#c8102e" },
          { n: "+€477万", l: "日本出身移民\n生涯純貢献", c: "#2ecc71" },
          { n: "-€1,140万", l: "最大負担\nホルン・オブ・アフリカ", c: "#ff4d4d" },
          { n: "+€198万", l: "オランダ人\n参照値", c: "#e8b84b" },
        ].map((k) => (
          <div key={k.n} style={{ background: "#09090f", padding: ".85rem .75rem", textAlign: "center" }}>
            <span style={{ fontSize: "clamp(1rem,2.5vw,1.45rem)", fontWeight: 900, display: "block", lineHeight: 1, color: k.c }}>{k.n}</span>
            <span style={{ fontSize: ".6rem", color: "rgba(255,255,255,.35)", marginTop: ".3rem", display: "block", lineHeight: 1.4, whiteSpace: "pre-line" }}>{k.l}</span>
          </div>
        ))}
      </div>

      {/* ── セクション1: 地域別比較チャート ── */}
      <div style={S.sec}>
        <SectionHeading label="01 — 出身地域別 生涯純貢献度（×€1,000）" />
        <div style={S.subLabel}>プラス貢献グループ</div>
        {PLUS_BARS.map((b) => (
          <div key={b.name} style={S.barRow}>
            <div style={{ ...S.barName, ...(b.bold ? { color: "#fff", fontWeight: 700 } : {}) }}>{b.name}</div>
            <div style={S.track}>
              <div style={{ ...S.fillBase, left: 0, background: b.grad, width: anim ? `${b.pct}%` : 0 }} />
            </div>
            <div style={{ fontSize: ".8rem", fontWeight: 700, textAlign: "right", color: b.color }}>{b.val > 0 ? `+${b.val}` : b.val}</div>
          </div>
        ))}
        <hr style={S.divider} />
        <div style={S.subLabel}>マイナス負担グループ</div>
        {MINUS_BARS.map((b) => (
          <div key={b.name} style={S.barRow}>
            <div style={{ ...S.barName, ...(b.bold ? { color: "#fff", fontWeight: 700 } : {}) }}>{b.name}</div>
            <div style={S.track}>
              <div style={{ ...S.fillBase, right: 0, background: b.grad, width: anim ? `${b.pct}%` : 0 }} />
            </div>
            <div style={{ fontSize: ".8rem", fontWeight: 700, textAlign: "right", color: b.color }}>{b.val}</div>
          </div>
        ))}
        <div style={S.insight("#e8b84b")}>
          <div style={S.insLabel("#e8b84b")}>読み取れること</div>
          <div style={S.insText}>
            日本出身移民（+477万€）は<strong style={{ color: "#fff" }}>全移民平均（-270万€）と比べ747万€の差</strong>。
            同じ「移民」でも出身地・文化・教育水準によって財政への影響は天と地ほど異なる。
          </div>
        </div>
      </div>

      {/* ── セクション2: 詳細データ表 ── */}
      <div style={S.sec}>
        <SectionHeading label="02 — 詳細データ Table 4.3（第1世代・第2世代・合計）" />
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th(true)}>移民背景（地域）</th>
                <th style={S.th()}>第1世代</th>
                <th style={S.th()}>第2世代</th>
                <th style={S.th()}>合計</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((r, i) => {
                if ((r as any).header) return (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding: ".22rem .55rem", fontSize: ".58rem", color: "rgba(255,255,255,.25)", letterSpacing: 2, textTransform: "uppercase" }}>{r.r}</td>
                  </tr>
                );
                return (
                  <tr key={i}>
                    <td style={S.td(false, (r as any).jp, r.bold)}>{r.r}</td>
                    <td style={{ ...S.td(true, false, r.bold), color: colOf(r.g1 || "") }}>{r.g1}</td>
                    <td style={{ ...S.td(true, false, r.bold), color: colOf(r.g2 || "") }}>{r.g2}</td>
                    <td style={{ ...S.td(true, false, r.bold), color: colOf(r.t || "") }}>{r.t}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={S.insight("#4fc3f7")}>
          <div style={S.insLabel("#4fc3f7")}>注目点</div>
          <div style={S.insText}>
            <strong style={{ color: "#fff" }}>日本は+477万€で全移民中トップクラス。</strong>
            モロッコ第2世代（-417）は第1世代（-389）より悪化——統合が進まず負担が世代を超えて拡大している。
          </div>
        </div>
      </div>

      {/* ── セクション3: 第2世代の真実 ── */}
      <div style={S.sec}>
        <SectionHeading label="03 — 第2世代データ：「次世代で改善する」は幻想か" color="#c8102e" />
        <div style={S.insight("#c8102e")}>
          <div style={S.insLabel("#c8102e")}>報告書の核心的結論</div>
          <div style={S.insText}>
            <strong style={{ color: "#fff" }}>第1世代が大幅マイナスのグループは、第2世代も大幅マイナスのまま。</strong>
            モロッコ・トルコ系では第2世代の負担が第1世代を上回るケースも確認。「次世代になれば大丈夫」はデータで完全に否定された。
          </div>
        </div>
        <div style={S.gen2Grid}>
          <div style={S.gen2Card}>
            <div style={{ fontSize: ".63rem", color: "#2ecc71", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: ".6rem" }}>第2世代も改善維持</div>
            {GEN2_PLUS.map((r) => (
              <div key={r.c} style={S.gen2Row}>
                <span style={{ color: "rgba(255,255,255,.75)" }}>{r.c}</span>
                <div style={{ display: "flex", gap: ".55rem", fontWeight: 700, fontSize: ".8rem" }}>
                  <span><span style={{ color: "#555", fontSize: ".63rem" }}>1世: </span><span style={{ color: r.g1col }}>{r.g1}</span></span>
                  <span><span style={{ color: "#555", fontSize: ".63rem" }}>2世: </span><span style={{ color: r.g2col }}>{r.g2}</span></span>
                </div>
              </div>
            ))}
          </div>
          <div style={S.gen2Card}>
            <div style={{ fontSize: ".63rem", color: "#e74c3c", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: ".6rem" }}>第2世代で悪化・固定化</div>
            {GEN2_MINUS.map((r) => (
              <div key={r.c} style={{ ...S.gen2Row, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <span style={{ color: "rgba(255,255,255,.75)" }}>{r.c}</span>
                <div style={{ display: "flex", gap: ".55rem", fontWeight: 700, fontSize: ".8rem" }}>
                  <span><span style={{ color: "#555", fontSize: ".63rem" }}>1世: </span><span style={{ color: r.g1col }}>{r.g1}</span></span>
                  <span><span style={{ color: "#555", fontSize: ".63rem" }}>2世: </span><span style={{ color: r.g2col }}>{r.g2}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.insight("#ffd700")}>
          <div style={S.insLabel("#ffd700")}>日本出身移民の特異性</div>
          <div style={S.insText}>
            日本出身移民は第2世代（+37）もプラスを維持する数少ないグループ。
            <strong style={{ color: "#fff" }}>教育投資・労働参加・社会規範への適応</strong>が世代を超えて継続している。
          </div>
        </div>
      </div>

      {/* ── セクション4: 日本への示唆 ── */}
      <div style={S.sec}>
        <SectionHeading label="04 — オランダのデータが日本に突きつける問い" color="#e8b84b" />
        <div style={{ display: "grid", gap: ".65rem" }}>
          {[
            {
              col: "#e8b84b",
              label: "01 — 誰を受け入れるかが全てを決定する",
              body: <>日本出身（+477万€）とホルン・オブ・アフリカ（-1,140万€）の差は<strong style={{ color: "#fff" }}>1,617万€</strong>。「移民は良い／悪い」の二項対立は無意味。<strong style={{ color: "#fff" }}>誰を・どの規模で・どの条件で</strong>が本質的な問いである。</>,
            },
            {
              col: "#c8102e",
              label: "02 — 育成就労制度が向かっている方向",
              body: <>育成就労が想定する受け入れ先はオランダデータでは<strong style={{ color: "#fff" }}>多くがマイナス貢献グループ</strong>に該当。低スキル受け入れは長期の社会保障負担を国民に転嫁する構造と同義。</>,
            },
            {
              col: "#4fc3f7",
              label: "03 — 少子化対策としての移民という欺瞞",
              body: <>報告書は明記——<strong style={{ color: "#fff" }}>移民の出生率も長期的には置換水準以下に低下する。</strong>移民は少子高齢化の根本解決にならない。必要なのは国民の手取りを増やし子育てしやすい経済環境を作ることである。</>,
            },
          ].map((it) => (
            <div key={it.label} style={{ ...S.insight(it.col), marginTop: 0 }}>
              <div style={S.insLabel(it.col)}>{it.label}</div>
              <div style={S.insText}>{it.body}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(200,16,46,.06)", border: "1px solid rgba(200,16,46,.14)", borderRadius: 6, padding: ".9rem 1rem", textAlign: "center", marginTop: ".9rem" }}>
          <div style={{ fontSize: ".58rem", letterSpacing: 3, textTransform: "uppercase", color: "#c8102e", marginBottom: ".45rem" }}>報告書の最終結論</div>
          <div style={{ fontWeight: 900, fontSize: "clamp(.85rem,2.5vw,1.2rem)", color: "#fff", letterSpacing: .5, lineHeight: 1.4 }}>
            "YOU CANNOT SIMULTANEOUSLY HAVE FREE IMMIGRATION AND A WELFARE STATE"
          </div>
          <div style={{ fontSize: ".63rem", color: "rgba(255,255,255,.35)", marginTop: ".4rem" }}>
            — Milton Friedman / Borderless Welfare State 報告書より引用
          </div>
        </div>
      </div>

      {/* ── セクション5: 日本固有の未計算リスク ── */}
      <div style={S.sec}>
        <SectionHeading label="05 — 日本固有の未計算リスク：さらに深刻な可能性" color="#ff6b35" />
        <div style={{ ...S.insight("#ff6b35"), marginTop: 0, marginBottom: "1rem" }}>
          <div style={S.insLabel("#ff6b35")}>重要な補足</div>
          <div style={S.insText}>
            上記のオランダデータは<strong style={{ color: "#fff" }}>日本固有の社会保障制度コストを含んでいない。</strong>
            日本では国民健康保険・年金・生活保護・介護保険という独自の制度が存在し、
            就労不能・高齢化・疾病時の財政負担は<strong style={{ color: "#fff" }}>オランダの試算をさらに上回る可能性がある。</strong>
            以下は日本独自の制度に基づく追加的リスク要因である。
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
          {JAPAN_RISKS.map((risk) => (
            <div key={risk.title} style={{ background: "rgba(255,107,53,.04)", border: "1px solid rgba(255,107,53,.15)", borderRadius: 6, padding: ".85rem .9rem" }}>
              <div style={{ fontSize: ".85rem", marginBottom: ".5rem", display: "flex", alignItems: "center", gap: ".4rem" }}>
                <span>{risk.icon}</span>
                <span style={{ fontWeight: 700, color: "#fff", fontSize: ".78rem" }}>{risk.title}</span>
              </div>
              <ul style={{ paddingLeft: "1rem", margin: 0 }}>
                {risk.items.map((item, i) => (
                  <li key={i} style={{ fontSize: ".7rem", color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: ".15rem" }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ ...S.insight("#ff6b35"), marginTop: ".9rem" }}>
          <div style={S.insLabel("#ff6b35")}>政策的含意</div>
          <div style={S.insText}>
            日本政府は現時点でこれらを統合したライフサイクルコスト分析を<strong style={{ color: "#fff" }}>公式には実施・公表していない。</strong>
            厚生労働省・法務省・総務省の縦割りデータを横断的に分析する
            「日本版Borderless Welfare State研究」の実施こそが、
            移民政策の真の費用対効果を国民に示すために<strong style={{ color: "#fff" }}>今すぐ必要とされている。</strong>
          </div>
        </div>
      </div>

      {/* ── セクション6: 注意書き ── */}
      <div style={{ ...S.sec, borderBottom: "none" }}>
        <SectionHeading label="本データの限界と注意事項" color="rgba(255,255,255,.25)" />
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, padding: "1rem 1.1rem" }}>
          <div style={{ display: "grid", gap: ".65rem" }}>
            {[
              {
                tag: "データの適用範囲",
                col: "rgba(255,255,255,.4)",
                text: "本分析はオランダ（人口1,700万人・EU加盟国）の制度・社会構造に基づく試算である。日本とは医療・年金・生活保護・介護の制度設計が異なるため、数値の直接適用には限界がある。",
              },
              {
                tag: "日本版データの不在",
                col: "#e8b84b",
                text: "日本では全住民マイクロデータを用いた同等の分析が制度的に困難であり、現時点で日本版の精緻なライフサイクルコスト試算は公式には存在しない。本データはあくまで参考値・国際比較の文脈で用いるべきである。",
              },
              {
                tag: "未計算の日本固有リスク",
                col: "#ff6b35",
                text: "国民健康保険・年金未納、生活保護受給、介護コスト、家族呼び寄せによる追加負担など、日本固有の制度リスクはオランダの試算に含まれていない。実際の日本における財政負担はオランダの数値より大きくなる可能性がある。",
              },
              {
                tag: "傾向としての妥当性",
                col: "#2ecc71",
                text: "ただし、出身地域・スキル水準・文化的統合度によって財政貢献が大きく異なるという傾向そのものは、日本においても同様に成立すると考えられる。「誰を・どの条件で受け入れるか」という政策判断の重要性はオランダと同様に日本にも当てはまる。",
              },
              {
                tag: "研究の誠実さについて",
                col: "rgba(255,255,255,.35)",
                text: "Borderless Welfare State報告書自体も自らの限界と前提条件を明記している。本サイトもその姿勢に倣い、データの限界を明示した上で政策議論への貢献を目指している。不明点・反論・追加データの指摘は運営者情報からご連絡いただきたい。",
              },
            ].map((n) => (
              <div key={n.tag} style={{ display: "flex", gap: ".65rem", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: ".15rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.col }} />
                </div>
                <div>
                  <span style={{ fontSize: ".65rem", fontWeight: 700, color: n.col, letterSpacing: .5 }}>{n.tag}　</span>
                  <span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>{n.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ソース ── */}
      <div style={{ padding: ".65rem 1.5rem", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: ".62rem", color: "rgba(255,255,255,.22)", lineHeight: 1.6 }}>
        出典：Jan H. van de Beek, Hans Roodenburg, Joop Hartog, Gerrit W. Kreffer — "Borderless Welfare State: The Consequences of Immigration for Public Finances" 第2版 (2023)
        University of Amsterdam, Amsterdam School of Economics — Table 4.3 (p.93), Figure 4.5, 6.1
      </div>
    </div>
  );
}
