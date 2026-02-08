const axios = require('axios');
const mongoose = require('mongoose');
const { CronJob } = require('cron');
const dotenv = require('dotenv');
const RssParser = require('rss-parser');

dotenv.config();

// ===========================================
// CONFIG
// ===========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/pulse_raw';
const CITY_QUERY = 'Vadodara';
const REFRESH_INTERVAL = '0 */30 * * * *'; // Every 30 minutes
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';

// ... (existing MongoDB setup)

async function fetchNewsAPI() {
    console.log('📰 Fetching from NewsAPI for:', CITY_QUERY);
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(CITY_QUERY)}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
        const response = await axios.get(url);

        let newCount = 0;
        const articles = response.data.articles || [];

        for (const item of articles) {
            try {
                const exists = await NewsArticle.findOne({ link: item.url });
                if (!exists) {
                    await NewsArticle.create({
                        sourceId: item.source.id || 'newsapi',
                        title: item.title,
                        link: item.url,
                        pubDate: new Date(item.publishedAt),
                        contentSnippet: item.description || item.content,
                        source: 'newsapi'
                    });
                    newCount++;

                    // Trigger AI Engine
                    try {
                        const aiUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
                        await axios.post(`${aiUrl}/process/text`, {
                            text: `${item.title} - ${item.description || ''}`,
                            source: 'news',
                            metadata: {
                                link: item.url,
                                pubDate: item.publishedAt
                            }
                        });
                    } catch (err) {
                        console.error('Failed to trigger AI:', err.message);
                    }
                }
            } catch (dbErr) {
                // Ignore duplicates
            }
        }
        console.log(`✅ NewsAPI: Fetched ${articles.length} items, ${newCount} new.`);
    } catch (error) {
        console.error('❌ Error fetching NewsAPI:', error.response?.data?.message || error.message);
    }
}

async function fetchGoogleNews() {
    // ... (keep existing Google News logic, but remove the variable definition if it conflicts)
    console.log('📰 Fetching Google News for:', CITY_QUERY);
    try {
        const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(CITY_QUERY + ' traffic OR waterlogging OR garbage OR civic issue')}&hl=en-IN&gl=IN&ceid=IN:en`;
        const feed = await parser.parseURL(feedUrl);
        // ... (rest of logic same as before)

        // I will copy the logic from original file here to ensure it's preserved
        let newCount = 0;
        for (const item of feed.items) {
            try {
                const exists = await NewsArticle.findOne({ link: item.link });
                if (!exists) {
                    await NewsArticle.create({
                        sourceId: item.guid || item.id,
                        title: item.title,
                        link: item.link,
                        pubDate: new Date(item.pubDate),
                        contentSnippet: item.contentSnippet || item.content,
                        source: 'google_news'
                    });
                    newCount++;
                    try {
                        const aiUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
                        await axios.post(`${aiUrl}/process/text`, {
                            text: `${item.title} - ${item.contentSnippet || ''}`,
                            source: 'news',
                            metadata: { link: item.link, pubDate: item.pubDate }
                        });
                    } catch (err) { console.error('Failed to trigger AI:', err.message); }
                }
            } catch (dbErr) { }
        }
        console.log(`✅ GoogleNews: Fetched ${feed.items.length} items, ${newCount} new.`);
    } catch (error) {
        console.error('❌ Error fetching Google News:', error.message);
    }
}

// ===========================================
// SCHEDULER
// ===========================================
const job = new CronJob(
    REFRESH_INTERVAL,
    () => {
        fetchGoogleNews();
        fetchNewsAPI();
    },
    null,
    true,
    'Asia/Kolkata'
);

console.log(`🚀 News-Service started. Scheduling scrape every 30 mins.`);
// Run immediately on start
fetchGoogleNews();
fetchNewsAPI();
