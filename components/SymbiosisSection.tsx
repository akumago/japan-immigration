"use client";

import { useEffect, useRef } from "react";

// ─── Chart.js の型定義（インポートなしで動かす場合のグローバル宣言）
declare global {
  interface Window {
    Chart: any;
  }
}

// ────────────────────────────────────────────
//  定数：グラフデータ（変更禁止）
// ────────────────────────────────────────────
const CHART_LABELS = [
  "1996","97","98","99","2000","01","02","03","04","05",
  "06","07","08","09","10","11","12","13","14","15",
  "16","17","18","19","20","21","22","23","24","25","26年",
];

const HOUSEHOLDS_DATA = [
  2100,2800,3400,3900,4800,
  5200,5700,5900,6100,6200,
  6400,6600,6400,6100,5900,
  5800,5900,6000,6100,6500,
  6700,6900,6900,7000,7100,
  7200,7200,7300,7300,7300,7300,
];

const PERCENTAGE_DATA = [
  4.8,6.2,7.2,8.0,9.0,
  13.5,11.5,11.2,11.0,11.2,
  11.5,11.8,12.0,11.2,11.0,
  11.0,11.2,11.5,12.0,12.8,
  13.5,14.0,14.3,14.6,15.2,
  15.7,16.1,16.4,16.7,17.0,17.5,
];

// ────────────────────────────────────────────
//  サブコンポーネント
// ────────────────────────────────────────────

function LivePip({ label }: { label: string }) {
  return (
    <span className="live-pip">
      <i />
      {label}
    </span>
  );
}

function Chip({ variant, children }: { variant: "b" | "g"; children: React.ReactNode }) {
  return <span className={`chip chip-${variant}`}>{children}</span>;
}

function PulseDot({ color }: { color: "rd" | "bl" }) {
  return <span className={`pdot ${color}`} />;
}

// ────────────────────────────────────────────
//  メインコンポーネント
// ────────────────────────────────────────────

