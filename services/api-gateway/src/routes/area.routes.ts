import { Router } from 'express';
import { pgPool } from '../server';

export const areaRouter = Router();

// GET /api/v1/area/:id - Get area stats
areaRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch aggregation from materialized view
        const stats = await pgPool.query(`
            SELECT * FROM hourly_issue_stats 
            WHERE area_id = $1 
            ORDER BY bucket DESC 
            LIMIT 24
        `, [id]);

        const info = await pgPool.query('SELECT * FROM areas WHERE id = $1', [id]);

        if (info.rows.length === 0) {
            return res.status(404).json({ error: 'Area not found' });
        }

        res.json({
            area: info.rows[0],
            stats: stats.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/area - List all areas
areaRouter.get('/', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT id, name, city, center FROM areas');
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
