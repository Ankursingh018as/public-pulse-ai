import { Router } from 'express';
import { Alert } from '../models';

export const alertRouter = Router();

// GET /api/v1/alerts - List alerts
alertRouter.get('/', async (req, res) => {
    try {
        const { citizenId } = req.query;
        const query: any = {};

        if (citizenId) query.citizen_id = citizenId;

        const alerts = await Alert.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (err) {
        console.error('Error fetching alerts:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});

// POST /api/v1/alerts - Create alert
alertRouter.post('/', async (req, res) => {
    try {
        const {
            citizen_id,
            message,
            alert_type,
            severity,
            related_incident_id,
            related_prediction_id,
            actions
        } = req.body;

        const alert = new Alert({
            citizen_id,
            message,
            alert_type,
            severity,
            related_incident_id,
            related_prediction_id,
            actions: actions || [],
            is_read: false
        });

        await alert.save();

        // Broadcast via WebSocket to specific citizen
        if ((global as any).io && citizen_id) {
            (global as any).io.to(`citizen:${citizen_id}`).emit('alert:new', {
                id: alert._id,
                message: alert.message,
                type: alert.alert_type,
                severity: alert.severity
            });
        }

        res.status(201).json({ success: true, data: alert });
    } catch (err) {
        console.error('Error creating alert:', err);
        res.status(500).json({ success: false, error: 'Failed to create alert' });
    }
});

// PATCH /api/v1/alerts/:id/read - Mark as read
alertRouter.patch('/:id/read', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { is_read: true },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ success: false, error: 'Alert not found' });
        }

        res.json({ success: true, data: alert });
    } catch (err) {
        console.error('Error marking alert as read:', err);
        res.status(500).json({ success: false, error: 'Failed to update alert' });
    }
});

// DELETE /api/v1/alerts/:id
alertRouter.delete('/:id', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndDelete(req.params.id);
        
        if (!alert) {
            return res.status(404).json({ success: false, error: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert deleted' });
    } catch (err) {
        console.error('Error deleting alert:', err);
        res.status(500).json({ success: false, error: 'Failed to delete alert' });
    }
});

