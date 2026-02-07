import { Prediction, Vote } from '../models';

export class VerificationService {

    // Weight constants
    private WEIGHTS = {
        yes: 0.25,
        no: -0.30,
        partial: 0.15,
        photo_bonus: 0.30
    };

    private THRESHOLD = 0.75;

    async submitVerification(predictionId: string, userId: string, response: string, hasPhoto: boolean): Promise<any> {
        try {
            // 1. Calculate Weight
            let weight = 0;
            if (response === 'yes') weight = this.WEIGHTS.yes;
            if (response === 'no') weight = this.WEIGHTS.no;
            if (response === 'partial') weight = this.WEIGHTS.partial;

            if (hasPhoto && response !== 'no') {
                weight += this.WEIGHTS.photo_bonus;
            }

            // 2. Create Vote record (using Vote model for verification)
            const vote = new Vote({
                incident_id: predictionId,
                citizen_id: userId,
                vote_type: response,
                has_photo: hasPhoto,
                weight: weight
            });
            await vote.save();

            // 3. Get prediction and update verification
            const prediction = await Prediction.findById(predictionId);
            
            if (!prediction) {
                throw new Error('Prediction not found');
            }

            const currentScore = prediction.confidence || 0;
            const newScore = Math.max(0, Math.min(1, currentScore + weight));

            // 4. Determine Status
            let status = 'predicted';
            if (newScore >= this.THRESHOLD) {
                status = 'verified';
            } else if (newScore <= 0.25) {
                status = 'rejected';
            }

            // 5. Update Prediction
            prediction.confidence = newScore;
            await prediction.save();

            // 6. Broadcast if Verified
            if (status === 'verified' && (global as any).io) {
                (global as any).io.emit('prediction:verified', {
                    id: prediction._id,
                    type: prediction.type,
                    area_name: prediction.area_name,
                    confidence: newScore
                });
            }

            return { 
                success: true, 
                new_score: newScore, 
                status,
                prediction_id: prediction._id
            };

        } catch (e) {
            console.error('Error in verification service:', e);
            throw e;
        }
    }
}

