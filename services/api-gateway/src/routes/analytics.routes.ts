import { Router } from 'express';
import { Incident, Area, Prediction, Alert } from '../models';

export const analyticsRouter = Router();

// GET /api/v1/analytics/summary - Dashboard KPIs
analyticsRouter.get('/summary', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [
            activeIncidents,
            pendingIncidents,
            resolvedToday,
            criticalIncidents,
            totalAreas,
            highRiskAreas
        ] = await Promise.all([
            Incident.countDocuments({ status: { $in: ['pending', 'approved'] }, resolved: false }),
            Incident.countDocuments({ status: 'pending' }),
            Incident.countDocuments({ resolved: true, resolved_at: { $gte: today } }),
            Incident.countDocuments({ severity: { $gte: 8 }, resolved: false }),
            Area.countDocuments(),
            Area.countDocuments({ risk_score: { $gte: 7 } })
        ]);

        const recentResolved = await Incident.find({
            resolved: true,
            resolved_at: { $gte: last24h }
        }).select('createdAt resolved_at');

        let avgResponseTime = 0;
        if (recentResolved.length > 0) {
            const totalTime = recentResolved.reduce((sum, inc) => {
                if (inc.resolved_at && inc.createdAt) {
                    return sum + (inc.resolved_at.getTime() - inc.createdAt.getTime());
                }
                return sum;
            }, 0);
            avgResponseTime = Math.round((totalTime / recentResolved.length) / (1000 * 60));
        }

        const typeDistribution = await Incident.aggregate([
            { $match: { status: { $in: ['pending', 'approved'] }, resolved: false } },
            { $group: { _id: '$event_type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    activeIncidents,
                    pendingIncidents,
                    resolvedToday,
                    criticalIncidents,
                    avgResponseTime,
                    totalAreas,
                    highRiskAreas
                },
                distribution: { byType: typeDistribution },
                timestamp: new Date()
            }
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});

// GET /api/v1/analytics/trends
analyticsRouter.get('/trends', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let startDate = new Date();
        
        if (period === '24h') startDate.setHours(startDate.getHours() - 24);
        else if (period === '7d') startDate.setDate(startDate.getDate() - 7);
        else startDate.setDate(startDate.getDate() - 30);

        const trends = await Incident.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    avgSeverity: { $avg: '$severity' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        res.json({ success: true, data: trends });
    } catch (err) {
        console.error('Error fetching trends:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch trends' });
    }
});

// GET /api/v1/analytics/heatmap
analyticsRouter.get('/heatmap', async (req, res) => {
    try {
        const heatmapData = await Incident.find({ resolved: false })
            .select('lat lng severity event_type')
            .lean();

        res.json({
            success: true,
            data: heatmapData.map(inc => ({
                lat: inc.lat,
                lng: inc.lng,
                intensity: inc.severity / 10,
                type: inc.event_type
            }))
        });
    } catch (err) {
        console.error('Error fetching heatmap:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch heatmap' });
    }
});

// GET /api/v1/analytics/zones
analyticsRouter.get('/zones', async (req, res) => {
    try {
        const zoneStats = await Incident.aggregate([
            { $match: { resolved: false } },
            {
                $group: {
                    _id: '$zone',
                    total: { $sum: 1 },
                    avgSeverity: { $avg: '$severity' },
                    critical: { $sum: { $cond: [{ $gte: ['$severity', 8] }, 1, 0] } }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({ success: true, data: zoneStats });
    } catch (err) {
        console.error('Error fetching zone stats:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch zone stats' });
    }
});

// GET /api/v1/analytics/hot-zones
analyticsRouter.get('/hot-zones', async (req, res) => {
    try {
        const hotZones = await Incident.aggregate([
            { $match: { resolved: false, severity: { $gte: 6 } } },
            {
                $group: {
                    _id: { area_name: '$area_name', lat: '$lat', lng: '$lng' },
                    incidentCount: { $sum: 1 },
                    avgSeverity: { $avg: '$severity' },
                    maxSeverity: { $max: '$severity' }
                }
            },
            {
                $project: {
                    area_name: '$_id.area_name',
                    lat: '$_id.lat',
                    lng: '$_id.lng',
                    incidentCount: 1,
                    avgSeverity: { $round: ['$avgSeverity', 1] },
                    riskScore: { $multiply: ['$avgSeverity', '$incidentCount'] }
                }
            },
            { $sort: { riskScore: -1 } },
            { $limit: 10 }
        ]);

        res.json({ success: true, data: hotZones });
    } catch (err) {
        console.error('Error fetching hot zones:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch hot zones' });
    }
});

// GET /api/v1/analytics/by-type - Incident breakdown by type
analyticsRouter.get('/by-type', async (req, res) => {
    try {
        const typeBreakdown = await Incident.aggregate([
            { $match: { resolved: false } },
            {
                $group: {
                    _id: '$event_type',
                    count: { $sum: 1 },
                    avgSeverity: { $avg: '$severity' },
                    critical: { $sum: { $cond: [{ $gte: ['$severity', 8] }, 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: typeBreakdown.map(t => ({
                type: t._id,
                count: t.count,
                avg_severity: Math.round((t.avgSeverity || 0) * 10) / 10,
                critical: t.critical
            }))
        });
    } catch (err) {
        console.error('Error fetching type breakdown:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch type breakdown' });
    }
});

// GET /api/v1/analytics/performance - System performance metrics
analyticsRouter.get('/performance', async (req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalIncidents24h,
            resolvedIncidents24h,
            avgResolutionTime,
            citizenReports,
            verifiedIncidents
        ] = await Promise.all([
            Incident.countDocuments({ createdAt: { $gte: last24h } }),
            Incident.countDocuments({ resolved: true, resolved_at: { $gte: last24h } }),
            Incident.aggregate([
                { $match: { resolved: true, resolved_at: { $gte: last7d } } },
                {
                    $project: {
                        resolutionMinutes: {
                            $divide: [
                                { $subtract: ['$resolved_at', '$createdAt'] },
                                60000
                            ]
                        }
                    }
                },
                { $group: { _id: null, avg: { $avg: '$resolutionMinutes' } } }
            ]),
            Incident.countDocuments({ source: 'citizen', createdAt: { $gte: last7d } }),
            Incident.countDocuments({ verified_count: { $gte: 2 }, createdAt: { $gte: last7d } })
        ]);

        const resolutionRate = totalIncidents24h > 0 
            ? Math.round((resolvedIncidents24h / totalIncidents24h) * 100) 
            : 0;

        res.json({
            success: true,
            data: {
                incidents_24h: totalIncidents24h,
                resolved_24h: resolvedIncidents24h,
                resolution_rate: resolutionRate,
                avg_resolution_minutes: Math.round(avgResolutionTime[0]?.avg || 0),
                citizen_reports_7d: citizenReports,
                verified_incidents_7d: verifiedIncidents,
                // Placeholder values - in production, these would come from
                // a model evaluation pipeline and infrastructure monitoring service
                ai_accuracy: 87,
                system_uptime: 99.2,
                timestamp: now
            }
        });
    } catch (err) {
        console.error('Error fetching performance metrics:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch performance metrics' });
    }
});

