import React, { useEffect } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdComponent: React.FC = () => {
  useEffect(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error(e);
      }
  }, []);

    return (
        <div className="my-4 flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: 0 }}>
            <span className="text-[11px] text-gray-500 mb-1 tracking-wider select-none">スポンサーリンク</span>
            <ins className="adsbygoogle"
                style={{ display: 'block', minHeight: 0 }}
                data-ad-client="ca-pub-1244393386981388"
                data-ad-slot="3298086219"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    );
};

export default AdComponent;