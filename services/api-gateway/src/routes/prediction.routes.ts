import { Router } from 'express';
import { Prediction } from '../models';

export const predictionRouter = Router();

// GET /api/v1/predictions - List active predictions
predictionRouter.get('/', async (req, res) => {
    try {
        const { type, area } = req.query;
        const now = new Date();

        const query: any = {
            valid_until: { $gt: now }
        };

        if (type) query.type = type;
        if (area) query.area_name = area;

        const predictions = await Prediction.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json({
            success: true,
            count: predictions.length,
            data: predictions.map(p => ({
                id: p._id,
                type: p.type,
                lat: p.lat,
                lng: p.lng,
                area_name: p.area_name,
                probability: p.probability,
                severity: p.severity,
                timeframe: p.timeframe,
                confidence: p.confidence,
                reasons: p.reasons,
                trend: p.trend,
                valid_until: p.valid_until,
                createdAt: p.createdAt
            }))
        });
    } catch (err) {
        console.error('Error fetching predictions:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch predictions' });
    }
});

// POST /api/v1/predictions - Create prediction
predictionRouter.post('/', async (req, res) => {
    try {
        const {
            type,
            lat,
            lng,
            area_name,
            probability,
            severity,
            timeframe,
            confidence,
            reasons,
            trend,
            valid_hours = 24
        } = req.body;

        const valid_until = new Date(Date.now() + valid_hours * 60 * 60 * 1000);

        const prediction = new Prediction({
            type,
            lat,
            lng,
            area_name,
            probability,
            severity,
            timeframe,
            confidence,
            reasons: reasons || [],
            trend,
            valid_until
        });

        await prediction.save();

        // Broadcast via WebSocket
        if ((global as any).io) {
            (global as any).io.emit('prediction:new', {
                id: prediction._id,
                type: prediction.type,
                area_name: prediction.area_name,
                severity: prediction.severity,
                probability: prediction.probability
            });
        }

        res.status(201).json({ success: true, data: prediction });
    } catch (err) {
        console.error('Error creating prediction:', err);
        res.status(500).json({ success: false, error: 'Failed to create prediction' });
    }
});

// GET /api/v1/predictions/:id
predictionRouter.get('/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id);
        
        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction not found' });
        }

        res.json({ success: true, data: prediction });
    } catch (err) {
        console.error('Error fetching prediction:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch prediction' });
    }
});

// DELETE /api/v1/predictions/:id
predictionRouter.delete('/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findByIdAndDelete(req.params.id);
        
        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction not found' });
        }

        res.json({ success: true, message: 'Prediction deleted' });
    } catch (err) {
        console.error('Error deleting prediction:', err);
        res.status(500).json({ success: false, error: 'Failed to delete prediction' });
    }
});

