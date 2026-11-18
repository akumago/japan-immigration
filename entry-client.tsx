import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './src/index.css';

// 外部ツールのポップアップ等を削除するクリーンアップ
const cleanupExternalUI = () => {
  if (typeof window === 'undefined') return;
  const blockList = ['Bug Detail', 'Primary bug', 'Netlify Drawer'];
  const all = document.querySelectorAll('div, iframe');
  all.forEach(el => {
    const htmlEl = el as HTMLElement;
    const text = htmlEl.innerText || el.textContent || '';
    const hasBadText = blockList.some(word => text.includes(word));
    if (hasBadText && el.id !== 'root' && !el.closest('#root')) {
      el.remove();
    }
  });
};

// プリレンダリング済みの正規SEOメタ・構造化データを保護し、Helmetによる古いタイトル上書きや重複タグ注入を防ぐ
const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
const initialPrerenderTitle =
  typeof document !== 'undefined'
    ? document.querySelector('meta[name="prerender-title"]')?.getAttribute('content') || ''
    : '';

const enforceCanonicalSeoAndAnchors = () => {
  if (typeof document === 'undefined') return;
  // 1. 初回ロードURLでは prerender.js が生成した正規メタ・JSON-LD・タイトルを優先保護
  if (initialPrerenderTitle && window.location.pathname === initialPath) {
    if (document.title !== initialPrerenderTitle) {
      document.title = initialPrerenderTitle;
    }
    document
      .querySelectorAll('head meta[data-rh="true"], head link[rel="canonical"][data-rh="true"], head script[type="application/ld+json"][data-rh="true"]')
      .forEach((el) => el.remove());
  }
  // 2. 本文内の h2 / h3 に #section-N アンカーIDを付与（JSON-LD の hasPart と完全一致させる）
  let secIdx = 1;
  const seen = new Set<string>();
  document.querySelectorAll('#root h2, #root h3').forEach((el) => {
    if (secIdx > 25) return;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text && text.length >= 4 && text.length <= 90 && !seen.has(text) && !/^(ナビゲーション|メニュー|目次|Crawler)/i.test(text)) {
      seen.add(text);
      const secId = `section-${secIdx++}`;
      if (!el.id) el.id = secId;
    }
  });
};

// ハイドレーションの実行
// AdSense等による属性変更との不整合（ハイドレーションエラー）を回避するため、
// プリレンダリング済みコンテンツの有無に関わらず、常に createRoot による新規レンダリングを行います。
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );

  // マウント直後およびHelmet非同期反映後にSEO保護とクリーンアップを実行
  setTimeout(enforceCanonicalSeoAndAnchors, 50);
  setTimeout(enforceCanonicalSeoAndAnchors, 400);
  setTimeout(() => {
    enforceCanonicalSeoAndAnchors();
    cleanupExternalUI();
  }, 1000);
}
