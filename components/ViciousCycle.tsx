import React from 'react';
import { motion } from 'framer-motion';

const ViciousCycle: React.FC = () => {
  // 文字列データ（クローラーが読み取りやすいように定義）
  const steps = [
    { 
      id: 'tax', 
      title: '増税・社会保険料増', 
      description: '防衛増税、再エネ賦課金、社会保険料の引き上げ。',
      icon: '📈'
    },
    { 
      id: 'income', 
      title: '実質手取りの減少', 
      description: '物価上昇に賃金が追いつかず、生活水準が低下。',
      icon: '💸'
    },
    { 
      id: 'consumption', 
      title: '国内消費の減退', 
      description: '将来不安から結婚・出産を控え、少子化が加速。',
      icon: '📉'
    }
  ];

  return (
    <div role="img" aria-label="増税と実質手取り減少、国内消費減退がもたらす悪循環の三項対立構造モデルの図解" className="my-16 p-8 bg-gray-900/50 rounded-3xl border border-blue-900/30 relative overflow-hidden">
      <div className="text-center mb-12">
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">増税と所得減少の悪循環</h3>
        <p className="text-gray-400 max-w-2xl mx-auto">
          国民の負担増が手取りを減らし、それが少子化とさらなる負担増を招く、逃れられない構造的ループ。
        </p>
      </div>

      {/* 三角形レイアウト（デスクトップ・JS有効時） */}
      {/* 画面幅が1024px(lg)未満の場合はリスト表示に切り替えて重なりを防ぐ */}
      <div className="relative h-[650px] hidden lg:flex items-center justify-center">
        {/* 中央の回転する悪循環アニメーション - 配置を少し下げて上との距離を確保 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-16">
          {/* 外側の光るリング */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute w-[420px] h-[420px] border border-blue-500/5 rounded-full"
          />
          {/* 内側の回転する矢印とリング */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="relative w-72 h-72 flex items-center justify-center"
          >
            {/* 補助リング */}
            <div className="absolute inset-0 border border-dashed border-blue-400/20 rounded-full" />
            
            {/* クールなデザインの循環矢印 */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <defs>
                <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {[0, 90, 180, 270].map((angle) => (
                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                  <path
                    d="M50 10 A40 45 0 0 1 90 50 L82 50 A32 35 0 0 0 50 18 Z"
                    fill="url(#arrow-grad)"
                  />
                  <path
                    d="M90 50 L95 42 L85 42 Z"
                    fill="#3b82f6"
                    opacity="0.8"
                  />
                </g>
              ))}
            </svg>
            
            {/* 中心部のパルス効果 */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-20 h-24 bg-blue-500/10 rounded-full blur-3xl"
            />
          </motion.div>
        </div>

        {/* 頂点1: 上 - 位置をさらに上に、z-indexを上げて手前に */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="absolute top-0 w-64 p-6 bg-gray-800/95 backdrop-blur-md border-2 border-red-500/40 rounded-2xl text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20"
          style={{ opacity: 1 }}
        >
          <div className="text-4xl mb-2">{steps[0].icon}</div>
          <h4 className="font-bold text-white text-lg">{steps[0].title}</h4>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{steps[0].description}</p>
        </motion.div>

        {/* 頂点2: 左下 - 画面端に寄りすぎないよう調整 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="absolute bottom-10 left-[10%] xl:left-[15%] w-64 p-6 bg-gray-800/95 backdrop-blur-md border-2 border-yellow-500/40 rounded-2xl text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20"
          style={{ opacity: 1 }}
        >
          <div className="text-4xl mb-2">{steps[1].icon}</div>
          <h4 className="font-bold text-white text-lg">{steps[1].title}</h4>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{steps[1].description}</p>
        </motion.div>

        {/* 頂点3: 右下 - 画面端に寄りすぎないよう調整 */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="absolute bottom-10 right-[10%] xl:right-[15%] w-64 p-6 bg-gray-800/95 backdrop-blur-md border-2 border-blue-500/40 rounded-2xl text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20"
          style={{ opacity: 1 }}
        >
          <div className="text-4xl mb-2">{steps[2].icon}</div>
          <h4 className="font-bold text-white text-lg">{steps[2].title}</h4>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{steps[2].description}</p>
        </motion.div>
      </div>

      {/* モバイル用・中画面用・JS無効時用のリスト表示 */}
      <div className="lg:hidden space-y-6 block">
        {steps.map((step, index) => (
          <div key={index} className="p-6 bg-gray-800 border border-white/10 rounded-2xl flex items-center gap-4">
            <div className="text-4xl flex-shrink-0">{step.icon}</div>
            <div>
              <h4 className="font-bold text-white">{step.title}</h4>
              <p className="text-sm text-gray-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViciousCycle;