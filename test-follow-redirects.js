const axios = require('axios');

async function followRedirects() {
    let url = 'https://news.google.com/rss/articles/CBMiVkFVX3lxTE8zU200VHZ1MTFJc0twVlYzaDhLQXhKNE5wcm96Tmp4dHV4U21rSmpUNnZRTWxZN0NkX0lxYzdEdUY0M0ktbll3RGtxV2dobVc1M2ljOGd3?oc=5';

    console.log('手动跟随重定向链...\n');

    for (let i = 0; i < 10; i++) {
        console.log(`第${i + 1}次请求:`, url.slice(0, 100) + '...');

        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400
            });

            if (res.status === 200) {
                console.log('\n✓ 到达最终页面 (200)');
                console.log('✓ URL:', url);

                // 检查是否还在Google
                if (url.includes('google.com')) {
                    console.log('⚠ 仍在Google域名');
                } else {
                    console.log('✓ 真实新闻网站!');
                }
                break;
            }

        } catch (e) {
            if (e.response && e.response.status >= 300 && e.response.status < 400) {
                const location = e.response.headers.location;
                console.log(`  → ${e.response.status} 重定向到:`, location);

                if (!location) {
                    console.log('✗ 没有Location头');
                    break;
                }

                url = location;
            } else {
                console.error('✗ 错误:', e.message);
                break;
            }
        }
    }
}

followRedirects();
