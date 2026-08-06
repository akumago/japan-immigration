import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // すでに同意済みかチェック
        const consent = localStorage.getItem('cookie-consent-accepted');
        if (!consent) {
            // 初回アクセスから1秒後にバナーをふわっと表示
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent-accepted', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[20000] p-6 bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 backdrop-blur-lg"
                >
                    <div className="flex flex-col gap-4 text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🍪</span>
                            <h4 className="text-white font-bold text-base">Cookie（クッキー）使用への同意</h4>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            当サイトでは、ユーザーの利便性向上、広告（Google AdSense等）の配信、およびアクセス解析のためにCookieを使用しています。詳細については、
                            <Link to="/privacy-policy/" className="text-blue-400 hover:text-blue-300 underline font-bold mx-1">
                                プライバシーポリシー
                            </Link>
                            をご覧ください。
                        </p>
                        <div className="flex gap-3 justify-end mt-2">
                            <button
                                onClick={handleAccept}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20"
                            >
                                同意して閉じる
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
