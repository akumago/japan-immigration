import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MainLayout } from "../components/MainLayout";

export const Contact: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(false);

        try {
            const body = new URLSearchParams({
                'form-name': 'contact',
                ...formData,
            }).toString();

            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });

            if (res.ok) {
                setSubmitted(true);
                setFormData({ name: '', email: '', subject: '', message: '' });
                setTimeout(() => setSubmitted(false), 5000);
            } else {
                setSubmitError(true);
            }
        } catch (err) {
            console.error('Submission error:', err);
            setSubmitError(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <MainLayout>
            <Helmet>
                <title>お問い合わせ | 日本の岐路</title>
                <meta name="description" content="ご質問、ご意見、ご要望などお気軽にお問い合わせください" />
                <meta property="og:title" content="お問い合わせ | 日本の岐路" />
                <meta property="og:description" content="ご質問、ご意見、内容の訂正依頼など、こちらからお寄せください。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.jpg" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/contact/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="お問い合わせ | 日本の岐路" />
                <meta name="twitter:description" content="日本社会構造分析リサーチへのご連絡、ご意見をお待ちしております。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.jpg" />
            </Helmet>

            <div className="min-h-screen bg-[#0d1117] pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Header */}
                        <div className="mb-12 text-center">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                お問い合わせ
                            </h1>
                            <p className="text-gray-400 text-lg">
                                ご質問、ご意見、ご要望などお気軽にお問い合わせください
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Contact Form Column */}
                            <div className="space-y-8">
                                {/* Official Guidance Card */}
                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 md:p-8">
                                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                                        お問い合わせ窓口のご案内
                                    </h2>
                                    <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                                        当サイトの分析レポートに関するご質問、引用・取材のご相談、公的統計データの訂正依頼などは、以下の公式フォームより直接お寄せいただけます。
                                    </p>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-300 space-y-2">
                                        <p className="font-semibold flex items-center gap-1.5">
                                            <span>✓</span> 受付後、担当者より順次確認・対応いたします
                                        </p>
                                        <p className="text-gray-400">
                                            ※ 内容の正確性・客観性を維持するため、統計値の誤記や更新情報のご指摘を歓迎しております。
                                        </p>
                                    </div>
                                </div>

                                {/* Official Contact Form */}
                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 md:p-8">
                                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                                        メッセージ送信フォーム
                                    </h2>

                                    <form
                                        name="contact"
                                        method="POST"
                                        data-netlify="true"
                                        onSubmit={handleSubmit}
                                        className="space-y-5"
                                    >
                                        <input type="hidden" name="form-name" value="contact" />
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                                お名前 <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                                placeholder="山田太郎"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                                メールアドレス <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                                placeholder="example@email.com"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                                                件名 <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                id="subject"
                                                name="subject"
                                                required
                                                value={formData.subject}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            >
                                                <option value="">選択してください</option>
                                                <option value="question">ご質問</option>
                                                <option value="opinion">ご意見・ご感想</option>
                                                <option value="correction">内容の訂正依頼</option>
                                                <option value="other">その他</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                                                メッセージ <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                required
                                                value={formData.message}
                                                onChange={handleChange}
                                                rows={6}
                                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                                                placeholder="お問い合わせ内容をご記入ください"
                                            />
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={submitting}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50"
                                        >
                                            {submitting ? '送信中...' : '送信する'}
                                        </motion.button>

                                        {submitted && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-center"
                                            >
                                                お問い合わせを受け付けました。ご連絡ありがとうございます。
                                            </motion.div>
                                        )}

                                        {submitError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center"
                                            >
                                                送信中にエラーが発生しました。時間をおいて再度お試しください。
                                            </motion.div>
                                        )}
                                    </form>
                                </div>
                            </div>

                            {/* Contact Info Column */}
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        直接メールでのお問い合わせ
                                    </h3>
                                    <p className="text-gray-300 mb-4 text-sm">
                                        フォームが動作しない場合や、ファイルを添付したい場合は、以下のアドレスまで直接ご連絡ください。
                                    </p>
                                    <a
                                        href="mailto:suteakann@gmail.com"
                                        className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-center rounded-lg border border-blue-500/30 transition-all block text-sm font-medium"
                                    >
                                        suteakann@gmail.com
                                    </a>
                                </div>

                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        よくある質問
                                    </h3>
                                    <p className="text-gray-300 mb-4">
                                        お問い合わせの前に、よくある質問をご確認ください。
                                    </p>
                                    <a
                                        href="/#faq"
                                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        FAQを見る
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                </div>

                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        返信について
                                    </h3>
                                    <p className="text-gray-300">
                                        お問い合わせいただいた内容については、通常3営業日以内にご返信いたします。
                                        お急ぎの場合は、件名にその旨をご記載ください。
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                            />
                                        </svg>
                                        個人情報の取り扱い
                                    </h3>
                                    <p className="text-gray-300 mb-4">
                                        お預かりした個人情報は、お問い合わせへの回答以外の目的では使用いたしません。
                                    </p>
                                    <a
                                        href="/privacy-policy"
                                        className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                                    >
                                        プライバシーポリシー
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* 追記部分: サイト理念・情報方針ブロック (約1000文字) */}
                        <div className="mt-20 space-y-12 bg-gray-950/80 p-8 md:p-12 rounded-2xl border-t-4 border-gray-600 relative">
                            <div className="prose prose-invert prose-lg max-w-none relative z-10">
                                <h2 className="text-3xl font-black text-gray-200 mb-10 text-center tracking-widest">
                                    [MISSION & PHILOSOPHY] 情報発信における基本理念
                                </h2>
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-300 mb-4 border-l-2 border-gray-500 pl-3">
                                            知る権利の回復と「タブーなき客観的論議」の場の創出
                                        </h3>
                                        <p className="leading-relaxed text-gray-400">
                                            当サイト（日本社会構造分析リサーチ：JSSAR）が社会に提供しようとしている最大の価値は、「誰もが知るべき事実でありながら、政治的・社会的なタブーによって覆い隠されてきた不都合なデータ」を、極めて透明性の高い形で国民に開示することにあります。移民政策、外国人犯罪、そして社会保障のフリーライド問題は、本来であれば主権者たる国民が最も深い議論を交わすべき「国家の生死を分かつテーマ」です。しかし現状では、「差別主義的である」「多様性に反する」といったレッテル貼りによって、一次統計データに基づく健全な議論すら封殺される異常な事態が続いています。私たちはこの言論空間の歪みを是正し、感情論やイデオロギーを排した「冷徹な知性によるファクトの共有」を通じて、民主主義の基礎である「知る権利」を回復することを使命としています。
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-300 mb-4 border-l-2 border-gray-500 pl-3">
                                            データドリブンな意思決定：主権者としての防衛策
                                        </h3>
                                        <p className="leading-relaxed text-gray-400">
                                            「数字は嘘をつかない」と言われますが、巨大メディアや行政機関はしばしば「数字の出し方」を操作することで真実を希釈します。全体平均の背後に隠された「特定の国籍による異常な犯罪発生率」や「実質賃金の下押し圧力」など、私たちが深掘りするマクロデータは、日本社会が現在直面している構造的危機の解像度を劇的に高めるものです。当プロジェクトは、これらの一次資料（警察庁、法務省、厚労省等の公式統計）にアクセスし、専門知識を持たない一般市民であっても直感的に被害とリスクを認識できるよう、高度なデータビジュアライゼーション技術を用いて情報を構造化しています。これは単なる啓蒙活動ではなく、日本国憲法が保障する「平和的生存権」と「財産権」を、国民一人ひとりが自力で防衛するための「理論的武装（インテリジェンスの提供）」に他なりません。私たちは今後も、一切の政治的圧力や同調圧力に屈することなく、圧倒的なファクトの壁を築き続けることをお約束します。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 追記部分終了 */}

                    </motion.div>
                </div>
            </div>
        </MainLayout>
    );
};
