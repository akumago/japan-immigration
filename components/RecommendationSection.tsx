import React from 'react';

const RecommendationSection: React.FC = () => {
  return (
    <section className="mt-16 mb-16">
      <h2 className="text-3xl font-serif font-bold text-blue-400 mb-8 pb-4 border-b-2 border-gray-700">悪循環からの脱却：未来への提言</h2>
      <p className="text-lg text-gray-400 mb-8 font-serif italic">日本の少子化と労働力不足の問題は、政府の政策と企業の行動によって悪循環に陥っている。この構造を理解し、断ち切ることこそが、日本の未来を切り開く唯一の道である。</p>
      <div className="space-y-6 text-gray-300 leading-relaxed">
        <h3 className="text-2xl font-serif font-bold text-gray-100 pt-6 mt-6 border-t border-gray-700">日本の「悪循環」の構造</h3>
        <p>日本の経済と社会は、以下の深刻な悪循環に陥っている。</p>
        <ul className="list-disc list-outside space-y-3 pl-6 text-gray-400">
          <li className="pl-2">少子化と労働力不足: 人口減少により働き手が減る。</li>
          <li className="pl-2">安易な外国人受け入れ: 企業は労働力不足を、賃金の安い外国人労働者で補おうとする。</li>
          <li className="pl-2">賃金の停滞: 安価な労働力が流入するため、本来、人手不足で上昇するはずの日本人の賃金が上がらない。</li>
          <li className="pl-2">さらなる少子化: 所得が上がらないため、子育て世代の経済的負担が増え、少子化がさらに進む。</li>
        </ul>
        <p>この悪循環は「働き方改革」によってさらに加速し、企業は高い賃金の日本人よりも、安い外国人労働者を受け入れることを政府に求めるようになっている。</p>
        <h3 className="text-2xl font-serif font-bold text-gray-100 pt-6 mt-6 border-t border-gray-700">悪循環を断ち切るための提言</h3>
        <p>この亡国のスパイラルを断ち切るため、以下のような抜本的な政策転換を提言する。</p>
        <ul className="list-disc list-outside space-y-3 pl-6 text-gray-400">
          <li className="pl-2">日本人への直接的な投資: こども家庭庁など、何の成果も上げられないものは廃止し、海外に多額の支援を行う余裕があるならば、その予算を国内に振り向けるべきである。例えば、日本国籍を持つ親から生まれた子供一人に対し1000万円を給付するなど、少子化対策を最優先し、未来の日本人へ徹底的に投資する。</li>
          <li className="pl-2">減税による経済成長: 減税によって国民の可処分所得を増やし、消費を喚起する。これにより経済全体を成長させ、所得停滞の根本原因を解決する。</li>
        </ul>
        <h3 className="text-2xl font-serif font-bold text-gray-100 pt-6 mt-6 border-t border-gray-700">国民一人ひとりが声を上げる時</h3>
        <p>政府やメディアが真実を伝えない中、JICAの『アフリカ・ホームタウン事業』がSNSでの国民の批判によって一時停止に追い込まれた事実は、我々に希望を与える。一部の政治家が問題の本質に言及し始めてはいるが、政治が国民の声なしに変わることはない。</p>
        <p className="font-bold text-lg text-yellow-400">一人ひとりが現実を知り、考え、声を上げること。それこそが、この亡国のスパイラルを断ち切る唯一の力である。</p>
      </div>
    </section>
  );
};

export default RecommendationSection;
