import React, { useState } from 'react';

interface YouTubeEmbedProps {
  videoId: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="video-responsive rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black" style={{
      overflow: 'hidden',
      paddingBottom: '56.25%', // 16:9 aspect ratio
      position: 'relative',
      height: 0,
    }}>
      {isPlaying ? (
        <iframe
          width="853"
          height="480"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="解説動画：外国人労働者受け入れの構造的課題"
          style={{
            left: 0,
            top: 0,
            height: '100%',
            width: '100%',
            position: 'absolute',
          }}
        ></iframe>
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label="解説動画を再生する"
          className="absolute inset-0 w-full h-full group cursor-pointer border-none bg-transparent p-0 block text-left"
        >
          <img
            src="/assets/youtube-thumbnail.jpg"
            alt="解説動画サムネイル"
            width="853"
            height="480"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600/90 group-hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-xs text-gray-200">
            ▶ クリックして解説動画を再生
          </div>
        </button>
      )}
    </div>
  );
};

export default YouTubeEmbed;