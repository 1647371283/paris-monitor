const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const text = "Manifestation du 31 octobre, à quoi s'attendre à Paris ?";
    console.log('Testing Bing Translate...');
    
    try {
        const url = `https://bing.com/translator?text=${encodeURIComponent(text)}&from=auto&to=zh-Hans`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(res.data);
        const result = $('textarea[id="tta_output_ta"]').val();
        console.log('✓ Bing:', result);
    } catch (e) {
        console.error('✗ Bing failed:', e.message);
    }
}

test();
