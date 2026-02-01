import { Router } from 'express';
import { pgPool } from '../server';
import { broadcastAlert } from '../websockets';
import { sendEmailAlert, sendSMSAlert, AlertPayload } from '../services/notification.service';

export const alertRouter = Router();

// GET /api/v1/alerts - Get recent alerts
alertRouter.get('/', async (req, res) => {
    try {
        const { status, severity, limit = 20 } = req.query;

        let query = `
            SELECT a.*, p.event_type, p.probability, ar.name as area_name
            FROM alerts a
            LEFT JOIN predictions p ON a.prediction_id = p.id
            LEFT JOIN areas ar ON a.area_id = ar.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
            query += ` AND a.status = $${params.length + 1}`;
            params.push(status);
        }

        if (severity) {
            query += ` AND a.severity = $${params.length + 1}`;
            params.push(severity);
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));

        const result = await pgPool.query(query, params);
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/alerts - Create a new alert
alertRouter.post('/', async (req, res) => {
    try {
        const {
            prediction_id,
            severity = 'medium',
            title,
            message,
            area_id,
            channels = ['dashboard']
        } = req.body;

        // Insert alert into database
        const result = await pgPool.query(`
            INSERT INTO alerts (prediction_id, severity, title, message, area_id, channels, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *
        `, [prediction_id, severity, title, message, area_id, channels]);

        const alert = result.rows[0];

        // Broadcast to connected clients via WebSocket
        broadcastAlert({
            id: alert.id,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            timestamp: new Date().toISOString()
        });

        // Send notifications based on channels
        const notificationPromises: Promise<any>[] = [];
        const alertPayload: AlertPayload = {
            id: alert.id,
            title,
            message,
            severity,
            area_name: req.body.area_name || 'Vadodara'
        };

        if (channels.includes('email')) {
            notificationPromises.push(
                sendEmailAlert(alertPayload, process.env.ALERT_EMAIL_TO || 'admin@vadodara.gov.in')
            );
        }

        if (channels.includes('sms')) {
            notificationPromises.push(
                sendSMSAlert(alertPayload, process.env.ALERT_SMS_TO || '+919999999999')
            );
        }

        // Wait for notifications (non-blocking for response)
        Promise.all(notificationPromises)
            .then(async () => {
                // Update status to sent
                await pgPool.query(
                    `UPDATE alerts SET status = 'sent', sent_at = NOW() WHERE id = $1`,
                    [alert.id]
                );
            })
            .catch(err => console.error('Notification error:', err));

        res.status(201).json({
            message: 'Alert created and dispatched',
            data: alert
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// PUT /api/v1/alerts/:id/acknowledge - Acknowledge an alert
alertRouter.put('/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const { acknowledged_by } = req.body;

        const result = await pgPool.query(`
            UPDATE alerts 
            SET status = 'acknowledged', acknowledged_at = NOW(), 
                metadata = metadata || $2
            WHERE id = $1
            RETURNING *
        `, [id, JSON.stringify({ acknowledged_by })]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert acknowledged', data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// PUT /api/v1/alerts/:id/resolve - Resolve an alert
alertRouter.put('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;

        const result = await pgPool.query(`
            UPDATE alerts 
            SET status = 'resolved', resolved_at = NOW(),
                metadata = metadata || $2
            WHERE id = $1
            RETURNING *
        `, [id, JSON.stringify({ resolution_notes })]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert resolved', data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// GET /api/v1/alerts/stats - Get alert statistics
alertRouter.get('/stats', async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                COUNT(*) FILTER (WHERE severity = 'high') as high,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
            FROM alerts
        `);
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
