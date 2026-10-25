const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Password must come from the environment; never hardcode it in a public repo
const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || process.env.AUTH_PASSWORD;

// Only keep news from the last N hours
const MAX_AGE_HOURS = 48;

// Google News RSS queries (French + English), scoped to Paris unrest
const QUERIES = [
    { q: 'manifestation Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris manifestation interdite préfecture de police', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris heurts OR émeutes OR violences manifestants', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris protest police clashes', hl: 'en', gl: 'US', ceid: 'US:en' },
];

// Keywords used only to highlight severity, not to invent facts
const HIGH_RISK = ['émeute', 'heurts', 'violences', 'affrontements', 'gaz lacrymogène', 'casseurs', 'riot', 'clashes', 'tear gas', 'incendi'];
const MEDIUM_RISK = ['manifestation', 'rassemblement', 'cortège', 'grève', 'blocage', 'protest', 'demonstration', 'strike', 'march'];

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function requireAuth(req, res, next) {
    if (AUTH_PASSWORD && req.headers['x-password'] === AUTH_PASSWORD) {
        return next();
    }
    res.status(401).json({ success: false, error: '密码错误' });
}

app.post('/api/login', requireAuth, (req, res) => {
    res.json({ success: true });
});

app.post('/api/search', requireAuth, async (req, res) => {
    try {
        const items = await fetchAllNews();
        res.json({ success: true, timestamp: new Date().toISOString(), items });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function fetchRss({ q, hl, gl, ceid }) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:2d')}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParisMonitor/1.0)' },
        timeout: 10000,
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
        const rawTitle = $(el).find('title').text().trim();
        const source = $(el).find('source').text().trim();
        // Google News appends " - Source" to titles
        const title = source && rawTitle.endsWith(` - ${source}`)
            ? rawTitle.slice(0, -(source.length + 3))
            : rawTitle;
        items.push({
            title,
            source: source || '未知来源',
            link: $(el).find('link').text().trim(),
            publishedAt: new Date($(el).find('pubDate').text().trim()).toISOString(),
            lang: hl,
        });
    });
    return items;
}

function classify(title) {
    const t = title.toLowerCase();
    if (HIGH_RISK.some(k => t.includes(k))) return 'high';
    if (MEDIUM_RISK.some(k => t.includes(k))) return 'medium';
    return 'info';
}

async function fetchAllNews() {
    const results = await Promise.allSettled(QUERIES.map(fetchRss));
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length === results.length) {
        throw new Error('所有新闻源都请求失败，请稍后重试');
    }

    const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
    const seen = new Set();
    const items = [];

    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const item of r.value) {
            const key = item.title.toLowerCase();
            if (seen.has(key)) continue;
            if (new Date(item.publishedAt).getTime() < cutoff) continue;
            seen.add(key);
            items.push({ ...item, severity: classify(item.title) });
        }
    }

    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return items.slice(0, 40);
}

// Vercel imports the app; locally we start a server
if (require.main === module) {
    if (!AUTH_PASSWORD) {
        console.warn('AUTH_PASSWORD is not set: all logins will be rejected');
    }
    app.listen(PORT, () => {
        console.log(`Paris Safety Monitor running on http://localhost:${PORT}`);
    });
}

module.exports = app;
