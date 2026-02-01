-- ===========================================
-- PUBLIC PULSE - DATABASE INITIALIZATION
-- ===========================================

-- Enable TimescaleDB extension
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===========================================
-- ENUMS
-- ===========================================

CREATE TYPE issue_type AS ENUM ('traffic', 'garbage', 'water', 'light');
CREATE TYPE source_type AS ENUM ('wa', 'news', 'social', 'maps', 'sensor', 'citizen');
CREATE TYPE alert_status AS ENUM ('pending', 'sent', 'acknowledged', 'resolved');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- AREAS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Surat',
    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    bounds GEOGRAPHY(POLYGON, 4326),
    center GEOGRAPHY(POINT, 4326),
    population INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_areas_name ON areas(name);
CREATE INDEX idx_areas_center ON areas USING GIST(center);

-- ===========================================
-- CIVIC ISSUES TABLE (Time-series)
-- ===========================================

CREATE TABLE IF NOT EXISTS civic_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type issue_type NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    area_name VARCHAR(255),
    severity DECIMAL(3,2) CHECK (severity >= 0 AND severity <= 1),
    sources source_type[] NOT NULL DEFAULT '{}',
    raw_text TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
-- SELECT create_hypertable('civic_issues', 'created_at', if_not_exists => TRUE);

CREATE INDEX idx_civic_issues_type ON civic_issues(type);
CREATE INDEX idx_civic_issues_area ON civic_issues(area_id);
CREATE INDEX idx_civic_issues_location ON civic_issues USING GIST(location);
CREATE INDEX idx_civic_issues_severity ON civic_issues(severity);

-- ===========================================
-- PREDICTIONS TABLE (Time-series)
-- ===========================================

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type issue_type NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    area_name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    probability DECIMAL(3,2) CHECK (probability >= 0 AND probability <= 1),
    eta_hours DECIMAL(5,2),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    reasons TEXT[] DEFAULT '{}',
    risk_breakdown JSONB DEFAULT '{}',
    recommended_action TEXT,
    model_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SELECT create_hypertable('predictions', 'created_at', if_not_exists => TRUE);

CREATE INDEX idx_predictions_type ON predictions(event_type);
CREATE INDEX idx_predictions_area ON predictions(area_id);
CREATE INDEX idx_predictions_active ON predictions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_predictions_probability ON predictions(probability);

-- ===========================================
-- ALERTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id),
    severity severity_level NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    status alert_status DEFAULT 'pending',
    channels TEXT[] DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_prediction ON alerts(prediction_id);

-- ===========================================
-- TRAFFIC DATA TABLE (Time-series)
-- ===========================================

CREATE TABLE IF NOT EXISTS traffic_data (
    id BIGSERIAL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    speed_kmh DECIMAL(5,2),
    congestion_level DECIMAL(3,2),
    delay_seconds INTEGER,
    is_anomaly BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
);

-- SELECT create_hypertable('traffic_data', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX idx_traffic_location ON traffic_data USING GIST(location);
CREATE INDEX idx_traffic_anomaly ON traffic_data(is_anomaly) WHERE is_anomaly = TRUE;

-- ===========================================
-- WEATHER DATA TABLE (Time-series)
-- ===========================================

CREATE TABLE IF NOT EXISTS weather_data (
    id BIGSERIAL,
    area_id INTEGER REFERENCES areas(id),
    temperature_c DECIMAL(4,1),
    humidity_percent DECIMAL(4,1),
    rain_probability DECIMAL(3,2),
    rain_mm DECIMAL(5,2),
    wind_speed_kmh DECIMAL(5,2),
    conditions VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
);

-- SELECT create_hypertable('weather_data', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX idx_weather_area ON weather_data(area_id);
CREATE INDEX idx_weather_rain ON weather_data(rain_probability);

-- ===========================================
-- CITIZEN REPORTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS citizen_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type issue_type NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    area_id INTEGER REFERENCES areas(id),
    image_urls TEXT[] DEFAULT '{}',
    reporter_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    linked_prediction_id UUID REFERENCES predictions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_type ON citizen_reports(type);
CREATE INDEX idx_reports_location ON citizen_reports USING GIST(location);

-- ===========================================
-- PREDICTION FEEDBACK TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS prediction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id) NOT NULL,
    was_accurate BOOLEAN,
    actual_severity DECIMAL(3,2),
    comments TEXT,
    reporter_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_prediction ON prediction_feedback(prediction_id);

-- ===========================================
-- USERS TABLE (Admin)
-- ===========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ===========================================
-- SEED DATA: Sample Areas (Vadodara)
-- ===========================================
-- Areas will be populated via seed_areas.py from datasets
-- INSERT INTO areas (name, city, state) VALUES ...

-- ===========================================
-- CONTINUOUS AGGREGATES (for fast queries)
-- ===========================================

-- Hourly issue counts by area and type
-- Hourly issue counts by area and type
-- CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_issue_stats
-- WITH (timescaledb.continuous) AS
-- SELECT
--     time_bucket('1 hour', created_at) AS bucket,
--     area_id,
--     type,
--     COUNT(*) as issue_count,
--     AVG(severity) as avg_severity
-- FROM civic_issues
-- GROUP BY bucket, area_id, type
-- WITH NO DATA;

-- Refresh policy for continuous aggregate
-- SELECT add_continuous_aggregate_policy('hourly_issue_stats',
--     start_offset => INTERVAL '3 days',
--     end_offset => INTERVAL '1 hour',
--     schedule_interval => INTERVAL '1 hour',
--     if_not_exists => TRUE);

-- ===========================================
-- RETENTION POLICIES
-- ===========================================

-- Keep raw traffic data for 30 days
-- SELECT add_retention_policy('traffic_data', INTERVAL '30 days', if_not_exists => TRUE);

-- Keep raw weather data for 90 days
-- SELECT add_retention_policy('weather_data', INTERVAL '90 days', if_not_exists => TRUE);

-- Keep civic issues for 1 year
-- SELECT add_retention_policy('civic_issues', INTERVAL '365 days', if_not_exists => TRUE);

COMMIT;
