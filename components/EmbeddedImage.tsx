import React from 'react';
import { Link } from 'react-router-dom';
import { SLIDE_ANALYSIS_DATA } from '../data/slideData';

interface EmbeddedImageProps {
  pageId: number;
  caption?: string;
}

export const EmbeddedImage: React.FC<EmbeddedImageProps> = ({ pageId, caption }) => {
  const slide = SLIDE_ANALYSIS_DATA[pageId];
  const pageNum = pageId.toString().padStart(4, '0');
  const imageSrc = `/ilovepdf_pages-to-jpg/Japan_s_Collapse_The_Vicious_Cycle_page-${pageNum}.jpg`;

  if (!slide) return null;

  return (
    <div className="my-16 group">
      <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm mr-3 shadow-lg shadow-blue-500/20">
              {pageId}
          </div>
          <h4 className="text-white font-bold text-lg tracking-tight group-hover:text-blue-400 transition-colors">
              {caption || slide.title}
          </h4>
      </div>
      
      <Link 
        to={`/analysis/image/${pageId}`}
        className="block relative overflow-hidden rounded-2xl border-2 border-gray-800 hover:border-blue-500 transition-all duration-500 shadow-2xl hover:shadow-blue-500/10 bg-gray-900"
      >
        <img 
          src={imageSrc} 
          alt={`${slide.title} - ${slide.keywords.join(' ')}`}
          className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
          loading="lazy"
        />
        
        {/* AdSense/SEO Friendly Overlay Label */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8">
            <span className="bg-blue-600 text-white text-sm px-8 py-3 rounded-full font-bold shadow-2xl flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                この資料の分析全文を別ページで読む
            </span>
        </div>
      </Link>
      
      {/* Hidden text for SEO if needed, but caption is visible */}
      <div className="mt-4 px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-400 leading-relaxed italic">
          {slide.seoDescription}
      </div>
    </div>
  );
};
