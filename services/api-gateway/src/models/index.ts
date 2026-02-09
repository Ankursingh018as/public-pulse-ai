import mongoose from 'mongoose';

// ===========================================
// INCIDENT SCHEMA
// ===========================================
const incidentSchema = new mongoose.Schema({
    event_type: {
        type: String,
        required: true,
        enum: ['pothole', 'water_leak', 'garbage', 'streetlight', 'traffic', 'flood', 'water', 'light', 'road', 'noise', 'other']
    },
    lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    },
    severity: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
    },
    radius: {
        type: Number,
        default: 100
    },
    description: String,
    photo_url: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'resolved'],
        default: 'pending'
    },
    verified: {
        type: Number,
        default: 0
    },
    resolved: {
        type: Boolean,
        default: false
    },
    area_name: String,
    area_id: String,
    zone: String,
    citizen_id: String,
    reported_by: String,
    confidence: Number,
    verified_count: {
        type: Number,
        default: 0
    },
    total_votes: {
        type: Number,
        default: 0
    },
    approved_by: String,
    approved_at: Date,
    resolved_at: Date,
    source: {
        type: String,
        default: 'citizen'
    }
}, {
    timestamps: true
});

incidentSchema.index({ lat: 1, lng: 1 });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ event_type: 1 });

export const Incident = mongoose.model('Incident', incidentSchema);

// ===========================================
// CITIZEN VOTE SCHEMA
// ===========================================
const voteSchema = new mongoose.Schema({
    incident_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident',
        required: true
    },
    citizen_id: {
        type: String,
        required: true
    },
    vote_type: {
        type: String,
        enum: ['yes', 'no', 'photo'],
        required: true
    },
    photo_url: String,
    comment: String
}, {
    timestamps: true
});

voteSchema.index({ incident_id: 1, citizen_id: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);

// ===========================================
// AREA SCHEMA
// ===========================================
const areaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    zone: String,
    lat: Number,
    lng: Number,
    population: Number,
    risk_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    active_incidents: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const Area = mongoose.model('Area', areaSchema);

// ===========================================
// PREDICTION SCHEMA
// ===========================================
const predictionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['traffic', 'water', 'garbage', 'light', 'air_quality', 'flood']
    },
    lat: Number,
    lng: Number,
    area_name: String,
    probability: {
        type: Number,
        min: 0,
        max: 1
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
    },
    timeframe: String,
    confidence: Number,
    reasons: [String],
    trend: {
        type: String,
        enum: ['increasing', 'stable', 'decreasing']
    },
    valid_until: Date
}, {
    timestamps: true
});

predictionSchema.index({ valid_until: 1 });
predictionSchema.index({ area_name: 1, type: 1 });

export const Prediction = mongoose.model('Prediction', predictionSchema);

// ===========================================
// ALERT SCHEMA
// ===========================================
const alertSchema = new mongoose.Schema({
    citizen_id: String,
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    alert_type: {
        type: String,
        enum: ['prediction', 'incident', 'area', 'system'],
        default: 'system'
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    related_incident_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
    },
    related_prediction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prediction'
    },
    is_read: {
        type: Boolean,
        default: false
    },
    actions: [String],
    area_name: String,
    lat: Number,
    lng: Number,
    radius: Number,
    active: {
        type: Boolean,
        default: true
    },
    expires_at: Date
}, {
    timestamps: true
});

alertSchema.index({ active: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);

// ===========================================
// CITIZEN SCHEMA
// ===========================================
const citizenSchema = new mongoose.Schema({
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    email: String,
    name: String,
    area: String,
    reports_count: {
        type: Number,
        default: 0
    },
    votes_count: {
        type: Number,
        default: 0
    },
    reputation_score: {
        type: Number,
        default: 50
    }
}, {
    timestamps: true
});

export const Citizen = mongoose.model('Citizen', citizenSchema);

// ===========================================
// ADMIN SCHEMA
// ===========================================
const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: String,
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    zone_access: [String],
    approved_count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const Admin = mongoose.model('Admin', adminSchema);

