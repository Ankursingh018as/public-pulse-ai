import { Router } from 'express';
import { pgPool } from '../server';

export const predictionRouter = Router();

// GET /api/v1/predictions - Get active predictions with area coordinates
predictionRouter.get('/', async (req, res) => {
    try {
        const { type, areaId } = req.query;
        let query = `
            SELECT p.*, a.latitude, a.longitude, a.name as area_name_full
            FROM predictions p
            LEFT JOIN areas a ON p.area_id = a.id
            WHERE p.is_active = true 
            AND p.expires_at > NOW()
        `;
        const params: any[] = [];

        if (type) {
            query += ` AND p.event_type = $${params.length + 1}`;
            params.push(type);
        }

        if (areaId) {
            query += ` AND p.area_id = $${params.length + 1}`;
            params.push(areaId);
        }

        query += ` ORDER BY p.probability DESC LIMIT 50`;

        const result = await pgPool.query(query, params);

        // Transform to include coordinates
        const predictions = result.rows.map(row => ({
            ...row,
            lat: row.latitude ? parseFloat(row.latitude) : 22.3072,
            lng: row.longitude ? parseFloat(row.longitude) : 73.1812,
            location: {
                lat: row.latitude ? parseFloat(row.latitude) : 22.3072,
                lng: row.longitude ? parseFloat(row.longitude) : 73.1812
            }
        }));

        res.json({ data: predictions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
