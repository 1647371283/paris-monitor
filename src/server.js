const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Password must come from the environment; never hardcode it in a public repo
const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || process.env.AUTH_PASSWORD;

// Look back far enough to cover the previous big protest days
const MAX_AGE_DAYS = 10;

// A protest day needs at least this many articles to be shown as an event
const MIN_EVENT_ARTICLES = 2;

// Google News RSS queries (French + English), scoped to Paris unrest
const QUERIES = [
    { q: 'manifestation Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'manifestation Paris prochaine OR appel à manifester', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris manifestation préfecture de police parcours', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris heurts OR émeutes OR violences manifestants', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'grève Paris transports', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'Paris protest', hl: 'en', gl: 'US', ceid: 'US:en' },
];

// Keywords used only to flag clashes, not to invent facts
const CLASH_WORDS = ['émeute', 'heurts', 'violences', 'affrontements', 'lacrymogène', 'casseurs', 'pillé', 'pillage', 'incendi', 'riot', 'clash', 'tear gas', 'violent', 'looted'];

const MONTHS = {
    janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
    août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
// "24 octobre", "1er novembre", "24 October"
const DAY_MONTH_RE = new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MONTH_RE})\\b\\.?`, 'gi');
// "October 24", "Oct. 24"
const MONTH_DAY_RE = new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})\\b`, 'gi');

// Paris places that matter to a visitor: [match pattern, display name]
const PLACES = [
    [/république/i, '共和国广场 République'],
    [/bastille/i, '巴士底 Bastille'],
    [/\bnation\b/i, '民族广场 Nation'],
    [/opéra/i, '歌剧院 Opéra'],
    [/concorde/i, '协和广场 Concorde'],
    [/champs[- ]élysées/i, '香榭丽舍 Champs-Élysées'],
    [/châtelet/i, '夏特雷 Châtelet'],
    [/les halles/i, '大堂 Les Halles'],
    [/montparnasse/i, '蒙帕纳斯 Montparnasse'],
    [/place d'italie/i, '意大利广场 Place d\'Italie'],
    [/invalides/i, '荣军院 Invalides'],
    [/porte de vincennes/i, '樊尚门 Porte de Vincennes'],
    [/denfert/i, '当费尔 Denfert-Rochereau'],
    [/gare de l'est/i, '东站 Gare de l\'Est'],
    [/gare du nord/i, '北站 Gare du Nord'],
    [/gare de lyon/i, '里昂站 Gare de Lyon'],
    [/hôtel de ville/i, '市政厅 Hôtel de Ville'],
    [/assemblée nationale/i, '国民议会 Assemblée nationale'],
    [/sorbonne|quartier latin/i, '拉丁区 Sorbonne'],
    [/trocadéro/i, '特罗卡德罗 Trocadéro'],
    [/tour eiffel|eiffel tower/i, '埃菲尔铁塔'],
    [/louvre/i, '卢浮宫 Louvre'],
    [/belleville/i, '美丽城 Belleville'],
];

const translationCache = new Map();

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
        const data = await buildReport();
        res.json({ success: true, timestamp: new Date().toISOString(), ...data });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function fetchRss({ q, hl, gl, ceid }) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${MAX_AGE_DAYS}d`)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
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
        });
    });
    return items;
}

// Today's date in Paris as YYYY-MM-DD
function parisToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

// Resolve "24 octobre" to a full date near the article's publish date
function toIsoDate(day, month, publishedAt) {
    const pub = new Date(publishedAt);
    let year = pub.getUTCFullYear();
    // A December article talking about "January" means next year, and vice versa
    if (month - (pub.getUTCMonth() + 1) > 6) year -= 1;
    if ((pub.getUTCMonth() + 1) - month > 6) year += 1;
    if (day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractDates(item) {
    const dates = new Set();
    for (const m of item.title.matchAll(DAY_MONTH_RE)) {
        const d = toIsoDate(Number(m[1]), MONTHS[m[2].toLowerCase()], item.publishedAt);
        if (d) dates.add(d);
    }
    for (const m of item.title.matchAll(MONTH_DAY_RE)) {
        const d = toIsoDate(Number(m[2]), MONTHS[m[1].toLowerCase()], item.publishedAt);
        if (d) dates.add(d);
    }
    return [...dates];
}

function extractPlaces(title) {
    return PLACES.filter(([re]) => re.test(title)).map(([, name]) => name);
}

function hasClash(title) {
    const t = title.toLowerCase();
    return CLASH_WORDS.some(k => t.includes(k));
}

async function translate(text) {
    if (translationCache.has(text)) return translationCache.get(text);
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { timeout: 8000 });
        const zh = res.data[0].map(seg => seg[0]).join('');
        translationCache.set(text, zh);
        return zh;
    } catch (err) {
        console.error('Translate error:', err.message);
        return null;
    }
}

async function addTranslations(items) {
    const zh = await Promise.all(items.map(i => translate(i.title)));
    return items.map((item, idx) => ({ ...item, titleZh: zh[idx] || item.title }));
}

async function fetchAllNews() {
    const results = await Promise.allSettled(QUERIES.map(fetchRss));
    if (results.every(r => r.status === 'rejected')) {
        throw new Error('所有新闻源都请求失败');
    }

    const cutoff = Date.now() - MAX_AGE_DAYS * 86400 * 1000;
    const seen = new Set();
    const items = [];
    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const item of r.value) {
            const key = item.title.toLowerCase();
            if (seen.has(key) || new Date(item.publishedAt).getTime() < cutoff) continue;
            seen.add(key);
            items.push({ ...item, clash: hasClash(item.title) });
        }
    }
    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return items;
}

async function buildReport() {
    const items = await fetchAllNews();
    const today = parisToday();

    // Group articles by the protest date mentioned in their title
    const byDate = new Map();
    const undated = [];
    for (const item of items) {
        const dates = extractDates(item);
        if (dates.length === 0) {
            undated.push(item);
            continue;
        }
        for (const d of dates) {
            if (!byDate.has(d)) byDate.set(d, []);
            byDate.get(d).push(item);
        }
    }

    const events = [...byDate.entries()]
        .filter(([, list]) => list.length >= MIN_EVENT_ARTICLES)
        .map(([date, list]) => ({
            date,
            status: date > today ? 'upcoming' : date === today ? 'today' : 'past',
            articleCount: list.length,
            clashCount: list.filter(i => i.clash).length,
            places: [...new Set(list.flatMap(i => extractPlaces(i.title)))],
            articles: list.slice(0, 6),
        }));

    // Upcoming first (soonest first), then past (most recent first)
    events.sort((a, b) => {
        const aPast = a.status === 'past';
        const bPast = b.status === 'past';
        if (aPast !== bPast) return aPast ? 1 : -1;
        return aPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });

    for (const ev of events) {
        ev.articles = await addTranslations(ev.articles);
    }
    const latest = await addTranslations(undated.slice(0, 12));

    return { today, events, latest };
}

// Vercel imports the app; locally we start a server
if (require.main === module) {
    if (!AUTH_PASSWORD) {
        console.warn('ADMIN_PASSWORD is not set: all logins will be rejected');
    }
    app.listen(PORT, () => {
        console.log(`Paris Safety Monitor running on http://localhost:${PORT}`);
    });
}

module.exports = app;
