import { Router } from 'express';
import axios from 'axios';
import { Incident } from '../models';

export const videoRouter = Router();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// POST /api/v1/video/detect/image - Upload image for trash detection
videoRouter.post('/detect/image', async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                success: false,
                error: 'Content-Type must be multipart/form-data',
            });
        }

        // Forward the raw request to the AI engine
        const response = await axios.post(
            `${AI_ENGINE_URL}/detect/image`,
            req,
            {
                headers: {
                    'content-type': contentType,
                    'content-length': req.headers['content-length'],
                },
                maxBodyLength: 50 * 1024 * 1024, // 50MB
                maxContentLength: 50 * 1024 * 1024,
                timeout: 120000, // 2 min timeout for processing
            }
        );

        const detectionResult = response.data;

        // If trash was detected, auto-create an incident
        if (detectionResult.trash_count > 0) {
            const incident = new Incident({
                event_type: 'garbage',
                description: `AI detected ${detectionResult.trash_count} trash item(s) via image analysis (confidence threshold: ${detectionResult.confidence_threshold})`,
                lat: parseFloat(req.body?.lat) || 22.3072,
                lng: parseFloat(req.body?.lng) || 73.1812,
                source: 'video_detection',
                reported_by: req.body?.reported_by || 'ai_system',
                severity: Math.min(detectionResult.trash_count * 2, 10),
                confidence: detectionResult.detections?.[0]?.confidence || 0.5,
                status: 'pending',
                zone: req.body?.zone || 'zone_1',
                area_name: req.body?.area_name || 'Vadodara',
                verified_count: 0,
                total_votes: 0,
                resolved: false,
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
                    source: 'video_detection',
                });
            }

            detectionResult.incident_id = incident._id;
        }

        res.json({ success: true, data: detectionResult });
    } catch (err: any) {
        console.error('Image detection error:', err.message);
        const status = err.response?.status || 500;
        res.status(status).json({
            success: false,
            error: err.response?.data?.detail || 'Image detection failed',
        });
    }
});

// POST /api/v1/video/detect/video - Upload video for trash detection
videoRouter.post('/detect/video', async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                success: false,
                error: 'Content-Type must be multipart/form-data',
            });
        }

        const response = await axios.post(
            `${AI_ENGINE_URL}/detect/video`,
            req,
            {
                headers: {
                    'content-type': contentType,
                    'content-length': req.headers['content-length'],
                },
                maxBodyLength: 200 * 1024 * 1024, // 200MB
                maxContentLength: 200 * 1024 * 1024,
                timeout: 600000, // 10 min timeout for video
            }
        );

        const detectionResult = response.data;

        // Auto-create incident if trash detected
        if (detectionResult.trash_count > 0) {
            const incident = new Incident({
                event_type: 'garbage',
                description: `AI detected ${detectionResult.trash_count} trash detection(s) across ${detectionResult.processing?.frames_processed || 0} video frames`,
                lat: parseFloat(req.body?.lat) || 22.3072,
                lng: parseFloat(req.body?.lng) || 73.1812,
                source: 'video_detection',
                reported_by: req.body?.reported_by || 'ai_system',
                severity: Math.min(Math.ceil(detectionResult.trash_count / 5), 10),
                confidence: 0.8,
                status: 'pending',
                zone: req.body?.zone || 'zone_1',
                area_name: req.body?.area_name || 'Vadodara',
                verified_count: 0,
                total_votes: 0,
                resolved: false,
            });

            await incident.save();

            if ((global as any).io) {
                (global as any).io.emit('incident:new', {
                    id: incident._id,
                    type: incident.event_type,
                    lat: incident.lat,
                    lng: incident.lng,
                    description: incident.description,
                    severity: incident.severity,
                    source: 'video_detection',
                });
            }

            detectionResult.incident_id = incident._id;
        }

        res.json({ success: true, data: detectionResult });
    } catch (err: any) {
        console.error('Video detection error:', err.message);
        const status = err.response?.status || 500;
        res.status(status).json({
            success: false,
            error: err.response?.data?.detail || 'Video detection failed',
        });
    }
});

// GET /api/v1/video/model/status - Get model status
videoRouter.get('/model/status', async (req, res) => {
    try {
        const response = await axios.get(`${AI_ENGINE_URL}/model/status`, {
            timeout: 10000,
        });
        res.json({ success: true, data: response.data });
    } catch (err: any) {
        console.error('Model status error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get model status',
        });
    }
});

// POST /api/v1/video/model/reload - Reload model with new weights
videoRouter.post('/model/reload', async (req, res) => {
    try {
        const { weights_path } = req.body;
        const response = await axios.post(
            `${AI_ENGINE_URL}/model/reload`,
            null,
            {
                params: weights_path ? { weights_path } : {},
                timeout: 30000,
            }
        );
        res.json({ success: true, data: response.data });
    } catch (err: any) {
        console.error('Model reload error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to reload model',
        });
    }
});

// POST /api/v1/video/train/start - Start model training
videoRouter.post('/train/start', async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_ENGINE_URL}/train/start`,
            req.body,
            { timeout: 30000 }
        );
        res.json({ success: true, data: response.data });
    } catch (err: any) {
        console.error('Training start error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to start training',
        });
    }
});
