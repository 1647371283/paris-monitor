const axios = require('axios');
const cheerio = require('cheerio');

async function testRealFetch() {
    const googleUrl = 'https://news.google.com/rss/articles/CBMib0FVX3lxTE9DenByekdTZl9uNjBzUHNSRExvajcxUUZic0J4RnNrUkd6dFFOT3lQb0ZDbVVtakNMVXVtbzdUVkIwSGlPZXVBQ0R0a3RzY1B2ZHJXTTJfR24ySWxGcVdjNUhZOHY2c2NyQl80aUNaYw?oc=5';

    console.log('1. 访问 Google News 链接...\n');

    const googleRes = await axios.get(googleUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 10,
        timeout: 10000
    });

    const $ = cheerio.load(googleRes.data);
    const allowedDomains = ['lemonde.fr', 'liberation.fr', 'france24.com', 'franceinfo.fr', 'rfi.fr'];

    console.log('2. 在页面中查找真实链接...\n');

    let realUrl = null;
    $('a[href*="http"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('google.com')) {
            try {
                const domain = new URL(href).hostname.replace('www.', '');
                if (allowedDomains.some(d => domain.includes(d))) {
                    console.log('   找到:', href);
                    realUrl = href;
                    return false;
                }
            } catch (e) {}
        }
    });

    if (!realUrl) {
        console.log('✗ 未找到合适的链接');
        return;
    }

    console.log('\n3. 访问真实文章...\n');

    const articleRes = await axios.get(realUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://news.google.com/'
        },
        timeout: 10000,
        maxRedirects: 5
    });

    const $$ = cheerio.load(articleRes.data);

    $$('script, style, iframe, nav, header, footer, aside').remove();

    const selectors = ['article', '[role="article"]', '.article-body', 'main'];
    let content = '';
    for (const selector of selectors) {
        const el = $$(selector).first();
        if (el.length) {
            content = el.text().trim();
            if (content.length > 200) {
                console.log('✓ 找到内容 (选择器:', selector, ')');
                break;
            }
        }
    }

    if (content.length < 200) {
        const paragraphs = $$('p').map((i, el) => $$(el).text().trim()).get();
        content = paragraphs.filter(p => p.length > 50).join('\n\n');
        console.log('✓ 从段落提取 (', paragraphs.length, '段)');
    }

    content = content.replace(/\s+/g, ' ').trim();

    console.log('\n✓ 内容长度:', content.length);
    console.log('\n前200字:\n', content.slice(0, 200), '...\n');
}

testRealFetch().catch(e => console.error('错误:', e.message));
