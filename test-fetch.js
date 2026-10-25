const axios = require('axios');
const cheerio = require('cheerio');

async function testFetch() {
    const url = 'https://news.google.com/rss/articles/CBMixAFBVV95cUxQZWZNaXFONG9ROUZQSjNMclBuSWs1WmhXdW4xQTFtSzd4LTlCWEo5dXpHSXlUR1hiSlVrV0Q5ZjJEck9ObnptcFZpTXdxTkRvNy1zVzQydmd1RkdIcnFVRWN4QVdEZnlzVVBJazZucVFHSHU3dmt6SXBYV2RBeGZtdVRRRjZIVFBoZThmTDRtamxZazFEU0xRYkNMUkdhSEtfZlZ0eUxnWXJTVUhmSVB2bzEtaDVKYVJJWExGNzFTLUw3eTFM?oc=5';

    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            maxRedirects: 10,
            timeout: 15000
        });

        console.log('Final URL:', res.request.res.responseUrl);
        const $ = cheerio.load(res.data);

        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 50);
        console.log('Found', paragraphs.length, 'paragraphs');
        console.log('\nFirst 3 paragraphs:');
        paragraphs.slice(0, 3).forEach((p, i) => {
            console.log(`\n${i + 1}. ${p}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testFetch();
