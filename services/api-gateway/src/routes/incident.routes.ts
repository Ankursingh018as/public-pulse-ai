import { Router } from 'express';
import { pgPool } from '../server';

export const incidentRouter = Router();

// GET /api/v1/incidents - Get recent civic issues/incidents
incidentRouter.get('/', async (req, res) => {
    try {
        const { limit = 50, type, status, since } = req.query;

        let query = `
            SELECT ci.*, a.name as area_name 
            FROM civic_issues ci
            LEFT JOIN areas a ON ci.area_id = a.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (type) {
            query += ` AND ci.type = $${params.length + 1}`;
            params.push(type);
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
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/incidents - Create a new incident (citizen report)
incidentRouter.post('/', async (req, res) => {
    try {
        const { event_type, lat, lng, description, source, userId, submittedAt } = req.body;

        if (!event_type || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'Missing required fields: event_type, lat, lng' });
        }

        const query = `
            INSERT INTO civic_issues (type, latitude, longitude, description, source, user_id, status, severity, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0.5, NOW())
            RETURNING id, type, latitude as lat, longitude as lng, description, source, status, created_at
        `;
        const params = [event_type, lat, lng, description || null, source || 'citizen', userId || 'anonymous'];

        const result = await pgPool.query(query, params);
        const newIncident = result.rows[0];

        res.status(201).json({ 
            success: true, 
            id: newIncident.id,
            data: newIncident
        });
    } catch (err) {
        console.error('Error creating incident:', err);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// GET /api/v1/incidents/:id - Get a specific incident
incidentRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT ci.*, a.name as area_name,
                   (SELECT COUNT(*) FROM citizen_verifications cv WHERE cv.incident_id = ci.id) as verification_count
            FROM civic_issues ci
            LEFT JOIN areas a ON ci.area_id = a.id
            WHERE ci.id = $1
        `;
        
        const result = await pgPool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/incidents/:id/verifications - Get verifications for an incident
incidentRouter.get('/:id/verifications', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT * FROM citizen_verifications
            WHERE incident_id = $1
            ORDER BY created_at DESC
        `;
        
        const result = await pgPool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /api/v1/admin/incidents/:id - Admin update incident status
incidentRouter.patch('/admin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminId, notes, timestamp } = req.body;
        
        if (!action || !adminId) {
            return res.status(400).json({ error: 'Missing action or adminId' });
        }
        
        const statusMap: Record<string, string> = {
            approve: 'approved',
            reject: 'rejected',
            resolve: 'resolved'
        };
        
        const newStatus = statusMap[action];
        if (!newStatus) {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        const query = `
            UPDATE civic_issues
            SET status = $1, admin_notes = $2, updated_at = NOW(), updated_by = $3
            WHERE id = $4
            RETURNING id, status
        `;
        
        const result = await pgPool.query(query, [newStatus, notes || null, adminId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

