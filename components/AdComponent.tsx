import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdComponent: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const adRef = useRef<HTMLModElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isLoaded || typeof window === 'undefined') return;

        const el = containerRef.current;
        if (!el) return;

        // 幅が確実に 0 より大きくなったことを検証してから push を実行する安全関数
        const initAd = () => {
            if (!containerRef.current || isLoaded) return;
            const width = containerRef.current.clientWidth || containerRef.current.offsetWidth;
            
            if (width > 0) {
                try {
                    if (adRef.current && !adRef.current.getAttribute('data-adsbygoogle-status')) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                        setIsLoaded(true);
                    }
                } catch (e) {
                    console.error('AdSense push error:', e);
                }
            }
        };

        // 1. すでに幅が計算されている場合は即時初期化
        if ((el.clientWidth || el.offsetWidth) > 0) {
            initAd();
        } else {
            // 2. まだ初期レイアウト中の場合は ResizeObserver で幅の確定を監視
            if (typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        if (entry.contentRect.width > 0) {
                            initAd();
                            ro.disconnect();
                            break;
                        }
                    }
                });
                ro.observe(el);
                return () => ro.disconnect();
            } else {
                const handle = requestAnimationFrame(initAd);
                return () => cancelAnimationFrame(handle);
            }
        }
    }, [isLoaded]);

    return (
        <div 
            ref={containerRef}
            className="my-4 w-full flex flex-col items-center justify-center overflow-hidden" 
            style={{ minHeight: '60px', width: '100%' }}
        >
            <span className="text-[11px] text-gray-500 mb-1 tracking-wider select-none">スポンサーリンク</span>
            <ins 
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', minHeight: '60px' }}
                data-ad-client="ca-pub-1244393386981388"
                data-ad-slot="3298086219"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};

export default AdComponent;