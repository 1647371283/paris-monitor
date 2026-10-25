const axios = require('axios');

async function testRedirect() {
    const googleUrl = 'https://news.google.com/rss/articles/CBMiVkFVX3lxTE8zU200VHZ1MTFJc0twVlYzaDhLQXhKNE5wcm96Tmp4dHV4U21rSmpUNnZRTWxZN0NkX0lxYzdEdUY0M0ktbll3RGtxV2dobVc1M2ljOGd3?oc=5';

    console.log('测试Google News重定向...\n');
    console.log('原始链接:', googleUrl);

    try {
        // 关键：设置 maxRedirects: 0，这样可以捕获302重定向的Location
        const res = await axios.get(googleUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 0,  // 不自动跟随重定向
            validateStatus: (status) => status >= 200 && status < 400  // 接受3xx
        });

        console.log('\n状态码:', res.status);
        console.log('Location头:', res.headers.location);

    } catch (e) {
        // axios会把3xx当作错误，需要从error中获取
        if (e.response) {
            console.log('\n状态码:', e.response.status);
            console.log('Location头:', e.response.headers.location);

            if (e.response.headers.location) {
                console.log('\n✓ 真实链接:', e.response.headers.location);
            }
        } else {
            console.error('错误:', e.message);
        }
    }
}

testRedirect();
