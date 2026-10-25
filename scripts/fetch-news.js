const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const QUERIES = [
    { q: 'manifestation Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'protest Paris', hl: 'en', gl: 'FR', ceid: 'FR:en' },
    { q: 'grève Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
];

const HIGH_RISK = ['violence', 'clash', 'arrest', 'heurts', 'violences', 'interpellations'];
const MEDIUM_RISK = ['manifestation', 'protest', 'strike', 'grève', 'demonstration'];
const SKIP_PATTERNS = [
    /\b\d{3,5}\s*(arrested|interpellations?|arrestations?)\b/i,
    /\barrested?\s+\d{2,4}\b/i,
];

const PLACE_KEYWORDS = [
    { fr: /place\s+de\s+la\s+r[ée]publique/gi, zh: '共和国广场 République' },
    { fr: /bastille/gi, zh: '巴士底 Bastille' },
    { fr: /porte\s+de\s+vincennes/gi, zh: '樊尚门 Porte de Vincennes' },
    { fr: /nation/gi, zh: '民族广场 Nation' },
    { fr: /ch[âa]telet/gi, zh: '夏特雷 Châtelet' },
    { fr: /op[ée]ra/gi, zh: '歌剧院 Opéra' },
    { fr: /champs[- ]?[ée]lys[ée]es/gi, zh: '香榭丽舍 Champs-Élysées' },
    { fr: /concorde/gi, zh: '协和广场 Concorde' },
    { fr: /invalides/gi, zh: '荣军院 Invalides' },
];

async function fetchRss({ q, hl, gl, ceid }) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:2d')}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GitHubActions/1.0)' },
        timeout: 15000,
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
        const rawTitle = $(el).find('title').text().trim();
        const source = $(el).find('source').text().trim();
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

function classify(title) {
    const t = title.toLowerCase();
    if (HIGH_RISK.some(k => t.includes(k))) return 'high';
    if (MEDIUM_RISK.some(k => t.includes(k))) return 'medium';
    return 'info';
}

function shouldSkip(title) {
    return SKIP_PATTERNS.some(p => p.test(title));
}

async function translate(text) {
    const strategies = [
        // 1. MyMemory 翻译 API（免费，无需 API key）
        async () => {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
            const res = await axios.get(url, { timeout: 5000 });
            return res.data.responseData?.translatedText;
        },
        // 2. LibreTranslate（开源，无限制）
        async () => {
            const res = await axios.post('https://libretranslate.com/translate', {
                q: text,
                source: 'en',
                target: 'zh',
                format: 'text'
            }, { timeout: 5000 });
            return res.data.translatedText;
        },
        // 3. Google 翻译（备用）
        async () => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
            const res = await axios.get(url, { timeout: 5000 });
            return res.data[0].map(seg => seg[0]).join('');
        }
    ];

    for (const strategy of strategies) {
        try {
            const result = await strategy();
            if (result && result !== text) return result;
        } catch (e) {
            continue; // 尝试下一个
        }
    }
    return null; // 所有方法都失败，保留原文
}

function extractPlaces(text) {
    const found = [];
    for (const { fr, zh } of PLACE_KEYWORDS) {
        if (fr.test(text)) {
            found.push(zh);
            fr.lastIndex = 0;
        }
    }
    return [...new Set(found)];
}

function extractDate(title) {
    const patterns = [
        /\b(\d{1,2})\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i,
        /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i,
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
    ];
    for (const p of patterns) {
        const m = title.match(p);
        if (m) return m[0];
    }
    return null;
}

async function main() {
    console.log('Fetching news...');
    const results = await Promise.allSettled(QUERIES.map(fetchRss));
    const cutoff = Date.now() - 48 * 3600 * 1000;
    const seen = new Set();
    const items = [];

    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const item of r.value) {
            const key = item.title.toLowerCase();
            if (seen.has(key)) continue;
            if (new Date(item.publishedAt).getTime() < cutoff) continue;
            if (shouldSkip(item.title)) continue;
            seen.add(key);
            items.push({ ...item, severity: classify(item.title) });
        }
    }

    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const top = items.slice(0, 40);

    console.log(`Translating ${top.length} titles...`);
    for (const item of top) {
        item.titleZh = await translate(item.title) || item.title;
        await new Promise(r => setTimeout(r, 200));
    }

    const events = {};
    for (const item of top) {
        const date = extractDate(item.title) || 'unknown';
        if (!events[date]) {
            events[date] = { date, articles: [], places: new Set(), clashCount: 0 };
        }
        events[date].articles.push(item);
        if (item.severity === 'high') events[date].clashCount++;
        extractPlaces(item.title).forEach(p => events[date].places.add(p));
    }

    const output = {
        success: true,
        today: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        events: Object.values(events).map(e => ({
            ...e,
            places: [...e.places],
            articleCount: e.articles.length,
            status: e.date.match(/31|5\s+novembre|november\s+5/i) ? 'upcoming' : 'past',
        })),
        latest: top,
    };

    const outPath = path.join(__dirname, '../docs/data.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`✓ Saved to ${outPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
