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
        <div className="my-8 flex justify-center">
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-1244393386981388"
                data-ad-slot="3298086219"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    );
};

export default AdComponent;