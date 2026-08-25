const https = require('https');

const HOST = 'endearing-blini-b688ce.netlify.app';
const KEY = 'f78a2c19e5d448bba30172e90c5d6718';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const routes = [
  '/',
  '/analysis-archive/',
  '/privacy-policy/',
  '/disclaimer/',
  '/contact/',
  '/about/',
  '/references/',
  '/faq/',
  '/glossary/',
  '/operator-info/',
  '/analysis/crime-statistics/',
  '/analysis/economic-impact/',
  '/analysis/social-security/',
  '/analysis/naturalization-paradox/',
  '/analysis/burial-controversy/',
  '/analysis/land-acquisition/',
  '/analysis/uk-immigration-lesson/',
  '/analysis/borderless-welfare-state/',
  '/analysis/national-security/',
  '/analysis/nigeria-case/',
  '/analysis/simulation-model/',
  '/analysis/labor-dilemma/',
  '/analysis/video-guide/',
  '/analysis/statistical-evidence/',
  '/analysis/risk-analysis/',
  '/analysis/labor-mismatch/',
  '/analysis/summary-statistics/',
  '/analysis/policy-recommendations/',
  '/analysis/conclusion/',
  '/analysis/strategic-recommendations/',
  '/analysis/symbiosis/',
  '/analysis/ai-simulation/',
  '/analysis/crime-news/',
  ...Array.from({ length: 15 }, (_, i) => `/analysis/image/${i + 1}/`)
];

const urlList = routes.map(route => `https://${HOST}${route}`);

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urlList
});

function submitToIndexNow(endpointHost) {
  return new Promise((resolve) => {
    const options = {
      hostname: endpointHost,
      port: 443,
      path: '/IndexNow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`[IndexNow] ${endpointHost} -> HTTP ${res.statusCode} ${res.statusMessage}`);
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (err) => {
      console.error(`[IndexNow] Error submitting to ${endpointHost}:`, err.message);
      resolve({ error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`Submitting ${urlList.length} URLs to IndexNow (Bing / Yandex / Seznam)...`);
  await submitToIndexNow('api.indexnow.org');
  await submitToIndexNow('www.bing.com');
  console.log('IndexNow submission complete!');
}

run();