export default function SymbiosisSection() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Chart.js 初期化
  useEffect(() => {
    const loadChart = () => {
      if (!chartRef.current) return;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const Chart = window.Chart;
      if (!Chart) return;

      chartInstanceRef.current = new Chart(chartRef.current.getContext("2d"), {
        type: "bar",
        data: {
          labels: CHART_LABELS,
          datasets: [
            {
              type: "line",
              label: "入居割合 (%)",
              data: PERCENTAGE_DATA,
              borderColor: "#2563eb",
              backgroundColor: "transparent",
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "#2563eb",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
              tension: 0.3,
              yAxisID: "y1",
              order: 1,
            },
            {
              type: "bar",
              label: "外国人世帯数 (世帯)",
              data: HOUSEHOLDS_DATA,
              backgroundColor: "rgba(147,197,253,0.65)",
              hoverBackgroundColor: "rgba(96,165,250,0.9)",
              borderColor: "transparent",
              borderWidth: 0,
              yAxisID: "y",
              order: 2,
              barPercentage: 0.88,
              categoryPercentage: 0.92,
              borderRadius: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          animation: { duration: 1000, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(2,6,23,0.95)",
              borderColor: "rgba(37,99,235,0.3)",
              borderWidth: 1,
              titleColor: "#93c5fd",
              bodyColor: "#cbd5e1",
              titleFont: { family: "'Space Mono',monospace", size: 11 },
              bodyFont: { family: "'Noto Sans JP',sans-serif", size: 12 },
              padding: { top: 10, bottom: 10, left: 14, right: 14 },
              cornerRadius: 6,
              callbacks: {
                title: (items: any[]) => items[0].label,
                label: (item: any) =>
                  item.dataset.type === "line"
                    ? `  入居割合: ${item.raw}%`
                    : `  外国人世帯: ${item.raw.toLocaleString()} 世帯`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: "rgba(71,85,105,.4)" },
              ticks: {
                color: "#6b7280",
                font: { family: "'Space Mono',monospace", size: 10 },
                maxRotation: 0,
                callback(this: any, value: any) {
                  const l = this.getLabelForValue(value);
                  return ["1996","2000","10","20","26年"].includes(l) ? l : "";
                },
              },
            },
            y: {
              type: "linear",
              position: "left",
              min: 0,
              max: 10000,
              grid: { color: "rgba(51,65,85,.4)", lineWidth: 1 },
              border: { color: "rgba(71,85,105,.4)", dash: [3, 3] },
              ticks: {
                color: "#6b7280",
                font: { family: "'Space Mono',monospace", size: 10 },
                stepSize: 1000,
                callback: (v: number) => (v >= 0 && v <= 8000 ? v.toLocaleString() : ""),
              },
              title: { display: true, text: "世帯", color: "#9ca3af", font: { size: 11 }, align: "end" },
            },
            y1: {
              type: "linear",
              position: "right",
              min: -30,
              max: 20,
              grid: { drawOnChartArea: false },
              border: { color: "rgba(37,99,235,.5)" },
              ticks: {
                color: "#3b82f6",
                font: { family: "'Space Mono',monospace", size: 10 },
                stepSize: 5,
                callback: (v: number) => (v >= 5 && v <= 20 && v % 5 === 0 ? `${v}` : ""),
              },
              title: {
                display: true,
                text: "%",
                color: "#3b82f6",
                font: { family: "'Space Mono',monospace", size: 11 },
                align: "end",
              },
            },
          },
        },
      });
    };

    // Chart.js がまだロードされていなければ動的に読み込む
    if (window.Chart) {
      loadChart();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      script.onload = loadChart;
      document.head.appendChild(script);
    }

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, []);

  // スクロール reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <section id="sec-symbiosis">

        {/* ════ HERO ════ */}
        <div className="hero">
          <div className="g-grid" />
          <div className="scan-beam" />
          <div className="hparticles">
            {[...Array(5)].map((_, i) => <div key={i} className="hp" />)}
          </div>

          {/* Blueprint ring SVG */}
          <svg className="hero-bg-svg" viewBox="0 0 400 400" fill="none">
            <g className="hbs-r1" style={{ transformOrigin: "200px 200px" }}>
              <circle cx="200" cy="200" r="185" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5 9" />
              <path d="M200 15 L200 385 M15 200 L385 200" stroke="#3b82f6" strokeWidth=".4" opacity=".5" />
            </g>
            <g className="hbs-r2" style={{ transformOrigin: "200px 200px" }}>
              <circle cx="200" cy="200" r="140" stroke="#2563eb" strokeWidth=".8" strokeDasharray="14 8" />
              <polygon points="200,60 340,130 340,270 200,340 60,270 60,130" stroke="#2563eb" strokeWidth=".6" fill="none" />
            </g>
            <g className="hbs-r3" style={{ transformOrigin: "200px 200px" }}>
              <circle cx="200" cy="200" r="90" stroke="#93c5fd" strokeWidth=".5" />
              <circle cx="200" cy="200" r="45" stroke="#93c5fd" strokeWidth=".3" strokeDasharray="3 5" />
            </g>
            <circle cx="200" cy="200" r="6" stroke="#3b82f6" strokeWidth="1" fill="rgba(37,99,235,.2)" />
            <path d="M194 200 L188 200 M206 200 L212 200 M200 194 L200 188 M200 206 L200 212" stroke="#3b82f6" strokeWidth=".8" />
          </svg>

          <div className="hero-veil" />

          <div className="wrap px hero-inner reveal">
            <div className="hero-eyebrow">
              <LivePip label="LIVE DATA" />
              <Chip variant="b">Documentary</Chip>
              <Chip variant="g">愛知県西尾市</Chip>
              <time style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: "#374151" }}>
                2026.04.14
              </time>
            </div>
            <h2 className="hero-h1">
              「日本の習慣だもんで覚えてください」
              <span className="hero-h1-sub">多国籍の愛知県西尾市「県営緑町住宅」手探りの共生</span>
            </h2>
            <div className="hero-rule" />
            <p className="hero-lead">
              安価な労働力の導入が推進される日本。経済界の論理によって変貌し、限界を迎えつつある地域社会の現実を追う。
            </p>
          </div>
        </div>

        {/* ════ STAT BAR ════ */}
        <div style={{ background: "var(--ink1)", borderTop: "1px solid var(--bd)", borderBottom: "1px solid var(--bd)" }}>
          <div className="wrap px">
            <div className="stat-bar reveal">
              {[
                { lbl: "2026年 入居割合",    val: "17.5", unit: "%",  cls: "blue", sub: "1996年比 +12.7pt" },
                { lbl: "外国人世帯数（最新）", val: "7,300", unit: "世帯", cls: "wh",   sub: "2021〜2026 横ばい" },
                { lbl: "2001年スパイク",      val: "13.5", unit: "%",  cls: "red",  sub: "入管法改正後の急伸" },
              ].map(({ lbl, val, unit, cls, sub }) => (
                <div key={lbl} className="stat-cell">
                  <div className="stat-lbl">{lbl}</div>
                  <div className={`stat-val ${cls}`}>
                    {val}
                    <span style={{ fontSize: ".8rem", fontFamily: "'Noto Sans JP',sans-serif" }}>{unit}</span>
                  </div>
                  <div className="stat-sub">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ CHART ════ */}
        <div className="chart-panel">
          <div className="g-grid" />
          <div className="wrap px reveal">
            <div className="chart-card">
              <div className="cc-scan" />
              <div className="chart-hdr">
                <LivePip label="AICHI PREF. DATA" />
                <span className="chart-ttl">愛知県営住宅の外国人入居状況 1996–2026</span>
              </div>
              <div className="cw">
                <canvas
                  ref={chartRef}
                  role="img"
                  aria-label="愛知県営住宅外国人入居状況グラフ 1996〜2026年"
                />
              </div>
              <div className="chart-foot">
                <div className="leg-i"><div className="leg-bar-s" />外国人世帯数（左軸）</div>
                <div className="leg-i"><div className="leg-line-s" />入居割合%（右軸）</div>
                <span className="chart-src">SOURCE: AICHI PREF. 1996–2026</span>
              </div>
              <div className="spike-note">
                <strong>2001年スパイク：</strong>入管法改正後の日系ブラジル人集中により割合が急伸。リーマン後（2008）に世帯数は一時減少するが割合は11〜12%台を維持し、2010年代以降は再上昇。
              </div>
            </div>
          </div>
        </div>

        {/* ════ ARTICLE ════ */}
        <div className="article-panel">
          <div className="g-grid" />
          <div className="wrap px reveal">
            <div className="art-body">
              <p className="art-p">
                <span className="dc">古</span>
                い街並みが残り「三河の小京都」と呼ばれる愛知県西尾市。外国人政策が争点の一つとなった衆院選期間中の2月1日、プラスチック成形・加工工場が立つ一角にある「県営緑町住宅」の集会室に、60人ほどの住民が集まった。
              </p>

              <div className="callout">
                <div className="callout-icon">
                  <svg width="14" height="14" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="callout-txt">
                  <strong>現状の背景：</strong>改正入管難民法施行（1990）以降、「デカセギ」で来日した日系ブラジル人を中心に外国人が急増。言語・習慣の違いから地域摩擦が絶えず、歪な政策によって限界を迎えつつある共生の現場を描く。
                </p>
              </div>

              <p className="art-p">マスクを着けた高齢の日本人や働き盛りの若いベトナム人、幼い子供を連れたネパール人らが、所狭しと並んだパイプ椅子に腰掛ける。時折、赤ちゃんの「あー」という声が響いた。</p>
              <p className="art-p">緑町住宅は2月1日時点で入居する77戸のうち、外国人住民が7割超の55戸を占める。国籍はブラジル、ペルー、パラグアイ、ボリビア、ベトナム、フィリピン、ネパール、インドネシアの8カ国。ブラジル出身者が最も多い。住民と向かい合う長机には5人の自治会役員が横一列に陣取った。このうち4人は外国にルーツを持つ。</p>

              <div className="quote-blk">
                <p className="quote-blk-txt">「今日は共益費と駐車場のことで、集まってもらいました」</p>
                <p className="quote-blk-attr">── 午前9時過ぎ、ブラジル出身の日系2世で自治会長の江藤裕希子（50）</p>
              </div>

              <h2 className="art-h2">
                <span className="art-h2-line" />
                言葉の壁、思うように進まぬ総会
              </h2>

              <p className="art-p">
                議題は共益費（1600円）と駐車場代（1500円）の徴収の県移管。全戸に出席が義務づけられ、4カ国語で書かれた「お知らせ」には
                <span className="ihl-r">「欠席の場合は罰金（3千円）を徴収いたします」</span>と書かれていた。
              </p>
              <p className="art-p">しかし総会は言葉の壁もあり思うように進まない。日本語→ポルトガル語→英語→ベトナム語と次々に訳されるが、正確に伝わっているかどうかは微妙な雰囲気だ。</p>
              <p className="art-p">
                たまりかねた元自治会長の川部国弘（74）が「ここ何年か、払わない人が増えていて役員さんは困ってます」と伝えた。役員のエルナニ・セザル（58）も自治会費の負担を
                <span className="ihl-b">「日本の習慣だもんで覚えてください」</span>と三河弁で呼びかけた。自治会によると、滞納者は十数人、滞納額は計約70万円。
              </p>

              <div className="warn-box">
                <p className="warn-q">「（滞納者は）出て行ってもらった方が良いんじゃないの。そんな性格の悪い野郎はベトナムだら、どうせ」</p>
                <p className="warn-attr">── その一言に、役員たちは一斉に色めき立った。</p>
                <div className="warn-replies">
                  {["「ちょっと待ってよ」","「ベトナム、滞納者いないよ」","「かわいそうだよ」"].map((r) => (
                    <span key={r} className="warn-r">{r}</span>
                  ))}
                </div>
              </div>

              <p className="art-p">川部も「何人（なにじん）とかじゃないの。払わない人がいけないの」とたしなめた。臨時総会は1時間ほど続き、議論は深まらないままお開きとなった。</p>
            </div>
          </div>
        </div>

        {/* ════ ANALYSIS ════ */}
        <div className="analysis-panel">
          <div className="g-grid" />
          <div className="ap-stripe" />

          {/* floating node graph */}
          <svg className="ap-nodes" viewBox="0 0 300 400" fill="none">
            <g className="ap-node-g">
              <line x1="60" y1="80" x2="160" y2="140" stroke="#3b82f6" strokeWidth=".8" />
              <line x1="160" y1="140" x2="240" y2="90" stroke="#3b82f6" strokeWidth=".8" />
              <line x1="160" y1="140" x2="180" y2="230" stroke="#3b82f6" strokeWidth=".8" />
              <circle cx="60"  cy="80"  r="4" fill="#2563eb" />
              <circle cx="160" cy="140" r="5" fill="#3b82f6" />
              <circle cx="240" cy="90"  r="3" fill="#2563eb" />
              <circle cx="180" cy="230" r="4" fill="#2563eb" />
            </g>
            <g className="ap-node-g" style={{ animationDelay: "1.2s" }}>
              <line x1="50"  y1="280" x2="140" y2="320" stroke="#2563eb" strokeWidth=".6" />
              <line x1="140" y1="320" x2="230" y2="270" stroke="#2563eb" strokeWidth=".6" />
              <line x1="140" y1="320" x2="120" y2="370" stroke="#2563eb" strokeWidth=".6" />
              <circle cx="50"  cy="280" r="3" fill="#1d4ed8" />
              <circle cx="140" cy="320" r="4" fill="#2563eb" />
              <circle cx="230" cy="270" r="3" fill="#1d4ed8" />
              <circle cx="120" cy="370" r="3" fill="#1d4ed8" />
            </g>
          </svg>

          {/* circuit lines */}
          <svg className="circuit-lines" viewBox="0 0 1200 80" fill="none">
            <path d="M0 60 L100 60 L100 40 L250 40 L250 55 L400 55 L400 30 L550 30 L550 50 L700 50 L700 25 L850 25 L850 45 L1000 45 L1000 20 L1200 20" stroke="#3b82f6" strokeWidth="1" />
            {[100,250,400,550,700,850,1000].map((cx, i) => {
              const cy = [60,40,55,30,50,25,45][i];
              return <circle key={cx} cx={cx} cy={cy} r="2.5" fill="#3b82f6" />;
            })}
          </svg>

          <div className="wrap px ap-inner reveal">

            {/* header */}
            <div className="ap-hdr">
              <div className="ap-hdr-icon">
                <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="ap-tag">Perspective &amp; Analysis</div>
                <div className="ap-ttl">深層レポート：構造的欺瞞の実態</div>
              </div>
            </div>

            {/* block 1 */}
            <div className="ap-block">
              <h3 className="ap-h3"><PulseDot color="rd" />「深刻な人手不足」という大前提の欺瞞</h3>
              <p className="ap-p">
                本記事の基調にある「深刻な人手不足にあえぐ日本」という前提そのものが、経済の実態から乖離した欺瞞である。真に人手が不足しているなら市場原理として
                <strong>必ず「賃金の上昇」が起こるはず</strong>だ。
              </p>

              <div className="gbox">
                <div className="gbox-glow" />
                <div className="gbox-body">
                  <div className="gbox-icon">
                    <svg width="20" height="20" fill="none" stroke="#60a5fa" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="gbox-lbl">Symbolic Event</div>
                    <p className="gbox-txt">
                      大手飲食チェーン社長が経済番組にて「外国人の特定技能が駄目となると、
                      <span className="hr">日本人の高校・大学・専門卒を中心に取るしかない</span>
                      」と発言し、「日本人が妥協案なのか」「適正賃金を払いたくないだけだ」とSNSで大炎上。
                    </p>
                  </div>
                </div>
              </div>

              <p className="ap-p">
                経済界が叫ぶ「人手不足」の実態は<strong>「安い労働力が不足している」</strong>に過ぎない。日本人の適正賃金を後回しにし、「人手不足」を隠れ蓑に安価な外国人労働者を大量導入しようとする構造がそこにある。
              </p>
            </div>

            {/* block 2 */}
            <div className="ap-block">
              <h3 className="ap-h3"><PulseDot color="bl" />愛知県西尾市「県営緑町住宅」の現状要約</h3>
              <p className="ap-p">経済界の「安価な労働力の渇望」が地域社会にもたらした末路（ツケ）が、この県営住宅の姿である。</p>
              <div className="g3">
                {[
                  { title: "01. コミュニティの変質", body: <>77戸のうち外国人世帯が<strong>7割超（55戸）</strong>。8カ国混在で自治会役員5人中4人が外国籍となり、日本的な自治運営が困難に。</> },
                  { title: "02. 規律の崩壊と実害",  body: <>滞納額が計約<strong>70万円</strong>に達し、総会出席に「罰金3000円」を設定しなければ運営が維持できない状況。</> },
                  { title: "03. 統治コストの増大",  body: <>多言語通訳を繰り返すが正確な意思疎通は困難。「日本の習慣を覚えて」という訴えも空虚に響く。</> },
                ].map(({ title, body }) => (
                  <div key={title} className="g3c">
                    <div className="g3c-ttl">{title}</div>
                    <p className="g3c-body">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* conclusion */}
            <div className="concl">
              <div className="concl-in">
                <svg className="c-radar" viewBox="0 0 100 100" fill="none" stroke="#ef4444">
                  <circle className="cr1" cx="50" cy="50" r="10" strokeWidth=".6" />
                  <circle className="cr2" cx="50" cy="50" r="28" strokeWidth=".6" />
                  <circle className="cr3" cx="50" cy="50" r="46" strokeWidth=".6" />
                  <path d="M50 2L50 98M2 50L98 50" strokeWidth=".3" />
                </svg>
                <h4 className="concl-h4">
                  <span className="concl-ico">
                    <svg width="16" height="16" fill="#fff" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  本質的な帰結：誰がツケを払わされているのか
                </h4>
                <p className="concl-p">
                  本件の核心は、<strong>企業の目先の利益追求しか考えない姿勢</strong>が起点にある。利益を享受する一方で、社会的摩擦やインフラ負担というコストを一切背負わない。
                </p>
                <div className="concl-final">
                  <p className="concl-final-txt">
                    その結果、日本人が長年維持してきた『地域自治の精神』や『公共の秩序』が内側から崩壊。最終的に
                    <span className="hlg">国民の生活環境や治安そのものを脅かしているのが、この国の偽らざる実態である。</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ─── グローバルCSS（<style jsx global> or CSS Module に移管可） ─── */}
      <style>{`
        :root{
          --ink:#020817;--ink1:#0b1120;--ink2:#111827;--ink3:#1e293b;
          --b6:#2563eb;--b5:#3b82f6;--b3:#93c5fd;
          --r6:#dc2626;--r5:#ef4444;--rd:#7f1d1d;
          --t0:#f1f5f9;--t1:#cbd5e1;--t2:#94a3b8;--t3:#64748b;--t4:#374151;
          --bd:rgba(59,130,246,.14);--bdb:rgba(59,130,246,.30);
        }
        #sec-symbiosis{width:100%;background:var(--ink1);font-family:'Noto Sans JP',sans-serif;color:var(--t1);overflow:hidden;position:relative}
        .g-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(59,130,246,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.035) 1px,transparent 1px);background-size:44px 44px}
        .wrap{max-width:62rem;margin:0 auto;position:relative;z-index:2}
        .px{padding-left:1.5rem;padding-right:1.5rem}
        @media(min-width:768px){.px{padding-left:2.5rem;padding-right:2.5rem}}

        /* HERO */
        .hero{position:relative;padding:2.2rem 0 2rem;background:linear-gradient(135deg,#020817 0%,#0b1120 45%,#0f1e3b 100%);overflow:hidden}
        .hero-bg-svg{position:absolute;right:-6rem;top:50%;transform:translateY(-50%);width:32rem;height:32rem;pointer-events:none;opacity:.09}
        .hbs-r1{animation:rotA 60s linear infinite}
        .hbs-r2{animation:rotA 40s linear infinite reverse}
        .hbs-r3{animation:rotA 25s linear infinite}
        @keyframes rotA{to{transform:rotate(360deg)}}
        .scan-beam{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .scan-beam::after{content:'';position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent 0%,rgba(59,130,246,.5) 40%,rgba(147,197,253,.8) 50%,rgba(59,130,246,.5) 60%,transparent 100%);animation:scanY 5s ease-in-out infinite;box-shadow:0 0 20px rgba(59,130,246,.4)}
        @keyframes scanY{0%{top:-2px;opacity:0}8%{opacity:1}92%{opacity:.4}100%{top:100%;opacity:0}}
        .hparticles{position:absolute;inset:0;pointer-events:none}
        .hp{position:absolute;background:var(--b3);border-radius:50%}
        .hp:nth-child(1){width:2px;height:2px;left:10%;top:25%;animation:hpf 8s 0s infinite}
        .hp:nth-child(2){width:3px;height:3px;left:25%;top:70%;animation:hpf 11s 2s infinite}
        .hp:nth-child(3){width:2px;height:2px;left:55%;top:20%;animation:hpf 7s 1s infinite}
        .hp:nth-child(4){width:2px;height:2px;left:78%;top:55%;animation:hpf 9s 3.5s infinite}
        .hp:nth-child(5){width:3px;height:3px;left:45%;top:80%;animation:hpf 12s .5s infinite}
        @keyframes hpf{0%{opacity:0;transform:translateY(0)}15%{opacity:.7}85%{opacity:.3}100%{opacity:0;transform:translateY(-30px)}}
        .hero-veil{position:absolute;bottom:0;left:0;right:0;height:5rem;background:linear-gradient(to top,var(--ink1),transparent);pointer-events:none;z-index:1}
        .hero-inner{position:relative;z-index:2}
        .hero-eyebrow{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
        .live-pip{display:inline-flex;align-items:center;gap:5px;font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.15em;color:var(--b3)}
        .live-pip i{display:block;width:6px;height:6px;border-radius:50%;background:var(--b5);animation:lpp 2s ease-out infinite}
        @keyframes lpp{0%{box-shadow:0 0 0 0 rgba(59,130,246,.6)}70%{box-shadow:0 0 0 7px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}
        .chip{font-family:'Space Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:2px 8px;border-radius:2px}
        .chip-b{background:rgba(37,99,235,.2);color:#bfdbfe;border:1px solid rgba(59,130,246,.35)}
        .chip-g{background:rgba(55,65,81,.3);color:var(--t2);border:1px solid rgba(75,85,99,.4)}
        .hero-h1{font-weight:900;font-size:clamp(1.35rem,4vw,2.2rem);line-height:1.2;letter-spacing:-.02em;background:linear-gradient(100deg,#fff 0%,#bfdbfe 70%,#93c5fd 100%);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:.3rem}
        .hero-h1-sub{font-size:clamp(.85rem,2vw,1.05rem);font-weight:700;color:var(--b3);letter-spacing:.01em;line-height:1.4;display:block;margin-top:.35rem}
        .hero-rule{width:3rem;height:3px;background:var(--r6);margin:.7rem 0;box-shadow:0 0 10px rgba(220,38,38,.7);position:relative;overflow:hidden;border-radius:2px}
        .hero-rule::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);animation:shim 2.5s ease-in-out infinite}
        @keyframes shim{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        .hero-lead{font-size:.83rem;color:var(--t2);max-width:30rem;line-height:1.75}

        /* STAT BAR */
        .stat-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(59,130,246,.1)}
        .stat-cell{background:rgba(11,17,32,.9);padding:.7rem 1rem;display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden;transition:background .18s}
        .stat-cell:hover{background:rgba(30,41,59,.8)}
        .stat-cell::before{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--b5),transparent);transform:scaleX(0);transition:transform .3s;transform-origin:left}
        .stat-cell:hover::before{transform:scaleX(1)}
        .stat-lbl{font-family:'Space Mono',monospace;font-size:8px;color:var(--t3);letter-spacing:.1em;text-transform:uppercase}
        .stat-val{font-family:'Bebas Neue',sans-serif;font-size:1.7rem;line-height:1;letter-spacing:.03em}
        .stat-val.blue{color:var(--b5)}.stat-val.red{color:var(--r5)}.stat-val.wh{color:var(--t0)}
        .stat-sub{font-size:9px;color:var(--t3)}

        /* CHART */
        .chart-panel{position:relative;padding:1.25rem 0 1rem;background:var(--ink2);border-bottom:1px solid var(--bd)}
        .chart-card{position:relative;background:rgba(15,22,40,.85);border:1px solid var(--bd);border-radius:8px;padding:1rem 1rem .85rem;overflow:hidden}
        .chart-card::before{content:'';position:absolute;inset:0;border-radius:8px;background:radial-gradient(ellipse 80% 50% at 90% 5%,rgba(37,99,235,.06),transparent);pointer-events:none}
        .cc-scan{position:absolute;inset:0;pointer-events:none;z-index:3;border-radius:8px;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.06) 3px,rgba(0,0,0,.06) 4px)}
        .chart-hdr{display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;padding-bottom:.6rem;border-bottom:1px solid rgba(59,130,246,.1);position:relative;z-index:2}
        .chart-ttl{font-size:.9rem;font-weight:700;color:var(--t0);letter-spacing:.01em}
        .cw{position:relative;height:310px;z-index:2}
        .chart-foot{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(59,130,246,.08);position:relative;z-index:2}
        .leg-i{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--t3)}
        .leg-bar-s{width:12px;height:8px;border-radius:1px;background:rgba(147,197,253,.6);border:1px solid rgba(96,165,250,.35)}
        .leg-line-s{width:16px;height:2px;background:var(--b6);border-radius:2px;position:relative}
        .leg-line-s::after{content:'';position:absolute;width:5px;height:5px;background:var(--b6);border-radius:50%;border:1.5px solid #0f1628;top:50%;left:50%;transform:translate(-50%,-50%)}
        .chart-src{font-family:'Space Mono',monospace;font-size:8px;color:var(--t4);margin-left:auto}
        .spike-note{margin-top:.6rem;z-index:2;position:relative;background:rgba(30,58,138,.1);border:1px solid rgba(59,130,246,.18);border-left:2px solid var(--b6);border-radius:0 5px 5px 0;padding:.5rem .85rem;font-size:10px;color:var(--t3);line-height:1.65}
        .spike-note strong{color:var(--b3)}

        /* ARTICLE */
        .article-panel{position:relative;padding:1.25rem 0;background:var(--ink1);border-bottom:1px solid var(--bd)}
        .art-body{position:relative;padding-left:1.2rem;border-left:1px solid rgba(59,130,246,.15)}
        .art-body::before{content:'';position:absolute;top:0;left:-1px;width:1px;height:4rem;background:linear-gradient(to bottom,var(--b5),transparent)}
        .art-p{font-size:.875rem;line-height:1.82;color:var(--t2);margin-bottom:.85em}
        .art-p:last-child{margin-bottom:0}
        .dc{font-size:2rem;font-weight:900;color:var(--b5);float:left;margin:.04em .12em 0 0;line-height:1;text-shadow:0 0 20px rgba(59,130,246,.5)}
        .callout{display:flex;gap:.75rem;align-items:flex-start;background:rgba(30,58,138,.1);border:1px solid rgba(59,130,246,.18);border-left:2px solid var(--b5);border-radius:0 6px 6px 0;padding:.75rem 1rem;margin:.85rem 0}
        .callout-icon{flex-shrink:0;width:28px;height:28px;border-radius:5px;background:rgba(37,99,235,.2);border:1px solid rgba(59,130,246,.3);display:flex;align-items:center;justify-content:center}
        .callout-txt{font-size:.82rem;color:var(--t2);line-height:1.7}
        .callout-txt strong{color:var(--t0)}
        .ihl-r{background:rgba(220,38,38,.15);color:#fca5a5;padding:0 .25em;border-radius:2px;border-bottom:1px solid rgba(220,38,38,.3)}
        .ihl-b{background:rgba(37,99,235,.15);color:#bfdbfe;padding:0 .25em;border-radius:2px}
        .art-h2{display:flex;align-items:center;gap:.6rem;font-size:.95rem;font-weight:900;color:var(--t0);margin:1.3rem 0 .75rem;letter-spacing:.01em}
        .art-h2-line{width:2rem;height:3px;border-radius:2px;background:var(--b5);flex-shrink:0;animation:lineGrow .6s ease-out both;transform-origin:left}
        @keyframes lineGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .quote-blk{position:relative;padding:.6rem .8rem .6rem 1rem;margin:.85rem 0;border-left:2px solid var(--b5);background:rgba(30,41,59,.35);border-radius:0 6px 6px 0}
        .quote-blk-txt{font-size:.9rem;font-weight:700;color:var(--t0);line-height:1.5}
        .quote-blk-attr{font-size:.72rem;color:var(--t3);margin-top:.25rem}
        .warn-box{position:relative;overflow:hidden;background:repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(239,68,68,.03) 8px,rgba(239,68,68,.03) 16px);border:1px solid rgba(239,68,68,.2);border-left:2px solid var(--r5);border-radius:0 6px 6px 0;padding:.75rem 1rem;margin:.85rem 0}
        .warn-q{font-size:.88rem;font-weight:700;color:#fca5a5;line-height:1.6}
        .warn-attr{font-size:.72rem;color:var(--t3);margin:.3rem 0 .5rem;padding-bottom:.4rem;border-bottom:1px solid rgba(239,68,68,.15)}
        .warn-replies{display:flex;flex-direction:column;gap:.3rem;padding-left:.75rem;border-left:1px solid rgba(100,116,139,.4)}
        .warn-r{font-size:.82rem;font-weight:700;color:var(--t1)}

        /* ANALYSIS */
        .analysis-panel{position:relative;overflow:hidden;background:var(--ink);padding:1.25rem 0 1.5rem}
        .ap-stripe{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(-45deg,transparent,transparent 12px,rgba(59,130,246,.018) 12px,rgba(59,130,246,.018) 24px);animation:stripemv 4s linear infinite reverse}
        @keyframes stripemv{0%{background-position:0 0}100%{background-position:48px 48px}}
        .ap-nodes{position:absolute;top:0;right:0;width:40%;height:100%;pointer-events:none;opacity:.06;overflow:visible}
        .ap-node-g{animation:nodeGlow 4s ease-in-out infinite}
        @keyframes nodeGlow{0%,100%{opacity:.5}50%{opacity:1}}
        .circuit-lines{position:absolute;bottom:0;left:0;right:0;height:80px;pointer-events:none;opacity:.07;overflow:hidden}
        .ap-inner{position:relative;z-index:2}
        .ap-hdr{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;padding-bottom:.85rem;border-bottom:1px solid rgba(37,55,90,.8)}
        .ap-hdr-icon{width:2.2rem;height:2.2rem;border-radius:7px;flex-shrink:0;background:linear-gradient(135deg,var(--b6),#1e3a8a);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(37,99,235,.4)}
        .ap-tag{font-family:'Space Mono',monospace;font-size:8px;color:var(--b3);letter-spacing:.2em;text-transform:uppercase;margin-bottom:.15rem}
        .ap-ttl{font-size:1.1rem;font-weight:900;color:#fff;letter-spacing:-.01em}
        .ap-block{position:relative;margin-bottom:1.5rem}
        .ap-block+.ap-block{border-top:1px solid rgba(30,41,55,.9);padding-top:1.25rem;margin-top:0}
        .ap-h3{font-size:.9rem;font-weight:700;color:#fff;margin-bottom:.75rem;display:flex;align-items:center;gap:.5rem}
        .pdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;position:relative}
        .pdot::before{content:'';position:absolute;inset:0;border-radius:50%;animation:lpp 1.8s cubic-bezier(0,0,.2,1) infinite}
        .pdot.rd{background:var(--r5)}.pdot.rd::before{background:var(--r5)}
        .pdot.bl{background:var(--b5)}.pdot.bl::before{background:var(--b5)}
        .ap-p{font-size:.85rem;line-height:1.8;color:#9ca3af;margin-bottom:.75rem}
        .ap-p:last-child{margin-bottom:0}
        .ap-p strong{color:#e2e8f0;background:rgba(255,255,255,.06);padding:.05em .3em;border-radius:3px;border:1px solid rgba(255,255,255,.07)}
        .gbox{position:relative;overflow:hidden;background:rgba(15,22,40,.7);backdrop-filter:blur(6px);border:1px solid rgba(55,65,81,.6);border-radius:7px;padding:.85rem 1rem;margin:.75rem 0}
        .gbox-glow{position:absolute;inset:-2px;border-radius:9px;opacity:.1;background:linear-gradient(90deg,var(--b6),var(--r6));filter:blur(12px);transition:opacity .7s;pointer-events:none}
        .gbox:hover .gbox-glow{opacity:.22}
        .gbox-body{display:flex;gap:.75rem;align-items:flex-start;position:relative;z-index:1}
        .gbox-icon{width:2.5rem;height:2.5rem;background:#1f2937;border-radius:8px;border:1px solid rgba(55,65,81,.7);display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:fl 7s ease-in-out infinite}
        @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .gbox-lbl{font-family:'Space Mono',monospace;font-size:8px;color:var(--b3);letter-spacing:.14em;text-transform:uppercase;margin-bottom:.2rem}
        .gbox-txt{font-size:.82rem;color:#e2e8f0;line-height:1.7}
        .gbox-txt .hr{color:#f87171;font-weight:700;border-bottom:1px solid rgba(239,68,68,.3)}
        .g3{display:grid;grid-template-columns:1fr;gap:.5rem;margin-top:.75rem}
        @media(min-width:560px){.g3{grid-template-columns:repeat(3,1fr)}}
        .g3c{background:rgba(20,28,45,.6);border:1px solid rgba(37,55,90,.7);border-radius:6px;padding:.75rem;transition:background .18s,border-color .18s,transform .18s}
        .g3c:hover{background:rgba(30,41,60,.9);border-color:rgba(59,130,246,.3);transform:translateY(-2px)}
        .g3c-ttl{font-size:.78rem;font-weight:700;color:var(--b3);margin-bottom:.4rem;padding-bottom:.35rem;border-bottom:1px solid rgba(37,55,90,.8)}
        .g3c-body{font-size:.76rem;line-height:1.7;color:#9ca3af}
        .g3c-body strong{color:var(--t1)}
        .concl{margin-top:1.25rem;padding:1px;border-radius:10px;background:linear-gradient(135deg,var(--r6) 0%,var(--rd) 50%,#1f2937 100%);position:relative}
        .concl::after{content:'';position:absolute;inset:0;border-radius:10px;pointer-events:none;box-shadow:0 0 20px rgba(220,38,38,.18);animation:glw 4s ease-in-out infinite}
        @keyframes glw{0%,100%{opacity:.6}50%{opacity:1}}
        .concl-in{background:rgba(3,7,18,.97);border-radius:9px;padding:1.1rem 1.25rem 1.25rem;position:relative;overflow:hidden}
        .c-radar{position:absolute;top:50%;right:-1.5rem;transform:translateY(-50%);width:12rem;height:12rem;opacity:.07;pointer-events:none}
        .cr1{animation:radarP 3s ease-out infinite}
        .cr2{animation:radarP 3s .8s ease-out infinite}
        .cr3{animation:radarP 3s 1.6s ease-out infinite}
        @keyframes radarP{0%{opacity:.8}50%{opacity:.2}100%{opacity:.8}}
        .concl-h4{font-size:1rem;font-weight:900;color:#fff;display:flex;align-items:center;gap:.5rem;margin-bottom:.85rem;position:relative;z-index:1}
        .concl-ico{background:var(--r6);padding:.25rem;border-radius:4px;flex-shrink:0}
        .concl-p{font-size:.85rem;color:#d1d5db;line-height:1.8;margin-bottom:1rem;position:relative;z-index:1}
        .concl-p strong{color:#fff;border-bottom:1px solid rgba(220,38,38,.35)}
        .concl-final{background:rgba(0,0,0,.5);border-left:2px solid var(--r5);border-radius:0 5px 5px 0;padding:.8rem 1rem;position:relative;z-index:1}
        .concl-final-txt{font-size:.9rem;font-weight:700;color:var(--t0);line-height:1.7}
        .concl-final-txt .hlg{background:linear-gradient(90deg,#f87171,#dc2626);-webkit-background-clip:text;background-clip:text;color:transparent}

        /* SCROLL REVEAL */
        .reveal{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
        .reveal.in{opacity:1;transform:translateY(0)}
      `}</style>
    </>
  );
}
