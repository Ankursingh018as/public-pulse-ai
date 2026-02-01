-- Add verification status to predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'predicted';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS verification_score DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS verified_by_count INTEGER DEFAULT 0;

-- Create User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id),
    user_id VARCHAR(255), -- Device ID or Auth ID
    response VARCHAR(50) NOT NULL, -- yes, no, partial, not_sure
    weight DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON user_feedback(prediction_id);
