const axios = require('axios');
const cheerio = require('cheerio');

async function testGoogleNewsRedirect() {
    // 从 data.json 取一个真实的 Google News 链接
    const url = 'https://news.google.com/rss/articles/CBMib0FVX3lxTE9DenByekdTZl9uNjBzUHNSRExvajcxUUZic0J4RnNrUkd6dFFOT3lQb0ZDbVVtakNMVXVtbzdUVkIwSGlPZXVBQ0R0a3RzY1B2ZHJXTTJfR24ySWxGcVdjNUhZOHY2c2NyQl80aUNaYw?oc=5';

    console.log('测试链接:', url);
    console.log('\n正在访问...\n');

    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 10,
            timeout: 15000
        });

        console.log('✓ 最终重定向到:', res.request.res.responseUrl);
        console.log('✓ 状态码:', res.status);
        console.log('✓ 内容长度:', res.data.length);

        const $ = cheerio.load(res.data);
        const title = $('title').text();
        console.log('✓ 页面标题:', title);

        // 尝试抓段落
        $('script, style, iframe, nav, header, footer, aside').remove();
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 50);

        console.log('\n找到', paragraphs.length, '个段落');
        if (paragraphs.length > 0) {
            console.log('\n前3段:');
            paragraphs.slice(0, 3).forEach((p, i) => {
                console.log(`\n${i + 1}. ${p.slice(0, 200)}...`);
            });
        }

    } catch (e) {
        console.error('✗ 错误:', e.message);
        if (e.response) {
            console.error('  状态码:', e.response.status);
            console.error('  URL:', e.response.config.url);
        }
    }
}

testGoogleNewsRedirect();
