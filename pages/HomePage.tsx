import React, { useState, useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Header } from "../components/Header";
import Section from "../components/Section";
import CaseCard from "../components/CaseCard";
import StatCard from "../components/StatCard";
import { SocialShare } from "../components/SocialShare";
import StaticImmigrationChart from "../components/StaticImmigrationChart";
import ImmigrationGrowthComparisonChart from "../components/ImmigrationGrowthComparisonChart";
import DichotomyOfLabor from "../components/DichotomyOfLabor";
import JapaneseLaborDilemma from "../components/JapaneseLaborDilemma";
import ViciousCycle from "../components/ViciousCycle";
import { FiscalImpactAnalysis } from "../components/FiscalImpactAnalysis";
import BorderlessWelfareState from "../components/BorderlessWelfareState";
import YouTubeEmbed from "../components/YouTubeEmbed";
import SymbiosisSection from "../components/SymbiosisSection";
import ContentBlockRenderer from "../components/ContentBlockRenderer";
import {
    reportData,
} from "../constants";
import AdComponent from "../components/AdComponent";
import { EmbeddedImage } from "../components/EmbeddedImage";
import CrimeNewsSection from "../components/CrimeNewsSection";

import { MainLayout } from "../components/MainLayout";

interface NoteArticle {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    category?: string;
    thumbnail?: string;
}

const FALLBACK_NOTE_ARTICLES: NoteArticle[] = [
    {
        title: "日本衰退の真実：古代ローマ崩壊の歴史が暴く外国人依存の致命的罠",
        link: "https://note.com/ideal_kudu9256/n/n0f4ba8a12ee0",
        pubDate: "2026年7月14日",
        description: "古代ローマが外国人への労働・防衛依存によって内側から自壊していった史実を、現代日本の移民政策と対比しながら冷静に解説する警告の論考。",
        category: "HISTORY & IMMIGRATION",
        thumbnail: "https://assets.st-note.com/production/uploads/images/291646571/rectangle_large_type_2_d66ab7ec247d208da0b75d544d542ff2.png?width=800"
    },
    {
        title: "財務省の嘘を暴く！なぜ日本の給料は世界の「3分の1」に叩き売られ、路上に若い女性が立つ貧困国に転落したのか？",
        link: "https://note.com/ideal_kudu9256/n/ned56f487f97b",
        pubDate: "2026年7月13日",
        description: "真面目に働きながら手取りの少なさに絶望する現役世代に向け、給料暴落と貧困化をもたらす財務省の増税緊縮路線の実態を暴きます。",
        category: "TAX & ECONOMY",
        thumbnail: "https://assets.st-note.com/production/uploads/images/291297666/rectangle_large_type_2_af0d0e5e562d31ae44454804e5a458b9.png?width=800"
    },
    {
        title: "自民党と維新が進める「議員定数削減」の嘘。国民を騙す独裁体制の正体を暴く",
        link: "https://note.com/ideal_kudu9256/n/n9a6b58e4b1b3",
        pubDate: "2026年7月12日",
        description: "国政選挙で投票先に悩み、マスコミの報道に違和感を抱いているすべての有権者に向け、「身を切る改革」という心地よいスローガンの欺瞞を検証。",
        category: "POLITICS & REFORM",
        thumbnail: "https://assets.st-note.com/production/uploads/images/290676783/rectangle_large_type_2_c08ea47b385684255608a2d222ee65fa.png?width=800"
    }
];

