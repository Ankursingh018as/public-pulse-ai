-- ===========================================
-- PUBLIC PULSE - SCHEMA UPDATE FOR DATA SYNC
-- Run this after init.sql to add missing columns
-- ===========================================

-- Add missing columns to civic_issues
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS radius DECIMAL(10, 2) DEFAULT 100;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS verified_count INTEGER DEFAULT 0;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_civic_issues_status ON civic_issues(status);
CREATE INDEX IF NOT EXISTS idx_civic_issues_source ON civic_issues(source);
CREATE INDEX IF NOT EXISTS idx_civic_issues_user ON civic_issues(user_id);

-- Add missing columns to predictions for verification
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS verification_score DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS verified_by_count INTEGER DEFAULT 0;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'predicted';

-- Create citizen_verifications table
CREATE TABLE IF NOT EXISTS citizen_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES civic_issues(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    response VARCHAR(20) NOT NULL CHECK (response IN ('yes', 'no', 'partial')),
    weight DECIMAL(4, 2),
    has_photo BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_incident ON citizen_verifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_verifications_prediction ON citizen_verifications(prediction_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON citizen_verifications(user_id);

-- Create user_feedback table if not exists
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id),
    user_id VARCHAR(255) NOT NULL,
    response VARCHAR(20) NOT NULL,
    weight DECIMAL(4, 2),
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON user_feedback(user_id);

-- Update function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to civic_issues
DROP TRIGGER IF EXISTS update_civic_issues_updated_at ON civic_issues;
CREATE TRIGGER update_civic_issues_updated_at
    BEFORE UPDATE ON civic_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
