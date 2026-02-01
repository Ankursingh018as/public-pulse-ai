import { Router } from 'express';
import { pgPool } from '../server';

export const historyRouter = Router();

// GET /api/v1/history - Get all incident history for admin
historyRouter.get('/', async (req, res) => {
    try {
        const { type, since, limit = 500, source, status } = req.query;

        let query = `
            SELECT 
                ci.id,
                ci.type,
                ci.type as event_type,
                ci.latitude as lat,
                ci.longitude as lng,
                ci.description,
                ci.source,
                ci.user_id as "userId",
                ci.status,
                ci.severity,
                ci.admin_notes as "adminNotes",
                ci.updated_by as "updatedBy",
                EXTRACT(EPOCH FROM ci.created_at) * 1000 as "_ts",
                EXTRACT(EPOCH FROM ci.created_at) * 1000 as "createdAt",
                EXTRACT(EPOCH FROM ci.updated_at) * 1000 as "updatedAt",
                a.name as area_name,
                (SELECT COUNT(*) FROM citizen_verifications cv WHERE cv.incident_id = ci.id) as verification_count
            FROM civic_issues ci
            LEFT JOIN areas a ON ci.area_id = a.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (type) {
            query += ` AND ci.type = $${params.length + 1}`;
            params.push(type);
        }

        if (source) {
            query += ` AND ci.source ILIKE $${params.length + 1}`;
            params.push(`%${source}%`);
        }

        if (status) {
            query += ` AND ci.status = $${params.length + 1}`;
            params.push(status);
        }

        if (since) {
            query += ` AND ci.created_at >= to_timestamp($${params.length + 1} / 1000.0)`;
            params.push(Number(since));
        }

        query += ` ORDER BY ci.created_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));

        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('History fetch error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/history/stats - Get aggregated history stats
historyRouter.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL) as pending,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE source ILIKE '%citizen%') as citizen_reports,
                COUNT(*) FILTER (WHERE source = 'ai' OR source ILIKE '%ai-%') as ai_detections,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
            FROM civic_issues
        `;

        const result = await pgPool.query(query);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('History stats error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/history/export - Export all data for reports
historyRouter.get('/export', async (req, res) => {
    try {
        const [incidents, verifications, predictions] = await Promise.all([
            pgPool.query(`
                SELECT ci.*, a.name as area_name
                FROM civic_issues ci
                LEFT JOIN areas a ON ci.area_id = a.id
                ORDER BY ci.created_at DESC
                LIMIT 5000
            `),
            pgPool.query(`
                SELECT * FROM citizen_verifications
                ORDER BY created_at DESC
                LIMIT 5000
            `),
            pgPool.query(`
                SELECT * FROM predictions
                ORDER BY created_at DESC
                LIMIT 1000
            `)
        ]);

        res.json({
            incidents: incidents.rows,
            verifications: verifications.rows,
            predictions: predictions.rows,
            exportedAt: Date.now()
        });
    } catch (err) {
        console.error('History export error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
