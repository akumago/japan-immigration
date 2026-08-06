import React from 'react';
import { motion } from 'framer-motion';

interface ChartData {
  contrib: (number | null)[];
  load: (number | null)[];
}

const ageLabels = Array.from({ length: 66 }, (_, i) => i + 20);

const getChartData = (mode: number): ChartData => {
  const contrib: (number | null)[] = new Array(66).fill(0);
  const load: (number | null)[] = new Array(66).fill(0);

  ageLabels.forEach((age, i) => {
    if (mode === 1) {
      contrib[i] = age < 25 ? 20 + (age - 20) * 50 : age < 45 ? 250 + (age - 25) * 5 : age < 58 ? 350 + (age - 45) * 3.5 : age < 62 ? 395 : 45;
      load[i] = age < 25 ? 10 : age < 30 ? 15 + (age - 25) * 35 : age < 45 ? 190 - (age - 30) * 8 : age < 60 ? 35 : age < 65 ? 40 + (age - 60) * 80 : 280 + (age - 65) * 10;
    } else if (mode === 2) {
      contrib[i] = age < 25 ? 20 + (age - 20) * 35 : age < 55 ? 170 + (age - 25) * 2.5 : age < 62 ? 245 : 30;
      load[i] = age < 25 ? 10 : age < 30 ? 15 + (age - 25) * 35 : age < 45 ? 180 - (age - 30) * 8 : age < 60 ? 35 : age < 65 ? 40 + (age - 60) * 65 : 230 + (age - 65) * 10;
    } else if (mode === 3) {
      contrib[i] = age < 25 ? 135 : age < 55 ? 140 + (age - 25) * 1.5 : age < 62 ? 185 : 20;
      load[i] = age < 25 ? 10 : age < 30 ? 15 + (age - 25) * 35 : age < 45 ? 185 - (age - 30) * 8 : age < 60 ? 40 : age < 65 ? 40 + (age - 60) * 60 : 220 + (age - 65) * 10;
    } else if (mode === 4) {
      if (age < 50) {
        contrib[i] = null;
        load[i] = null;
      } else if (age < 62) {
        contrib[i] = 120 + (age - 50) * 0.5;
        load[i] = 25 + (age - 50) * 1.8;
      } else if (age < 65) {
        contrib[i] = 100 - (age - 62) * 30;
        load[i] = 50 + (age - 62) * 20;
      } else {
        contrib[i] = 10;
        load[i] = 110 + (age - 65) * 8;
      }
    }
  });
  return { contrib, load };
};

const LineChart: React.FC<{ mode: number; title: string; color: 'emerald' | 'blue' | 'rose' | 'purple' }> = ({ mode, title, color }) => {
  const { contrib, load } = getChartData(mode);
  const width = 500;
  const height = 300;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const maxY = 450;

  const colorClasses = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const getPoints = (data: (number | null)[]) => {
    return data
      .map((val, i) => {
        if (val === null) return null;
        const x = padding + (i / (data.length - 1)) * graphWidth;
        const y = height - padding - (val / maxY) * graphHeight;
        return `${x},${y}`;
      })
      .filter((p) => p !== null)
      .join(' ');
  };

  const contribPath = getPoints(contrib);
  const loadPath = getPoints(load);

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-200">{title}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded border ${colorClasses[color]}`}>
          万円/年
        </span>
      </div>
      <div className="relative aspect-[5/3] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {[0, 100, 200, 300, 400].map((v) => {
            const y = height - padding - (v / maxY) * graphHeight;
            return (
              <React.Fragment key={v}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="white" strokeOpacity="0.05" strokeDasharray="4" />
                <text x={padding - 5} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-sans">{v}</text>
              </React.Fragment>
            );
          })}
          {[20, 30, 40, 50, 60, 70, 80].map((age) => {
            const x = padding + ((age - 20) / 65) * graphWidth;
            return (
              <text key={age} x={x} y={height - padding + 15} textAnchor="middle" className="text-[10px] fill-gray-500 font-sans">{age}</text>
            );
          })}
          <motion.polyline fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" points={contribPath} initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
          <motion.polyline fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" points={loadPath} initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut", delay: .2 }} />
        </svg>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-gray-400">財政への貢献</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-gray-400">財政への負荷</span>
        </div>
      </div>
    </div>
  );
};

export const FiscalImpactAnalysis: React.FC = () => {
  return (
    <div id="fiscal-impact" className="my-8 w-full max-w-none overflow-visible">
      {/* 4Kモニター等の大画面で確実に2列表示にするための強制スタイル。minmaxによりPCでは2列以上、モバイルでは1列になる */}
      <div 
        className="grid gap-8 mb-16 w-full"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))' 
        }}
      >
        <LineChart mode={1} title="外国人１（留学→平均年収1.5倍→永住）" color="emerald" />
        <LineChart mode={2} title="外国人２（留学→平均年収→永住）" color="blue" />
        <LineChart mode={3} title="外国人３（技能実習→特定技能→永住）" color="rose" />
        <LineChart mode={4} title="外国人４（50歳来日、平均年収、妻帯同→永住）" color="purple" />
      </div>

      <div className="bg-gray-900/50 rounded-3xl border border-white/5 p-8 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <header>
              <span className="text-blue-400 font-black tracking-widest text-xs uppercase block mb-2">Deep Analysis</span>
              <h3 className="text-2xl font-black text-white leading-tight">財政的限界と国家の選択</h3>
              <div className="h-1 w-16 bg-blue-500 mt-4" />
            </header>
            <div className="space-y-4 text-gray-400 leading-relaxed text-sm md:text-base">
              <section>
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  1. 構造的不均衡の加速
                </h4>
                <p>日本の税制・社会保障は「富の再分配」を前提としています。低所得層や高齢層の受け入れは、一人あたりの行政コストを全納税者が負担する構造を深化させます。</p>
              </section>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-xs">
                <p>企業の「短期利益」のために、国民全体の「長期財政」が犠牲にされる構図が鮮明になっています。低賃金労働に依存するモデルは、将来的な社会保障負担を考慮すれば持続不可能です。</p>
              </div>
            </div>
          </div>
          <div className="bg-red-950/20 border-l-4 border-red-500 p-8 rounded-r-xl">
            <div className="flex items-center gap-3 text-red-500 mb-4 font-black uppercase tracking-widest text-[10px]">⚠️ Final Strategic Conclusion</div>
            <h4 className="text-xl font-black text-white mb-4">国家存続のための「一旦停止」</h4>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">社会インフラ、医療、治安、文化基盤のすべてが飽和状態にあります。将来世代にこれ以上の「社会的債務」を残さないために、今、断絶を伴う決断が必要です。</p>
            <ul className="space-y-3">
              {["新規流入の全面的な一時凍結", "既存定住環境の総点検と適正化", "財政的貢献に基づく厳格な選別基準の再構築"].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-white font-bold">
                  <span className="text-red-500 mt-0.5">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
