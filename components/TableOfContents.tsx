import React, { useState, useEffect } from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { motion, AnimatePresence } from 'framer-motion';

interface TocItem {
    id: string;
    title: string;
    level: number;
}

interface TableOfContentsProps {
    sections: TocItem[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ sections }) => {
    const [activeSection, setActiveSection] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 100;

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = document.getElementById(sections[i].id);
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(sections[i].id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [sections]);

    return (
        <>
            {/* Mobile Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="xl:hidden fixed bottom-24 right-8 z-40 p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="目次を開く"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                    />
                </svg>
            </motion.button>

            {/* Desktop Sidebar */}
            <div className="hidden xl:block fixed left-6 top-24 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto z-30">
                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 shadow-xl backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                        目次
                    </h3>
                    <nav className="space-y-1">
                        {sections.map((section) => (
                            <ScrollLink
                                key={section.id}
                                to={section.id}
                                spy={true}
                                smooth={true}
                                offset={-80}
                                duration={500}
                                className={`block py-2 px-3 rounded-lg text-sm transition-all duration-300 cursor-pointer ${activeSection === section.id
                                        ? 'text-blue-400 bg-blue-500/10 border-l-2 border-blue-500 pl-4'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                    } ${section.level > 1 ? 'ml-4 text-xs' : ''}`}
                            >
                                {section.title}
                            </ScrollLink>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="xl:hidden fixed right-0 top-0 bottom-0 w-80 bg-gradient-to-br from-[#161b22] to-[#0d1117] border-l border-white/10 z-50 overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                                        目次
                                    </h3>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <nav className="space-y-1">
                                    {sections.map((section) => (
                                        <ScrollLink
                                            key={section.id}
                                            to={section.id}
                                            spy={true}
                                            smooth={true}
                                            offset={-80}
                                            duration={500}
                                            onClick={() => setIsOpen(false)}
                                            className={`block py-3 px-4 rounded-lg text-sm transition-all duration-300 cursor-pointer ${activeSection === section.id
                                                    ? 'text-blue-400 bg-blue-500/10 border-l-2 border-blue-500'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                                } ${section.level > 1 ? 'ml-4 text-xs' : ''}`}
                                        >
                                            {section.title}
                                        </ScrollLink>
                                    ))}
                                </nav>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
