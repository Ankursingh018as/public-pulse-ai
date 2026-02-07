import { Router } from 'express';
import axios from 'axios';
import { Incident } from '../models';

export const reportRouter = Router();

// POST /api/v1/report - Submit a citizen report
reportRouter.post('/', async (req, res) => {
    try {
        const { text, source = 'citizen_app', metadata = {}, lat, lng, reported_by } = req.body;

        // Forward to AI Engine for processing (if available)
        let processed: any = {
            type: 'other',
            confidence: 0.5,
            severity: 5,
            entities: []
        };

        try {
            const aiResponse = await axios.post(
                `${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/process/text`,
                { text, source, metadata },
                { timeout: 5000 }
            );
            processed = aiResponse.data;
        } catch (aiErr) {
            console.warn('AI Engine unavailable, using defaults:', aiErr);
        }

        // Create incident in MongoDB
        const incident = new Incident({
            event_type: processed.type || 'other',
            description: text,
            lat: lat || 22.3072,
            lng: lng || 73.1812,
            source: source,
            reported_by: reported_by || 'anonymous',
            severity: processed.severity || 5,
            confidence: processed.confidence || 0.5,
            status: 'pending',
            zone: metadata.zone || 'zone_1',
            area_name: processed.entities?.[0] || 'Vadodara',
            verified_count: 0,
            total_votes: 0,
            resolved: false
        });

        await incident.save();

        // Broadcast via WebSocket
        if ((global as any).io) {
            (global as any).io.emit('incident:new', {
                id: incident._id,
                type: incident.event_type,
                lat: incident.lat,
                lng: incident.lng,
                description: incident.description,
                severity: incident.severity,
                source: incident.source
            });
        }

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: {
                id: incident._id,
                type: incident.event_type,
                status: incident.status,
                severity: incident.severity,
                confidence: incident.confidence
            }
        });
    } catch (err) {
        console.error('Error processing report:', err);
        res.status(500).json({ success: false, error: 'Failed to process report' });
    }
});

// GET /api/v1/report/user/:userId - Get user's reports
reportRouter.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const reports = await Incident.find({ reported_by: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (err) {
        console.error('Error fetching user reports:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
});

