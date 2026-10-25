const axios = require('axios');

async function test() {
    const text = "Manifestation du 31 octobre, à quoi s'attendre à Paris ?";
    
    console.log('Testing Google Translate...');
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { timeout: 5000 });
        const result = res.data[0].map(seg => seg[0]).join('');
        console.log('✓ Google:', result);
    } catch (e) {
        console.error('✗ Google failed:', e.message);
    }
}

test();
