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
  
  // マウント後にクリーンアップを実行
  setTimeout(cleanupExternalUI, 1000);
}
