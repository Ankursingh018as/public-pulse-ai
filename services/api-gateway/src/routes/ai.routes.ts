import { Router } from 'express';
import axios from 'axios';
import * as civicIssuesService from '../services/civic-issues.service';

export const aiRouter = Router();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// ==========================================
// POST /api/v1/ai/sentiment - Analyze citizen report sentiment
// ==========================================
aiRouter.post('/sentiment', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: 'Text is required' });
        }

        const response = await axios.post(`${AI_ENGINE_URL}/analyze/sentiment`, { text });
        res.json({ success: true, data: response.data.data });
    } catch (err: any) {
        console.error('Sentiment analysis error:', err?.message);
        // Fallback: basic keyword-based analysis if AI engine is unavailable
        const text = req.body.text || '';
        res.json({
            success: true,
            data: {
                urgency: text.length > 100 ? 'moderate' : 'low',
                urgency_score: 0.3,
                emotion: 'neutral',
                emotion_confidence: 0.5,
                severity_score: 0.3,
                language_detected: 'en',
                key_phrases: [],
                has_location: false,
                amplified: false,
                fallback: true,
            }
        });
    }
});

// ==========================================
// POST /api/v1/ai/sentiment/batch - Batch analyze reports
// ==========================================
aiRouter.post('/sentiment/batch', async (req, res) => {
    try {
        const { texts } = req.body;
        if (!texts || !Array.isArray(texts)) {
            return res.status(400).json({ success: false, error: 'texts array is required' });
        }

        const response = await axios.post(`${AI_ENGINE_URL}/analyze/sentiment/batch`, { texts });
        res.json({ success: true, data: response.data.data });
    } catch (err: any) {
        console.error('Batch sentiment error:', err?.message);
        res.status(500).json({ success: false, error: 'Sentiment analysis unavailable' });
    }
});

// ==========================================
// GET /api/v1/ai/summary - AI-powered city intelligence summary
// ==========================================
aiRouter.get('/summary', async (req, res) => {
    try {
        const { period = '24' } = req.query;
        const periodHours = parseInt(period as string) || 24;

        // Fetch current incidents from PostgreSQL
        const incidents = await civicIssuesService.getCivicIssues({ limit: 500 });
        
        // Transform for AI engine
        const transformedIncidents = incidents.map(issue => ({
            id: issue.id,
            event_type: issue.type,
            type: issue.type,
            lat: issue.location?.lat || 0,
            lng: issue.location?.lng || 0,
            severity: issue.severity || 0.5,
            status: issue.status || 'pending',
            resolved: issue.status === 'resolved',
            area_name: issue.area_name || 'Vadodara',
            createdAt: issue.created_at,
        }));

        try {
            // Try AI engine first
            const response = await axios.post(`${AI_ENGINE_URL}/ai/summarize`, {
                incidents: transformedIncidents,
                predictions: [],
                period_hours: periodHours,
            }, { timeout: 5000 });
            
            res.json({ success: true, data: response.data.data });
        } catch {
            // Generate summary locally if AI engine unavailable
            const active = transformedIncidents.filter(i => !i.resolved);
            const critical = active.filter(i => i.severity >= 0.7);
            const pending = active.filter(i => i.status === 'pending');

            // Type distribution
            const typeDist: Record<string, number> = {};
            active.forEach(i => {
                typeDist[i.event_type] = (typeDist[i.event_type] || 0) + 1;
            });

            // Area hotspots
            const areaCounts: Record<string, number> = {};
            active.forEach(i => {
                areaCounts[i.area_name] = (areaCounts[i.area_name] || 0) + 1;
            });
            const hotspots = Object.entries(areaCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([area, count]) => ({ area, incidents: count, severity: 0.5 }));

            // Health score
            let healthScore = 100 - Math.min(30, active.length * 2) - Math.min(25, critical.length * 8);
            healthScore = Math.max(0, Math.min(100, healthScore));

            const healthLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' :
                healthScore >= 55 ? 'Fair' : healthScore >= 40 ? 'Concerning' : 'Critical';

            let narrative = `📊 Currently tracking ${active.length} active incident${active.length !== 1 ? 's' : ''}.`;
            if (critical.length > 0) narrative = `⚠️ ${critical.length} critical incident${critical.length !== 1 ? 's' : ''} require attention. ` + narrative;
            if (pending.length > 0) narrative += ` ⏳ ${pending.length} awaiting admin review.`;

            res.json({
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    period_hours: periodHours,
                    health_score: healthScore,
                    health_label: healthLabel,
                    metrics: {
                        total_active: active.length,
                        new_last_period: active.length,
                        critical: critical.length,
                        pending_review: pending.length,
                        predictions_active: 0,
                    },
                    type_distribution: typeDist,
                    hotspot_areas: hotspots,
                    trend: { direction: 'stable', change_percent: 0 },
                    narrative,
                    recommendations: [],
                    anomalies: [],
                    ai_confidence: 0.7,
                }
            });
        }
    } catch (err) {
        console.error('AI summary error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate summary' });
    }
});

// ==========================================
// GET /api/v1/ai/health - Quick city health score
// ==========================================
aiRouter.get('/health', async (req, res) => {
    try {
        const incidents = await civicIssuesService.getCivicIssues({ limit: 200 });
        const active = incidents.filter(i => i.status !== 'resolved');
        const critical = active.filter(i => (i.severity || 0) >= 0.7);

        let score = 100 - Math.min(30, active.length * 2) - Math.min(25, critical.length * 8);
        score = Math.max(0, Math.min(100, score));

        const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' :
            score >= 55 ? 'Fair' : score >= 40 ? 'Concerning' : 'Critical';

        res.json({
            success: true,
            data: {
                score,
                label,
                active_incidents: active.length,
                critical_incidents: critical.length,
                timestamp: new Date().toISOString(),
            }
        });
    } catch (err) {
        console.error('Health score error:', err);
        res.status(500).json({ success: false, error: 'Failed to calculate health score' });
    }
});
