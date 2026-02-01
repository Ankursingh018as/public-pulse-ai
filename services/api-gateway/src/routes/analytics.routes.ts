import { Router } from 'express';
import { pgPool } from '../server';

export const analyticsRouter = Router();

// GET /api/v1/analytics/summary - Get overall summary stats
analyticsRouter.get('/summary', async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const result = await pgPool.query(`
            SELECT 
                (SELECT COUNT(*) FROM predictions WHERE is_active = true) as active_predictions,
                (SELECT COUNT(*) FROM civic_issues WHERE created_at > NOW() - INTERVAL '${days} days') as recent_issues,
                (SELECT COUNT(*) FROM alerts WHERE created_at > NOW() - INTERVAL '${days} days') as recent_alerts,
                (SELECT COUNT(*) FROM alerts WHERE status = 'resolved' AND created_at > NOW() - INTERVAL '${days} days') as resolved_alerts,
                (SELECT AVG(probability) FROM predictions WHERE is_active = true) as avg_probability,
                (SELECT COUNT(*) FROM predictions WHERE probability > 0.7 AND is_active = true) as high_risk_count
        `);

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/analytics/trends - Get time-series data
analyticsRouter.get('/trends', async (req, res) => {
    try {
        const { days = 7 } = req.query;

        // Get daily prediction counts
        const predTrend = await pgPool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                AVG(probability) as avg_probability
            FROM predictions
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Get daily issue counts
        const issueTrend = await pgPool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM civic_issues
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Get alert trend
        const alertTrend = await pgPool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved
            FROM alerts
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        res.json({
            data: {
                predictions: predTrend.rows,
                issues: issueTrend.rows,
                alerts: alertTrend.rows
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/analytics/by-type - Get breakdown by issue type
analyticsRouter.get('/by-type', async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                AVG(probability) as avg_probability,
                MAX(probability) as max_probability
            FROM predictions
            WHERE is_active = true
            GROUP BY event_type
            ORDER BY count DESC
        `);

        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/analytics/by-area - Get breakdown by area
analyticsRouter.get('/by-area', async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                a.name as area_name,
                COUNT(p.id) as prediction_count,
                AVG(p.probability) as avg_probability,
                COUNT(ci.id) as issue_count
            FROM areas a
            LEFT JOIN predictions p ON a.id = p.area_id AND p.is_active = true
            LEFT JOIN civic_issues ci ON a.id = ci.area_id
            GROUP BY a.id, a.name
            ORDER BY prediction_count DESC
            LIMIT 15
        `);

        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/analytics/performance - Get system performance metrics
analyticsRouter.get('/performance', async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                (SELECT COUNT(*) FROM alerts WHERE status = 'resolved') as total_resolved,
                (SELECT COUNT(*) FROM alerts) as total_alerts,
                (SELECT 
                    EXTRACT(EPOCH FROM AVG(resolved_at - created_at))/60 
                    FROM alerts 
                    WHERE resolved_at IS NOT NULL
                ) as avg_resolution_time_mins
        `);

        const data = result.rows[0];
        const resolutionRate = data.total_alerts > 0
            ? ((data.total_resolved / data.total_alerts) * 100).toFixed(1)
            : 0;

        res.json({
            data: {
                ...data,
                resolution_rate: resolutionRate
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
