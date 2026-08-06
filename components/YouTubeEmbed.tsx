import React from 'react';

interface YouTubeEmbedProps {
  videoId: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId }) => {
  return (
    <div className="video-responsive" style={{
      overflow: 'hidden',
      paddingBottom: '56.25%', // 16:9 aspect ratio
      position: 'relative',
      height: 0,
    }}>
      <iframe
        width="853"
        height="480"
        src={`https://www.youtube.com/embed/${videoId}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded YouTube video"
        style={{
          left: 0,
          top: 0,
          height: '100%',
          width: '100%',
          position: 'absolute',
        }}
      ></iframe>
    </div>
  );
};

export default YouTubeEmbed;