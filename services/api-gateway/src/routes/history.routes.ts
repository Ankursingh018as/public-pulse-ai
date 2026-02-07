import { Router } from 'express';
import { Incident } from '../models';

export const historyRouter = Router();

// GET /api/v1/history - Get all incident history for admin
historyRouter.get('/', async (req, res) => {
    try {
        const { type, since, limit = 500, source, status } = req.query;

        const query: any = {};

        if (type) query.event_type = type;
        if (source) query.source = new RegExp(source as string, 'i');
        if (status) query.status = status;
        if (since) query.createdAt = { $gte: new Date(since as string) };

        const incidents = await Incident.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json({
            success: true,
            count: incidents.length,
            data: incidents.map(inc => ({
                id: inc._id,
                type: inc.event_type,
                event_type: inc.event_type,
                lat: inc.lat,
                lng: inc.lng,
                description: inc.description,
                source: inc.source,
                userId: inc.reported_by,
                status: inc.status,
                severity: inc.severity,
                area_name: inc.area_name,
                zone: inc.zone,
                _ts: inc.createdAt.getTime(),
                createdAt: inc.createdAt.getTime(),
                updatedAt: inc.updatedAt?.getTime() || inc.createdAt.getTime(),
                resolved: inc.resolved,
                resolved_at: inc.resolved_at
            }))
        });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// GET /api/v1/history/stats - Get historical statistics
historyRouter.get('/stats', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '90d') days = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await Incident.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    resolved: { $sum: { $cond: ['$resolved', 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    avgSeverity: { $avg: '$severity' }
                }
            }
        ]);

        const typeDistribution = await Incident.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$event_type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: stats[0] || { total: 0, resolved: 0, pending: 0, avgSeverity: 0 },
                byType: typeDistribution,
                period: period
            }
        });
    } catch (err) {
        console.error('Error fetching history stats:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

