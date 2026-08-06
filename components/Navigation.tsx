import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Navigation: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { path: '/', label: 'ホーム' },
        { path: '/analysis-archive/', label: '分析一覧' },
        { path: '/about/', label: '当サイトについて' },
        { path: '/faq/', label: 'FAQ' },
        { path: '/operator-info/', label: '運営者情報' },
        { path: '/privacy-policy/', label: 'プライバシーポリシー' },
        { path: '/disclaimer/', label: '免責事項' },
        { path: '/contact/', label: 'お問い合わせ' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-[10000] h-16 transition-all duration-300 ${
                isScrolled ? 'bg-[#0d1117] shadow-xl' : 'bg-[#161b22]'
            } backdrop-blur-lg border-b border-white/10 flex items-center`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-white font-bold text-base leading-tight">日本の岐路</span>
                        <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Overall Report</span>
                    </div>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-bold transition-all duration-300 ${
                                location.pathname === item.path
                                    ? 'text-blue-400 bg-blue-500/10'
                                    : 'text-gray-100 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white transition-all"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden bg-[#0d1117] border-t border-white/10"
                    >
                        <div className="px-4 py-4 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-lg text-base font-medium ${
                                        location.pathname === item.path ? 'text-blue-400 bg-white/5' : 'text-gray-300'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
