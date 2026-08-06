import React from 'react';
import { Link } from 'react-router-dom';

interface RelatedArticlesProps {
  currentPath: string;
}

export const RelatedArticles: React.FC<RelatedArticlesProps> = ({ currentPath }) => {
  const articles = [
    { path: '/analysis/crime-statistics/', title: '外国人犯罪統計の詳細分析：検挙率の実態', category: '治安' },
    { path: '/analysis/economic-impact/', title: '労働市場と賃金構造への影響：経済停滞の真因', category: '経済' },
    { path: '/analysis/social-security/', title: '社会保障制度の持続性検証：フリーライド問題', category: '社会保障' },
    { path: '/analysis/naturalization-paradox/', title: '帰化制度と永住権の逆転現象：安全保障リスク', category: '制度' },
    { path: '/analysis/burial-controversy/', title: '公衆衛生と文化摩擦：土葬問題の多角的検討', category: '文化' },
    { path: '/analysis/land-acquisition/', title: '外国資本による土地買収の実態：見えない侵食', category: '防衛' },
    { path: '/analysis/uk-immigration-lesson/', title: '海外事例研究：イギリスの移民政策失敗に学ぶ', category: '海外' },
  ];

  // Exclude current article (handles trailing slash differences dynamically)
  const filteredArticles = articles.filter(article => 
    article.path.replace(/\/$/, '') !== currentPath.replace(/\/$/, '')
  );

  return (
    <div className="mt-16 pt-10 border-t border-white/10">
      <h3 className="text-xl font-bold text-gray-200 mb-6 flex items-center">
        <span className="bg-blue-600 w-1 h-6 mr-3 rounded-full"></span>
        関連する分析レポート
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((article) => (
            <Link 
              key={article.path} 
              to={article.path}
              className="block p-4 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all group"
            >
                <div className="text-xs text-blue-400 mb-2 font-mono border border-blue-900/50 inline-block px-2 py-0.5 rounded bg-blue-900/20">
                    {article.category}
                </div>
                <h4 className="text-sm font-semibold text-gray-300 group-hover:text-white leading-relaxed">
                    {article.title}
                </h4>
            </Link>
        ))}
      </div>
    </div>
  );
};
