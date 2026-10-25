const { translate } = require('@vitalets/google-translate-api');

async function test() {
    console.log('Testing @vitalets/google-translate-api...');
    try {
        const result = await translate("Manifestation du 31 octobre, à quoi s'attendre à Paris ?", { to: 'zh-CN' });
        console.log('✓ Result:', result.text);
    } catch (e) {
        console.error('✗ Failed:', e.message);
    }
}

test();
