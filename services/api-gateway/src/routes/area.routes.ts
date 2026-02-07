import { Router } from 'express';
import { Area, Incident } from '../models';

export const areaRouter = Router();

// GET /api/v1/areas - List all areas
areaRouter.get('/', async (req, res) => {
    try {
        const areas = await Area.find().sort({ name: 1 }).lean();

        res.json({
            success: true,
            count: areas.length,
            data: areas
        });
    } catch (err) {
        console.error('Error fetching areas:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch areas' });
    }
});

// GET /api/v1/areas/:id - Get area details
areaRouter.get('/:id', async (req, res) => {
    try {
        const area = await Area.findById(req.params.id);
        
        if (!area) {
            return res.status(404).json({ success: false, error: 'Area not found' });
        }

        const activeIncidents = await Incident.countDocuments({
            area_name: area.name,
            resolved: false
        });

        res.json({
            success: true,
            data: {
                ...area.toObject(),
                active_incidents: activeIncidents
            }
        });
    } catch (err) {
        console.error('Error fetching area:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch area' });
    }
});

// POST /api/v1/areas - Create new area
areaRouter.post('/', async (req, res) => {
    try {
        const { name, zone, lat, lng, population } = req.body;

        const area = new Area({
            name,
            zone,
            lat,
            lng,
            population,
            risk_score: 0,
            active_incidents: 0
        });

        await area.save();

        res.status(201).json({ success: true, data: area });
    } catch (err) {
        console.error('Error creating area:', err);
        res.status(500).json({ success: false, error: 'Failed to create area' });
    }
});

// PATCH /api/v1/areas/:id - Update area
areaRouter.patch('/:id', async (req, res) => {
    try {
        const updates = req.body;
        const area = await Area.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!area) {
            return res.status(404).json({ success: false, error: 'Area not found' });
        }

        res.json({ success: true, data: area });
    } catch (err) {
        console.error('Error updating area:', err);
        res.status(500).json({ success: false, error: 'Failed to update area' });
    }
});

