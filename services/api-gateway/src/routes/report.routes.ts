import { Router } from 'express';
import axios from 'axios';
import { broadcastNewIncident, broadcastNewPrediction } from '../websockets';

export const reportRouter = Router();

// POST /api/v1/report - Submit a citizen report
reportRouter.post('/', async (req, res) => {
    try {
        const { text, source = 'simulation', metadata = {} } = req.body;

        // Forward to AI Engine for processing
        const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/process/text`, {
            text,
            source,
            metadata
        });

        const result = aiResponse.data;

        // Broadcast the new incident via WebSocket
        broadcastNewIncident({
            type: result.type,
            text: text,
            confidence: result.confidence,
            source: source,
            timestamp: new Date().toISOString()
        });

        // If risk prediction was generated, broadcast that too
        if (result.risk_score && result.risk_score > 0.5) {
            broadcastNewPrediction({
                event_type: result.type,
                probability: result.risk_score,
                area_name: result.entities?.[0] || 'Vadodara',
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: 'Report submitted and processed',
            data: result
        });
    } catch (err) {
        console.error('Error forwarding report:', err);
        res.status(500).json({ error: 'Failed to process report' });
    }
});

// GET /api/v1/report/user - Get user's reports
reportRouter.get('/user', async (req, res) => {
    res.json({ reports: [] });
});
