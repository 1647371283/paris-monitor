const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 游行相关的RSS feed
const PROTEST_RSS_URL = 'https://news.google.com/rss/search?q=manifestation+Paris+OR+grève+Paris+OR+protest+Paris&hl=fr&gl=FR&ceid=FR:fr';

// 抓取游行新闻
async function fetchProtestNews() {
    console.log('Fetching protest news...');

    const res = await axios.get(PROTEST_RSS_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    const items = $('item');

    const articles = [];
    items.each((i, item) => {
        const title = $(item).find('title').text();
        const link = $(item).find('link').text();
        const pubDate = $(item).find('pubDate').text();
        const source = $(item).find('source').text();

        articles.push({
            title,
            source,
            link,
            publishedAt: new Date(pubDate).toISOString(),
            rawText: title // 用于AI提取
        });
    });

    console.log(`Found ${articles.length} protest-related articles`);
    return articles;
}

// 从标题中提取日期（简单模式识别）
function extractDateFromText(text) {
    const today = new Date();

    // 法语日期模式
    const patterns = [
        // "27 octobre", "le 15 novembre"
        /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
        // "lundi 27", "mardi prochain"
        /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})?/i,
        // "ce samedi", "ce week-end"
        /(ce|cette)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|week-end)/i,
        // "demain", "aujourd'hui"
        /(demain|aujourd'hui|hier)/i
    ];

    const monthMap = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2] && monthMap[match[2].toLowerCase()] !== undefined) {
                // "27 octobre"
                const day = parseInt(match[1]);
                const month = monthMap[match[2].toLowerCase()];
                const date = new Date(today.getFullYear(), month, day);
                if (date < today) date.setFullYear(date.getFullYear() + 1);
                return date.toISOString().split('T')[0];
            }
            if (match[1] === 'demain') {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
            }
            if (match[1] === "aujourd'hui") {
                return today.toISOString().split('T')[0];
            }
        }
    }

    return null;
}

// 从标题中提取区域
function extractDistricts(text) {
    const districts = [];

    // 匹配 "1er", "2e", "3e" ... "20e"
    const matches = text.match(/(\d{1,2})(er|e)\s+(arrondissement)?/gi);
    if (matches) {
        matches.forEach(m => {
            const num = parseInt(m);
            if (num >= 1 && num <= 20) {
                districts.push(num);
            }
        });
    }

    // 著名地点到区域的映射
    const landmarks = {
        'République': [3, 10, 11],
        'Bastille': [4, 11, 12],
        'Nation': [11, 12],
        'Concorde': [1, 8],
        'Invalides': [7],
        'Trocadéro': [16],
        'Montparnasse': [14, 15],
        'Châtelet': [1, 4]
    };

    Object.entries(landmarks).forEach(([name, nums]) => {
        if (text.includes(name)) {
            districts.push(...nums);
        }
    });

    return [...new Set(districts)].sort((a, b) => a - b);
}

// 分析严重程度
function analyzeSeverity(text) {
    const highKeywords = ['émeute', 'affrontement', 'violence', 'casseurs', 'black bloc', 'confrontation'];
    const mediumKeywords = ['manifestation', 'grève', 'protest', 'rassemblement'];

    const lower = text.toLowerCase();

    if (highKeywords.some(k => lower.includes(k))) return 'high';
    if (mediumKeywords.some(k => lower.includes(k))) return 'medium';
    return 'low';
}

// 主函数
async function main() {
    try {
        const articles = await fetchProtestNews();

        // 处理每篇文章
        const events = [];

        articles.forEach(article => {
            const date = extractDateFromText(article.title);
            const districts = extractDistricts(article.title);
            const severity = analyzeSeverity(article.title);

            events.push({
                ...article,
                date: date || 'unknown',
                districts,
                severity,
                type: 'protest'
            });
        });

        // 按日期分组
        const grouped = {};
        events.forEach(e => {
            if (!grouped[e.date]) grouped[e.date] = [];
            grouped[e.date].push(e);
        });

        // 保存
        const output = {
            success: true,
            type: 'protests',
            updatedAt: new Date().toISOString(),
            events: Object.entries(grouped).map(([date, articles]) => ({
                date,
                articles: articles.slice(0, 10) // 每天最多10条
            })).sort((a, b) => {
                if (a.date === 'unknown') return 1;
                if (b.date === 'unknown') return -1;
                return new Date(a.date) - new Date(b.date);
            })
        };

        const outPath = path.join(__dirname, '../docs/protests.json');
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
        console.log(`✓ Saved to ${outPath}`);

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

main();
