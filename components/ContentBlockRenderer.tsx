
import React from 'react';
import type { ContentBlock } from '../types';

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
}

const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ blocks }) => {
  return (
    <div className="space-y-6 text-gray-300 leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'subheading':
            return (
              <h3 key={index} className="text-2xl font-serif font-bold text-gray-100 pt-6 mt-6 border-t border-gray-700">
                {block.text}
              </h3>
            );
          case 'paragraph':
            return <p key={index}>{block.text}</p>;
          case 'list':
            if (Array.isArray(block.text)) {
              return (
                <ul key={index} className="list-disc list-outside space-y-3 pl-6 text-gray-400">
                  {block.text.map((item, itemIndex) => (
                    <li key={itemIndex} className="pl-2">{item}</li>
                  ))}
                </ul>
              );
            }
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default ContentBlockRenderer;