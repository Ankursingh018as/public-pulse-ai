import { Pool } from 'pg';
import { broadcastVerification } from '../websockets';

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'pulse',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'pulse_db',
    password: process.env.POSTGRES_PASSWORD || 'pulsedev123',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

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
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Calculate Weight
            let weight = 0;
            if (response === 'yes') weight = this.WEIGHTS.yes;
            if (response === 'no') weight = this.WEIGHTS.no;
            if (response === 'partial') weight = this.WEIGHTS.partial;

            if (hasPhoto && response !== 'no') {
                weight += this.WEIGHTS.photo_bonus;
            }

            // 2. Insert Feedback
            await client.query(
                `INSERT INTO user_feedback (prediction_id, user_id, response, weight, photo_url) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [predictionId, userId, response, weight, hasPhoto ? 'dummy_url' : null]
            );

            // 3. Recalculate Prediction Score
            // Get current score
            const res = await client.query(`SELECT verification_score, verified_by_count FROM predictions WHERE id = $1`, [predictionId]);
            let currentScore = parseFloat(res.rows[0]?.verification_score || 0);
            let currentCount = parseInt(res.rows[0]?.verified_by_count || 0);

            let newScore = currentScore + weight;
            let newCount = currentCount + 1;

            // 4. Update Status
            let status = 'predicted';
            let initialProbability = 0; // Ideally fetch this

            // Logic: Base confidence + verification score
            // For now, simplify: if Verification Score >= 0.75 -> Verified
            if (newScore >= this.THRESHOLD) {
                status = 'verified';
            } else if (newScore <= -0.5) {
                status = 'rejected';
            }

            await client.query(
                `UPDATE predictions 
                 SET verification_score = $1, verified_by_count = $2, status = $3 
                 WHERE id = $4`,
                [newScore, newCount, status, predictionId]
            );

            await client.query('COMMIT');

            // 5. Broadcast if Verified
            if (status === 'verified') {
                // Fetch full prediction details for broadcast
                const predData = await client.query(`SELECT * FROM predictions WHERE id = $1`, [predictionId]);
                broadcastVerification(predData.rows[0]);
            }

            return { success: true, new_score: newScore, status };

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
