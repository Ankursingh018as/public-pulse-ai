import { Request, Response } from 'express';
import { VerificationService } from '../services/verification.service';

const verificationService = new VerificationService();

export class VerificationController {

    async verify(req: Request, res: Response) {
        try {
            const { prediction_id, user_id, response, has_photo } = req.body;

            if (!prediction_id || !user_id || !response) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const result = await verificationService.submitVerification(prediction_id, user_id, response, has_photo);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Verification Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

