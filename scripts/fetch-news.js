const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { translate: googleTranslate } = require('@vitalets/google-translate-api');

const QUERIES = [
    { q: 'manifestation Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'protest Paris', hl: 'en', gl: 'FR', ceid: 'FR:en' },
    { q: 'grève Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'émeute Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { q: 'violence Paris', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
];

const HIGH_RISK = ['violence', 'clash', 'arrest', 'heurts', 'violences', 'interpellations'];
const MEDIUM_RISK = ['manifestation', 'protest', 'strike', 'grève', 'demonstration'];
const SKIP_PATTERNS = [
    /\b\d{3,5}\s*(arrested|interpellations?|arrestations?)\b/i,
    /\barrested?\s+\d{2,4}\b/i,
];

const PLACE_KEYWORDS = [
    { fr: /place\s+de\s+la\s+r[ée]publique/gi, zh: '共和国广场 République', districts: [3, 10, 11] },
    { fr: /bastille/gi, zh: '巴士底 Bastille', districts: [4, 11, 12] },
    { fr: /porte\s+de\s+vincennes/gi, zh: '樊尚门 Porte de Vincennes', districts: [12, 20] },
    { fr: /nation/gi, zh: '民族广场 Nation', districts: [11, 12] },
    { fr: /ch[âa]telet/gi, zh: '夏特雷 Châtelet', districts: [1, 4] },
    { fr: /op[ée]ra/gi, zh: '歌剧院 Opéra', districts: [2, 9] },
    { fr: /champs[- ]?[ée]lys[ée]es/gi, zh: '香榭丽舍 Champs-Élysées', districts: [8] },
    { fr: /concorde/gi, zh: '协和广场 Concorde', districts: [1, 8] },
    { fr: /invalides/gi, zh: '荣军院 Invalides', districts: [7] },
    { fr: /montparnasse/gi, zh: '蒙帕纳斯 Montparnasse', districts: [14, 15] },
    { fr: /trocad[ée]ro/gi, zh: '特罗卡德罗 Trocadéro', districts: [16] },
    { fr: /\b(\d{1,2})(er|e)\s+arrondissement\b/gi, zh: '', districts: [] }, // 处理区号
];

// 注：正文抓取已禁用
// Google News的反爬虫机制使得程序化抓取不可行
// 用户可以直接点击链接访问原文
async function fetchArticleContent(link) {
    return null;
}

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
    try {
        const result = await googleTranslate(text, { to: 'zh-CN' });
        return result.text;
    } catch (e) {
        return null; // 失败保留原文
    }
}

function extractPlaces(text) {
    const found = [];
    const districts = new Set();

    for (const { fr, zh, districts: dist } of PLACE_KEYWORDS) {
        const match = fr.exec(text);
        if (match) {
            if (zh) found.push(zh);
            if (dist) dist.forEach(d => districts.add(d));

            // 如果是区号模式，提取区号
            if (match[1]) {
                const num = parseInt(match[1]);
                if (num >= 1 && num <= 20) {
                    districts.add(num);
                }
            }
            fr.lastIndex = 0;
        }
    }

    // 也尝试直接匹配区号 "3e", "10e", "20e"
    const districtPattern = /\b(\d{1,2})(er|e)\b/g;
    let m;
    while ((m = districtPattern.exec(text)) !== null) {
        const num = parseInt(m[1]);
        if (num >= 1 && num <= 20) {
            districts.add(num);
        }
    }

    return {
        places: [...new Set(found)],
        districts: [...districts].sort((a, b) => a - b)
    };
}

function extractDate(title) {
    const today = new Date();
    const monthMap = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    // "31 octobre" or "October 31"
    const pattern1 = /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|january|february|march|april|may|june|july|august|september|october|november|december)/i;
    const m1 = title.match(pattern1);
    if (m1) {
        const day = parseInt(m1[1]);
        const month = monthMap[m1[2].toLowerCase()];
        if (month !== undefined) {
            const date = new Date(today.getFullYear(), month, day);
            if (date < today) date.setFullYear(date.getFullYear() + 1);
            return date.toISOString().split('T')[0];
        }
    }

    // "samedi" or specific weekday
    if (/\b(ce\s+)?(samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi)\b/i.test(title)) {
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        for (let i = 0; i < days.length; i++) {
            if (title.toLowerCase().includes(days[i])) {
                const targetDay = i;
                const currentDay = today.getDay();
                let daysToAdd = (targetDay - currentDay + 7) % 7;
                if (daysToAdd === 0) daysToAdd = 7; // Next week
                const date = new Date(today);
                date.setDate(date.getDate() + daysToAdd);
                return date.toISOString().split('T')[0];
            }
        }
    }

    // "demain"
    if (/\bdemain\b/i.test(title)) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    // "aujourd'hui"
    if (/aujourd'hui|today/i.test(title)) {
        return today.toISOString().split('T')[0];
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

    // 读取旧翻译数据（远程和本地）
    const oldDataPath = path.join(__dirname, '../docs/data.json');
    const oldTranslations = new Map();

    // 先尝试从 GitHub Pages 获取最新数据（如果已部署）
    try {
        const remoteUrl = 'https://1647371283.github.io/paris-monitor/data.json';
        const https = require('https');
        const remoteData = await new Promise((resolve, reject) => {
            https.get(remoteUrl, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        remoteData.events?.forEach(e => {
            e.articles?.forEach(a => {
                if (a.titleZh && a.titleZh !== a.title) {
                    oldTranslations.set(a.title, a.titleZh);
                }
            });
        });
        console.log(`Loaded ${oldTranslations.size} translations from remote`);
    } catch (e) {
        console.log('Remote data not available, trying local...');
        // 回退到本地文件
        if (fs.existsSync(oldDataPath)) {
            try {
                const oldData = JSON.parse(fs.readFileSync(oldDataPath, 'utf8'));
                oldData.events?.forEach(e => {
                    e.articles?.forEach(a => {
                        if (a.titleZh && a.titleZh !== a.title) {
                            oldTranslations.set(a.title, a.titleZh);
                        }
                    });
                });
                console.log(`Loaded ${oldTranslations.size} translations from local`);
            } catch (e) {
                console.log('No old translations found');
            }
        }
    }

    console.log(`Processing ${top.length} articles...`);
    for (const item of top) {
        // 优先使用旧翻译
        if (oldTranslations.has(item.title)) {
            item.titleZh = oldTranslations.get(item.title);
        } else {
            // 只翻译新文章
            item.titleZh = await translate(item.title) || item.title;
            await new Promise(r => setTimeout(r, 200));
        }

        // 抓取文章正文
        console.log(`Fetching content from: ${item.source}`);
        item.content = await fetchArticleContent(item.link);
        if (item.content) {
            console.log(`✓ Got ${item.content.length} chars from ${item.source}`);
        }
        await new Promise(r => setTimeout(r, 500)); // 避免请求过快
    }

    const events = {};
    for (const item of top) {
        const date = extractDate(item.title) || 'unknown';
        if (!events[date]) {
            events[date] = {
                date,
                articles: [],
                places: new Set(),
                districts: new Set(),
                clashCount: 0
            };
        }
        events[date].articles.push(item);
        if (item.severity === 'high') events[date].clashCount++;

        const { places, districts } = extractPlaces(item.title);
        places.forEach(p => events[date].places.add(p));
        districts.forEach(d => events[date].districts.add(d));
    }

    const output = {
        success: true,
        today: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        events: Object.values(events).map(e => ({
            date: e.date,
            articles: e.articles,
            places: [...e.places],
            districts: [...e.districts].sort((a, b) => a - b),
            articleCount: e.articles.length,
            clashCount: e.clashCount,
            status: ['2026-10-31', '2026-11-05'].includes(e.date) ? 'upcoming' :
                    e.date === 'unknown' ? 'unknown' : 'recent',
        })).sort((a, b) => {
            if (a.date === 'unknown') return 1;
            if (b.date === 'unknown') return -1;
            return new Date(a.date) - new Date(b.date);
        }),
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
