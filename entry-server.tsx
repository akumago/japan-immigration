import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

interface HelmetContext {
  helmet?: {
    title?: { toString: () => string };
    meta?: { toString: () => string };
    link?: { toString: () => string };
    script?: { toString: () => string };
  };
}

export function render(url: string, context: HelmetContext) {
  const normalizedUrl = url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;

  const html = ReactDOMServer.renderToString(
    <React.StrictMode>
      <HelmetProvider context={context}>
        <StaticRouter location={normalizedUrl} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    </React.StrictMode>
  );

  const { helmet } = context;

  return { html, helmet };
}
