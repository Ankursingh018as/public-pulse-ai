import { Router } from 'express';
import { Incident, Vote, Area } from '../models';
import { redisClient } from '../server';
import * as civicIssuesService from '../services/civic-issues.service';

export const incidentRouter = Router();

// Helper function to clear cache
async function clearIncidentCache() {
    try {
        if (redisClient.isOpen) {
            const keys = await redisClient.keys('incidents:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        }
    } catch (err) {
        console.warn('Cache invalidation failed:', err);
    }
}

// ===========================================
// GET /api/v1/incidents - List incidents with filtering
// ===========================================
incidentRouter.get('/', async (req, res) => {
    try {
        const { 
            limit = '50', 
            type, 
            status, 
            since, 
            area,
            severity_min,
            severity_max 
        } = req.query;

        // Build filters for PostgreSQL
        const filters: any = {
            limit: Number(limit)
        };
        
        if (type) filters.type = type;
        if (status) filters.status = status;
        if (since) filters.since = new Date(Number(since));

        // Try cache first
        const cacheKey = `incidents:list:${JSON.stringify(filters)}`;
        try {
            if (redisClient.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    return res.json({ 
                        success: true,
                        data: JSON.parse(cached),
                        cached: true
                    });
                }
            }
        } catch (err) {
            console.warn('Cache read failed:', err);
        }

        // Fetch from PostgreSQL
        const civicIssues = await civicIssuesService.getCivicIssues(filters);

        // Transform to frontend format
        const incidents = civicIssues.map(issue => ({
            id: issue.id,
            event_type: issue.type,
            lat: issue.location.lat,
            lng: issue.location.lng,
            severity: issue.severity || 0.5,
            radius: 100,
            description: issue.raw_text,
            photo_url: issue.photo_url,
            status: issue.status || 'pending',
            verified: issue.verified || 0,
            resolved: issue.status === 'resolved',
            area_name: issue.area_name || 'Vadodara',
            area_id: issue.area_id,
            citizenVotes: { yes: issue.verified || 0, no: 0, photo: 0 },
            createdAt: issue.created_at,
            updatedAt: issue.created_at
        }));

        // Cache the result
        try {
            if (redisClient.isOpen) {
                await redisClient.setEx(cacheKey, 60, JSON.stringify(incidents));
            }
        } catch (err) {
            console.warn('Cache write failed:', err);
        }

        res.json({
            success: true,
            data: incidents,
            count: incidents.length
        });
    } catch (err) {
        console.error('Error fetching incidents:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch incidents' 
        });
    }
});

