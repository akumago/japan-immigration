import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const BackToTop: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-40 p-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow duration-300 group"
                    aria-label="トップへ戻る"
                >
                    <svg
                        className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                    </svg>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};
