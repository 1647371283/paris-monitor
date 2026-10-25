const axios = require('axios');
const cheerio = require('cheerio');

async function testRssParse() {
    const rssUrl = 'https://news.google.com/rss/search?q=Paris&hl=en-US&gl=US&ceid=US:en';

    console.log('获取RSS...\n');

    const res = await axios.get(rssUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
    });

    const $ = cheerio.load(res.data, { xmlMode: true });

    // 获取第一条新闻
    const firstItem = $('item').first();

    console.log('标题:', firstItem.find('title').text());
    console.log('来源:', firstItem.find('source').text());
    console.log('链接:', firstItem.find('link').text());
    console.log('GUID:', firstItem.find('guid').text());

    // 检查是否有原始链接
    const description = firstItem.find('description').text();
    console.log('\n描述片段:', description.slice(0, 500));

    // 尝试从描述中提取链接
    if (description) {
        const descHtml = cheerio.load(description);
        const links = descHtml('a').map((i, el) => descHtml(el).attr('href')).get();
        console.log('\n描述中的链接:', links);
    }
}

testRssParse().catch(e => console.error('错误:', e.message));