// ===========================================
// POST /api/v1/incidents - Create new incident
// ===========================================
incidentRouter.post('/', async (req, res) => {
    try {
        const { 
            event_type, 
            lat, 
            lng, 
            description, 
            photo_url,
            citizen_id,
            area_name,
            zone
        } = req.body;

        // Validation
        if (!event_type || lat === undefined || lng === undefined) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: event_type, lat, lng' 
            });
        }

        // Validate coordinates
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid coordinates' 
            });
        }

        // Map event types to PostgreSQL enum
        const typeMapping: any = {
            'light': 'light',
            'streetlight': 'light',
            'garbage': 'garbage',
            'pothole': 'traffic',
            'traffic': 'traffic',
            'water_leak': 'water',
            'water': 'water',
            'flood': 'water'
        };

        const mappedType = typeMapping[event_type] || 'traffic';

        // Create civic issue in PostgreSQL
        const civicIssue = await civicIssuesService.createCivicIssue({
            type: mappedType,
            location: { lat, lng },
            area_name: area_name || 'Vadodara',
            severity: 0.5, // Default severity (0-1 scale)
            sources: ['citizen'],
            raw_text: description || `${event_type} reported`,
            confidence: 1.0,
            metadata: {
                user_id: citizen_id || 'anonymous',
                photo_url: photo_url || null,
                zone: zone || 'Zone 1',
                status: 'pending',
                verified: 0
            },
            user_id: citizen_id,
            photo_url: photo_url,
            status: 'pending'
        });

        // Clear cache
        await clearIncidentCache();

        // Broadcast via WebSocket
        if ((global as any).io) {
            (global as any).io.emit('incident:new', {
                id: civicIssue.id,
                event_type: event_type,
                lat: civicIssue.location.lat,
                lng: civicIssue.location.lng,
                severity: civicIssue.severity || 0.5,
                status: civicIssue.status,
                area_name: civicIssue.area_name,
                createdAt: civicIssue.created_at
            });
        }

        res.status(201).json({ 
            success: true,
            id: civicIssue.id,
            data: {
                id: civicIssue.id,
                event_type: event_type,
                lat: civicIssue.location.lat,
                lng: civicIssue.location.lng,
                severity: civicIssue.severity || 0.5,
                status: civicIssue.status,
                area_name: civicIssue.area_name,
                createdAt: civicIssue.created_at
            }
        });
    } catch (err) {
        console.error('Error creating incident:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create incident',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

// ===========================================
// GET /api/v1/incidents/:id - Get incident details
// ===========================================
incidentRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const civicIssue = await civicIssuesService.getCivicIssueById(id);
        
        if (!civicIssue) {
            return res.status(404).json({ 
                success: false,
                error: 'Incident not found' 
            });
        }

        // Transform to frontend format
        const incident = {
            id: civicIssue.id,
            event_type: civicIssue.type,
            lat: civicIssue.location.lat,
            lng: civicIssue.location.lng,
            severity: civicIssue.severity || 0.5,
            radius: 100,
            description: civicIssue.raw_text,
            photo_url: civicIssue.photo_url,
            status: civicIssue.status || 'pending',
            verified: civicIssue.verified || 0,
            resolved: civicIssue.status === 'resolved',
            area_name: civicIssue.area_name || 'Vadodara',
            area_id: civicIssue.area_id,
            citizenVotes: { yes: civicIssue.verified || 0, no: 0, photo: 0 },
            createdAt: civicIssue.created_at,
            updatedAt: civicIssue.created_at
        };

        res.json({ 
            success: true,
            data: incident
        });
    } catch (err) {
        console.error('Error fetching incident:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch incident' 
        });
    }
});

// ===========================================
// POST /api/v1/incidents/:id/vote - Citizen vote (keep for compatibility)
// ===========================================
incidentRouter.post('/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { vote_type, citizen_id } = req.body;

        if (!vote_type || !citizen_id) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: vote_type, citizen_id' 
            });
        }

        // Increment verification count in PostgreSQL
        if (vote_type === 'yes' || vote_type === 'photo') {
            await civicIssuesService.incrementVerification(id);
        }

        // Clear cache
        await clearIncidentCache();

        // Broadcast update
        if ((global as any).io) {
            (global as any).io.emit('incident:vote', {
                incident_id: id,
                vote_type
            });
        }

        res.json({ 
            success: true,
            message: 'Vote recorded'
        });
    } catch (err) {
        console.error('Error voting on incident:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to vote on incident',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

// ===========================================
// POST /api/v1/incidents/:id/approve - Admin approve/reject
// ===========================================
incidentRouter.post('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid action. Must be: approve or reject' 
            });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        await civicIssuesService.updateCivicIssueStatus(id, status);

        // Clear cache
        await clearIncidentCache();

        // Broadcast update
        if ((global as any).io) {
            (global as any).io.emit('incident:approved', {
                incident_id: id,
                status: status
            });
        }

        res.json({ 
            success: true,
            status: status
        });
    } catch (err) {
        console.error('Error approving incident:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to approve incident',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

// ===========================================
// POST /api/v1/incidents/:id/resolve - Mark as resolved
// ===========================================
incidentRouter.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;

        await civicIssuesService.updateCivicIssueStatus(id, 'resolved');

        // Clear cache
        await clearIncidentCache();

        // Broadcast update
        if ((global as any).io) {
            (global as any).io.emit('incident:resolved', {
                incident_id: id
            });
        }

        res.json({ 
            success: true,
            resolved: true
        });
    } catch (err) {
        console.error('Error resolving incident:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to resolve incident',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

export default incidentRouter;
