import { Router } from 'express';
import { reportRouter } from './report.routes';
import { predictionRouter } from './prediction.routes';
import { areaRouter } from './area.routes';
import { alertRouter } from './alert.routes';
import { incidentRouter } from './incident.routes';
import { analyticsRouter } from './analytics.routes';
import { verificationRouter } from './verification.routes';
import { historyRouter } from './history.routes';

export const router = Router();

router.use('/report', reportRouter);
router.use('/predictions', predictionRouter);
router.use('/area', areaRouter);
router.use('/alerts', alertRouter);
router.use('/incidents', incidentRouter);
router.use('/analytics', analyticsRouter);
router.use('/verify', verificationRouter);
router.use('/history', historyRouter);

// Admin routes (mounted under /admin as well for clarity)
router.patch('/admin/incidents/:id', incidentRouter);

