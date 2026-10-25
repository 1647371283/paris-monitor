const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// 密码配置
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '991108';

app.use(cors());
app.use(express.json());

// 密码验证中间件
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const password = req.headers['x-password'];

    if (password === AUTH_PASSWORD) {
        return next();
    }

    res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '密码错误'
    });
}

// 静态文件不需要密码
app.use(express.static(path.join(__dirname, '../public')));

// 搜索新闻的API (需要密码)
app.post('/api/search', requireAuth, async (req, res) => {
    try {
        const results = await searchParisNews();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: results
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

async function searchParisNews() {
    const results = {
        activeProtests: [],
        safeAreas: [],
        upcoming: [],
        recommendations: []
    };

    // 搜索多个来源
    const searches = [
        searchGoogleNews('Paris protest today'),
        searchGoogleNews('manifestation Paris'),
        searchTwitter('Paris demonstration'),
    ];

    try {
        const allResults = await Promise.allSettled(searches);

        // 处理搜索结果
        allResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                processSearchResults(result.value, results);
            }
        });

        // 如果没有找到具体信息，添加默认建议
        if (results.activeProtests.length === 0) {
            results.recommendations.push({
                type: 'info',
                title: '当前无明确游行报告',
                content: '未在主流媒体找到今日游行信息，但建议继续关注官方通告',
                source: '系统分析',
                timestamp: new Date().toISOString()
            });
        }

        // 添加通用安全建议
        results.recommendations.push({
            type: 'tip',
            title: '实时监控建议',
            content: '建议下载Waze或Google Maps查看实时路况，避开封路区域',
            source: '安全建议'
        });

    } catch (error) {
        console.error('Error in searchParisNews:', error);
    }

    return results;
}

async function searchGoogleNews(query) {
    try {
        // 使用DuckDuckGo作为搜索引擎（无需API密钥）
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' Paris news')}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('.result').slice(0, 5).each((i, elem) => {
            const title = $(elem).find('.result__title').text().trim();
            const snippet = $(elem).find('.result__snippet').text().trim();
            const link = $(elem).find('.result__url').attr('href');

            if (title && snippet) {
                results.push({
                    title,
                    snippet,
                    link,
                    source: 'Web Search',
                    timestamp: new Date().toISOString()
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Search error:', error.message);
        return [];
    }
}

async function searchTwitter(query) {
    // Twitter搜索需要API，这里返回模拟数据
    return [{
        title: 'Twitter实时监控',
        snippet: '建议访问 twitter.com/search?q=%23manifestationParis 查看实时推文',
        link: 'https://twitter.com/search?q=%23manifestationParis',
        source: 'Twitter',
        timestamp: new Date().toISOString()
    }];
}

function processSearchResults(searchResults, results) {
    searchResults.forEach(item => {
        const lowerTitle = item.title.toLowerCase();
        const lowerSnippet = item.snippet.toLowerCase();

        // 检测关键词判断严重程度
        const hasProtest = lowerTitle.includes('protest') || lowerTitle.includes('manifestation') ||
                          lowerSnippet.includes('protest') || lowerSnippet.includes('manifestation');
        const hasViolence = lowerTitle.includes('violence') || lowerTitle.includes('émeute') ||
                           lowerSnippet.includes('violence') || lowerSnippet.includes('émeute');

        if (hasViolence) {
            results.activeProtests.push({
                type: 'danger',
                title: item.title,
                content: item.snippet,
                source: item.source,
                link: item.link,
                timestamp: item.timestamp,
                severity: 'high'
            });
        } else if (hasProtest) {
            results.activeProtests.push({
                type: 'warning',
                title: item.title,
                content: item.snippet,
                source: item.source,
                link: item.link,
                timestamp: item.timestamp,
                severity: 'medium'
            });
        } else {
            results.upcoming.push({
                type: 'info',
                title: item.title,
                content: item.snippet,
                source: item.source,
                link: item.link,
                timestamp: item.timestamp
            });
        }
    });
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Paris Safety Monitor running on http://localhost:${PORT}`);
    console.log(`📱 Open this URL on your phone to access the monitor`);
});
