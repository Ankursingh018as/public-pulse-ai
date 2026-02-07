import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';

export const verificationRouter = Router();
const controller = new VerificationController();

verificationRouter.post('/', (req, res) => controller.verify(req, res));

