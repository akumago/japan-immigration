const https = require('https');

const host = 'endearing-blini-b688ce.netlify.app';
const key = '6c7e3f89a1b24d5e8f0a1c2d3e4f5a6b';
const keyLocation = `https://${host}/${key}.txt`;

const urlList = [
  `https://${host}/`,
  `https://${host}/analysis-archive/`,
  `https://${host}/analysis/crime-news/`,
  `https://${host}/analysis/crime-statistics/`,
  `https://${host}/analysis/economic-impact/`,
  `https://${host}/analysis/social-security/`,
  `https://${host}/analysis/naturalization-paradox/`,
  `https://${host}/analysis/burial-controversy/`,
  `https://${host}/analysis/land-acquisition/`,
  `https://${host}/analysis/uk-immigration-lesson/`,
  `https://${host}/analysis/national-security/`,
  `https://${host}/analysis/nigeria-case/`,
  `https://${host}/analysis/simulation-model/`,
  `https://${host}/analysis/labor-dilemma/`,
  `https://${host}/analysis/statistical-evidence/`,
  `https://${host}/analysis/risk-analysis/`,
  `https://${host}/analysis/labor-mismatch/`,
  `https://${host}/analysis/summary-statistics/`,
  `https://${host}/analysis/policy-recommendations/`,
  `https://${host}/analysis/conclusion/`,
  `https://${host}/analysis/strategic-recommendations/`,
  `https://${host}/analysis/borderless-welfare-state/`,
  `https://${host}/analysis/symbiosis/`,
  `https://${host}/analysis/ai-simulation/`
];

const postData = JSON.stringify({
  host: host,
  key: key,
  keyLocation: keyLocation,
  urlList: urlList
});

const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`Sending IndexNow request to Bing for ${urlList.length} URLs...`);
const req = https.request(options, (res) => {
  console.log(`IndexNow API Response Status: ${res.statusCode} (${res.statusMessage})`);
  let resData = '';
  res.on('data', (d) => { resData += d; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log('✅ IndexNow submission successful! Bing has received instant crawl notice.');
    } else {
      console.log('Response body:', resData);
    }
  });
});

req.on('error', (e) => {
  console.error('IndexNow error:', e);
});

req.write(postData);
req.end();
