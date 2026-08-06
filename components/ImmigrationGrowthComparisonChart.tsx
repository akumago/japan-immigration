import React from 'react';

const ImmigrationGrowthComparisonChart: React.FC = () => {
  const data = [
    { label: '移民比率：低 (5%未満)', value: 4.3, color: '#e57373' }, // Red-ish
    { label: '移民比率：中 (5-15%)', value: 1.7, color: '#fdd835' }, // Yellow-ish
    { label: '移民比率：高 (15%以上)', value: 1.8, color: '#4db6ac' }, // Teal-ish
  ];

  const chartHeight = 300;
  const chartWidth = 500;
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
  const graphHeight = chartHeight - margin.top - margin.bottom;
  const graphWidth = chartWidth - margin.left - margin.right;
  const barWidth = 80;
  const gap = (graphWidth - barWidth * data.length) / (data.length + 1);

  const maxValue = 4.5; // Y-axis max

  return (
    <div className="bg-black/20 p-6 rounded-xl border border-white/5 shadow-inner mt-8">
        <h3 className="text-xl font-bold text-gray-200 mb-4 border-l-4 border-blue-500 pl-3">
            2. グループ別平均成長率
        </h3>
        <p className="text-gray-400 mb-6 text-sm">
            国を「移民比率」で3つのグループに分けて平均成長率を比較しました。「移民が少ない国」のグループの方が、平均的な成長率は高くなっています。
        </p>
      <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="font-sans">
        <style>
          {`
            .axis-text { font-size: 12px; fill: #94a3b8; font-family: sans-serif; }
            .grid-line { stroke: #334155; stroke-width: 1; stroke-dasharray: 4; }
            .bar-label { font-size: 11px; fill: #cbd5e1; text-anchor: middle; }
            .value-label { font-size: 14px; fill: #ffffff; text-anchor: middle; font-weight: bold; }
          `}
        </style>

        {/* Y Axis Grid Lines & Labels */}
        {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5].map((val) => {
          const y = margin.top + graphHeight - (val / maxValue) * graphHeight;
          return (
            <React.Fragment key={val}>
              <line x1={margin.left} y1={y} x2={chartWidth - margin.right} y2={y} className="grid-line" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" className="axis-text">
                {val.toFixed(1)}
              </text>
            </React.Fragment>
          );
        })}

        {/* Y Axis Label */}
        <text
          transform={`rotate(-90)`}
          x={-(chartHeight / 2)}
          y={20}
          textAnchor="middle"
          className="axis-text"
          style={{ fontSize: '12px', fill: '#a8c5e5' }}
        >
          平均経済成長率 (%)
        </text>

        {/* Bars */}
        {data.map((d, i) => {
          const x = margin.left + gap + i * (barWidth + gap);
          const barHeight = (d.value / maxValue) * graphHeight;
          const y = margin.top + graphHeight - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={d.color}
                rx={4}
                ry={4}
                className="transition-all duration-300 hover:opacity-80"
              />
              {/* Value Label on top of bar */}
              <text x={x + barWidth / 2} y={y - 8} className="value-label">
                {d.value.toFixed(1)}%
              </text>
              {/* X Axis Label */}
              <text x={x + barWidth / 2} y={chartHeight - 20} className="bar-label">
                <tspan x={x + barWidth / 2} dy="0">
                    {d.label.split('：')[0]}
                </tspan>
                <tspan x={x + barWidth / 2} dy="1.2em" fontSize="10px" fill="#94a3b8">
                    {d.label.split('：')[1]}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-blue-400 font-bold mb-2 text-sm">グラフから読み取れること</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
              このデータは「移民を増やせば経済成長する」という説に対する反証材料となります。
              多くの高成長国（インド、ベトナム、中国など）は移民比率が低く、逆に移民を多く受け入れている国（欧米諸国）は安定期に入っており、高い経済成長率は示していません。
          </p>
      </div>
    </div>
  );
};

export default ImmigrationGrowthComparisonChart;