export const HomePage: React.FC = () => {
    const [noteArticles, setNoteArticles] = useState<NoteArticle[]>(FALLBACK_NOTE_ARTICLES);

    useEffect(() => {
        const fetchNoteArticles = async () => {
            try {
                const response = await fetch('/note-articles.json');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setNoteArticles(data.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch local note articles JSON:", error);
            }
        };

        fetchNoteArticles();
    }, []);

    return (
        <MainLayout>
            <Helmet>
                <title>日本の岐路：外国人労働者受け入れ政策における構造的課題と国民経済への影響</title>
                <meta
                    name="description"
                    content="外国人移民政策が日本の経済、社会、安全保障に与える影響を、公的統計データと事例分析に基づき包括的に検証。労働市場、治安、社会保障制度への影響を詳細に解説。"
                />
                <meta
                    name="keywords"
                    content="外国人移民,日本経済,労働市場,治安,社会保障,移民政策,技能実習制度,特定技能,クルド人問題,国家安全保障"
                />
                <meta property="og:title" content="日本の岐路：外国人移民がもたらす影響の包括的分析" />
                <meta property="og:description" content="公的データに基づく移民政策の影響分析レポート。日本の未来を左右する構造的課題を検証。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="日本の岐路：外国人移民がもたらす影響の包括的分析" />
                <meta name="twitter:description" content="公的データに基づき、移民政策が日本社会に与える影響を多角的に分析したレポート。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
            </Helmet>

            <Header title={reportData.mainTitle} description={reportData.introduction} />
            
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8 text-right">
                <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    最終更新日: 2025年12月31日
                </span>
            </div>

            <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="mb-12 flex justify-center">
                        <SocialShare />
                    </div>

                    {reportData.sections.map((section, sectionIndex) => (
                        <React.Fragment key={sectionIndex}>
                            {sectionIndex === 0 && (
                                <section className="mb-20">
                                    <Link to="/analysis-archive/" className="block group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/40 via-[#161b22] to-purple-900/40 border border-blue-500/30 p-8 md:p-16 hover:border-blue-500/60 transition-all duration-500 shadow-2xl">
                                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] group-hover:bg-blue-500/20 transition-all duration-700"></div>
                                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] group-hover:bg-purple-500/20 transition-all duration-700"></div>
                                        
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                whileInView={{ scale: 1, opacity: 1 }}
                                                className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8 tracking-widest uppercase"
                                            >
                                                <span className="relative flex h-3 w-3 mr-3">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                                </span>
                                                Full Access Available
                                            </motion.div>
                                            
                                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-none">
                                                厳選された<span className="text-white drop-shadow-[0_0_25px_rgba(59,130,246,0.8)] border-b-4 border-blue-500">分析アーカイブ</span>を公開
                                            </h2>
                                            
                                            <p className="text-xl md:text-2xl text-white max-w-3xl mb-12 leading-relaxed text-center font-bold drop-shadow-md">
                                                統計データ、治安リスク、経済シミュレーション、海外事例。<br className="hidden md:block" />
                                                日本の未来を左右する膨大な知見を、視覚的なカード形式で一挙に閲覧いただけます。
                                            </p>
                                            
                                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                                <span className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white text-xl font-black rounded-full transition-all duration-300 transform group-hover:scale-110 shadow-[0_0_40px_rgba(37,99,235,0.4)] flex items-center">
                                                    レポート一覧へアクセス
                                                    <svg className="ml-3 w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </section>
                            )}
                            <div className="section-wrapper mb-16 bg-gradient-to-br from-[#161b22]/90 via-[#0d1117]/95 to-[#161b22]/70 border border-white/5 rounded-3xl p-8 md:p-12 hover:border-blue-500/30 hover:shadow-[0_0_50px_rgba(59,130,246,0.08)] transition-all duration-500 shadow-2xl relative overflow-hidden group">
                                {/* ネオン光彩背景 */}
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] group-hover:bg-blue-500/10 transition-all duration-700"></div>
                                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-700"></div>

                                <div className="flex flex-col md:flex-row md:items-start gap-8 relative z-10">
                                    {/* 左側: 章番号とグラフィカルなインジケーター */}
                                    <div className="flex items-center md:flex-col gap-4 md:gap-2 shrink-0 md:border-r md:border-white/10 md:pr-8 md:min-w-[120px]">
                                        <span className="text-5xl md:text-6xl font-black text-blue-500/30 font-mono tracking-tighter">
                                            {(sectionIndex + 1).toString().padStart(2, '0')}
                                        </span>
                                        <div className="h-px w-8 md:w-full md:h-1 bg-gradient-to-r md:bg-gradient-to-b from-blue-500/30 to-purple-500/30 rounded-full"></div>
                                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest hidden md:inline">
                                            Chapter
                                        </span>
                                    </div>

                                    {/* 右側: タイトル、導入文、関連タグ、ボタン */}
                                    <div className="flex-grow">
                                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">
                                            {section.title}
                                        </h3>
                                        
                                        {section.content.introduction && (
                                            <p className="text-base md:text-lg text-gray-300 mb-8 leading-relaxed max-w-3xl font-light">
                                                {section.content.introduction}
                                            </p>
                                        )}

                                        {/* 導入動画のみトップページにインラインで残す */}
                                        {section.content.customComponent === 'YouTubeEmbed' && (
                                            <div className="my-8 rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-2xl">
                                                <YouTubeEmbed videoId={section.content.videoId!} />
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                            {/* 章ごとの関連キーワード（メタ情報としての付加価値とデザインアクセント） */}
                                            <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                    const title = section.title;
                                                    if (title.includes('最新の数理予測モデル')) return ['#数理シミュレーション', '#将来人口', '#システム力学'];
                                                    if (title.includes('解説動画')) return ['#動画解説', '#構造の要約', '#AkumaShogun'];
                                                    if (title.includes('視覚的証拠')) return ['#相関分析', '#国連データ', '#経済成長'];
                                                    if (title.includes('リスク分析')) return ['#社会統合リスク', '#治安コスト', '#制度疲弊'];
                                                    if (title.includes('経済への長期的影響')) return ['#労働生産性', '#賃金暴落', '#二重構造'];
                                                    if (title.includes('財政影響分析')) return ['#財政赤字予測', '#社会保障フリーライド', '#国民負担'];
                                                    if (title.includes('犯罪統計')) return ['#犯罪傾向分析', '#治安維持', '#公的データ'];
                                                    if (title.includes('実証データ')) return ['#オランダモデル', '#福祉国家の限界', '#マイクロデータ'];
                                                    if (title.includes('国家安全保障')) return ['#国境線なき国家', '#自衛意識', '#ナショナルセキュリティ'];
                                                    if (title.includes('国土・重要インフラ')) return ['#重要土地買収', '#静かなる侵略', '#法規制の隙間'];
                                                    if (title.includes('なし崩し的')) return ['#英国の失敗事例', '#ブレグジットの背景', '#教訓'];
                                                    if (title.includes('働き方改革')) return ['#人手不足の欺瞞', '#低賃金構造', '#労働貴族'];
                                                    if (title.includes('緑町住宅')) return ['#多文化共生の現実', '#住民紛争', '#現場リポート'];
                                                    if (title.includes('ナイジェリア')) return ['#アフリカ最大国家', '#治安崩壊の教訓', '#国家の盛衰'];
                                                    if (title.includes('人手不足')) return ['#外国人依存', '#生産性向上', '#機械化投資'];
                                                    return ['#分析レポート', '#日本経済'];
                                                })().map((tag, tIdx) => (
                                                    <span key={tIdx} className="text-xs text-gray-500 font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <Link 
                                                to={(() => {
                                                    const title = section.title;
                                                    if (title.includes('最新の数理予測モデル')) return '/analysis/simulation-model/';
                                                    if (title.includes('解説動画')) return '/analysis/video-guide/';
                                                    if (title.includes('視覚的証拠')) return '/analysis/statistical-evidence/';
                                                    if (title.includes('リスク分析')) return '/analysis/risk-analysis/';
                                                    if (title.includes('経済への長期的影響')) return '/analysis/economic-impact/';
                                                    if (title.includes('財政影響分析')) return '/analysis/economic-impact/';
                                                    if (title.includes('犯罪統計')) return '/analysis/crime-statistics/';
                                                    if (title.includes('実証データ')) return '/analysis/borderless-welfare-state/';
                                                    if (title.includes('国家安全保障')) return '/analysis/national-security/';
                                                    if (title.includes('国土・重要インフラ')) return '/analysis/land-acquisition/';
                                                    if (title.includes('なし崩し的')) return '/analysis/uk-immigration-lesson/';
                                                    if (title.includes('働き方改革')) return '/analysis/labor-dilemma/';
                                                    if (title.includes('緑町住宅')) return '/analysis/symbiosis/';
                                                    if (title.includes('ナイジェリア')) return '/analysis/nigeria-case/';
                                                    if (title.includes('人手不足')) return '/analysis/labor-mismatch/';
                                                    if (title.includes('総括')) return '/analysis/summary-statistics/';
                                                    if (title.includes('政策提言')) return '/analysis/policy-recommendations/';
                                                    if (title.includes('結び')) return '/analysis/conclusion/';
                                                    return '#';
                                                })()}
                                                className="inline-flex items-center px-6 py-3.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl transition-all duration-300 group font-bold shadow-lg shadow-blue-500/5 group-hover:scale-105 shrink-0"
                                            >
                                                <span className="mr-2">この記事を読む</span>
                                                <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <AdComponent />
                        </React.Fragment>
                    ))}

                    <div className="section-wrapper mb-16 bg-gradient-to-br from-[#161b22]/90 via-[#0d1117]/95 to-[#161b22]/70 border border-white/5 rounded-3xl p-8 md:p-12 hover:border-purple-500/30 hover:shadow-[0_0_50px_rgba(168,85,247,0.08)] transition-all duration-500 shadow-2xl relative overflow-hidden group">
                        {/* ネオン光彩背景 */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-700"></div>
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] group-hover:bg-blue-500/10 transition-all duration-700"></div>

                        <div className="flex flex-col md:flex-row md:items-start gap-8 relative z-10">
                            {/* 左側: 章番号とグラフィカルなインジケーター */}
                            <div className="flex items-center md:flex-col gap-4 md:gap-2 shrink-0 md:border-r md:border-white/10 md:pr-8 md:min-w-[120px]">
                                <span className="text-4xl font-black text-purple-500/40 font-mono tracking-widest uppercase">
                                    PROP
                                </span>
                                <div className="h-px w-8 md:w-full md:h-1 bg-gradient-to-r md:bg-gradient-to-b from-purple-500/40 to-blue-500/40 rounded-full"></div>
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden md:inline">
                                    Strategic
                                </span>
                            </div>

                            {/* 右側: タイトル、導入文、埋め込み画像、関連タグ、ボタン */}
                            <div className="flex-grow">
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors duration-300">
                                    戦略的提言：日本の未来を守るために
                                </h3>
                                
                                <p className="text-base md:text-lg text-gray-300 mb-10 leading-relaxed max-w-3xl font-light">
                                    本プロジェクトの分析に基づき、私たちが将来世代に誇れる日本を引き継ぐための具体的な提言を以下の3つの視点でまとめました。
                                </p>
                                <div className="space-y-16">
                                    <EmbeddedImage pageId={13} caption="【総括】信頼社会の変容：日本の「性善説」への影響と社会統合コストの真真実" />
                                    <EmbeddedImage pageId={14} caption="【最終結論】外国人受け入れ政策に関する構造的課題：早急な政策転換の提言" />
                                    <EmbeddedImage pageId={15} caption="【結び】日本人の「我慢」が限界を超える時：未来を守るための最後の決断" />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pt-6 border-t border-white/5 mt-12">
                                    {/* 章ごとの関連キーワード */}
                                    <div className="flex flex-wrap gap-2">
                                        {['#戦略的提言', '#自国防衛', '#社会統合コスト', '#自立国家の未来'].map((tag, tIdx) => (
                                            <span key={tIdx} className="text-xs text-gray-500 font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <Link 
                                        to="/analysis/strategic-recommendations/"
                                        className="inline-flex items-center px-6 py-3.5 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 rounded-xl transition-all duration-300 group font-bold shadow-lg shadow-purple-500/5 group-hover:scale-105 shrink-0"
                                    >
                                        <span className="mr-2">戦略的提言をすべて読む</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* noteコラム最新記事セクション（リアルタイム動的取得） */}
                    <section className="mb-20">
                        <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-white/10">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                        <span className="text-2xl">📝</span>
                                        公式noteコラム：経済分析の深層
                                    </h2>
                                    <p className="text-gray-400 text-sm">
                                        データビジュアライザー Akuma Shogun による、マクロ経済と日本の財政構造に切り込む論考シリーズ
                                    </p>
                                </div>
                                <a 
                                    href="https://note.com/ideal_kudu9256" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 text-sm group"
                                >
                                    noteで全記事を読む
                                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </a>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                {noteArticles.map((article, idx) => (
                                    <a 
                                        key={idx}
                                        href={article.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group bg-[#0d1117] border border-white/5 rounded-2xl hover:border-purple-500/50 hover:bg-[#161b22] transition-all flex flex-col h-full shadow-lg overflow-hidden"
                                    >
                                        {article.thumbnail && (
                                            <div className="w-full aspect-[1280/670] overflow-hidden relative border-b border-white/5 bg-[#0d1117]">
                                                <img 
                                                    src={article.thumbnail} 
                                                    alt={article.title} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="text-purple-400 font-mono text-[10px] font-bold mb-3 tracking-widest uppercase">
                                                {article.category || 'NOTE COLUMN'}
                                            </div>
                                            <h3 className="text-base font-bold text-gray-200 group-hover:text-white mb-3 leading-snug">
                                                {article.title}
                                            </h3>
                                            <p className="text-gray-400 text-xs leading-relaxed mb-6 flex-grow">
                                                {article.description}
                                            </p>
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                                <span className="text-[10px] text-gray-500 font-medium">{article.pubDate}</span>
                                                <span className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300 flex items-center">
                                                    コラムを読む →
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 最新 外国人犯罪報道ニュース速報セクション（毎日09:00全自動更新） */}
                    <CrimeNewsSection />

                    <footer className="text-center mt-12 text-gray-600 border-t border-white/10 pt-12 pb-12">
                        <div className="mb-12 p-6 bg-blue-900/10 border border-blue-500/20 rounded-xl max-w-2xl mx-auto text-sm">
                            <p className="text-gray-400 mb-3">当プロジェクトは情報の正確性を最優先としています。</p>
                            <Link to="/contact/" className="text-blue-400 hover:text-blue-300 underline">
                                修正依頼・ファクトチェックをリクエストする
                            </Link>
                        </div>
                        <p className="text-xs">&copy; 2024 Akuma Shogun | 日本社会構造分析リサーチ</p>
                    </footer>
                </main>
        </MainLayout>
    );
};
