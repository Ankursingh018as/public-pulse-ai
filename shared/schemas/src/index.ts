// ===========================================
// PUBLIC PULSE - SHARED TYPE DEFINITIONS
// ===========================================

// Issue Types
export type IssueType = 'traffic' | 'garbage' | 'water' | 'light';

// Data Source Types
export type SourceType = 'wa' | 'news' | 'social' | 'maps' | 'sensor' | 'citizen';

// Alert Status
export type AlertStatus = 'pending' | 'sent' | 'acknowledged' | 'resolved';

// Severity Levels
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

// ===========================================
// LOCATION
// ===========================================

export interface Location {
    lat: number;
    lng: number;
    areaName?: string;
    areaId?: number;
}

// ===========================================
// CIVIC ISSUE (Core Schema)
// ===========================================

export interface CivicIssue {
    id: string;
    type: IssueType;
    location: Location;
    severity: number; // 0-1
    sources: SourceType[];
    rawText?: string;
    confidence: number; // 0-1
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

// ===========================================
// PREDICTION
// ===========================================

export interface Prediction {
    id: string;
    eventType: IssueType;
    areaId: number;
    areaName: string;
    location?: Location;
    probability: number; // 0-1
    etaHours: number;
    confidence: number; // 0-1
    reasons: string[];
    riskBreakdown: RiskBreakdown;
    recommendedAction?: string;
    modelVersion: string;
    isActive: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface RiskBreakdown {
    realtimeAnomaly: number;
    historicalPattern: number;
    weatherImpact: number;
    socialTrend: number;
}

// ===========================================
// ALERT
// ===========================================

export interface Alert {
    id: string;
    predictionId: string;
    severity: SeverityLevel;
    title: string;
    message: string;
    areaId?: number;
    status: AlertStatus;
    channels: string[];
    sentAt?: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

// ===========================================
// TRAFFIC DATA
// ===========================================

export interface TrafficData {
    id: string;
    location: Location;
    areaId?: number;
    speedKmh: number;
    congestionLevel: number; // 0-1
    delaySeconds: number;
    isAnomaly: boolean;
    recordedAt: Date;
}

// ===========================================
// WEATHER DATA
// ===========================================

export interface WeatherData {
    id: string;
    areaId: number;
    temperatureC: number;
    humidityPercent: number;
    rainProbability: number; // 0-1
    rainMm: number;
    windSpeedKmh: number;
    conditions: string;
    recordedAt: Date;
}

// ===========================================
// CITIZEN REPORT
// ===========================================

export interface CitizenReport {
    id: string;
    type: IssueType;
    description?: string;
    location?: Location;
    areaId?: number;
    imageUrls: string[];
    reporterId?: string;
    isVerified: boolean;
    linkedPredictionId?: string;
    createdAt: Date;
}

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface CreateReportRequest {
    type: IssueType;
    description?: string;
    location?: Location;
    imageUrls?: string[];
}

export interface PredictionsQueryParams {
    type?: IssueType;
    areaId?: number;
    minProbability?: number;
    isActive?: boolean;
    limit?: number;
    offset?: number;
}

export interface HeatmapData {
    type: IssueType;
    points: HeatmapPoint[];
    updatedAt: Date;
}

export interface HeatmapPoint {
    lat: number;
    lng: number;
    intensity: number; // 0-1
    prediction?: Prediction;
}

export interface AreaStats {
    areaId: number;
    areaName: string;
    issueBreakdown: Record<IssueType, number>;
    activePredictions: number;
    riskLevel: SeverityLevel;
    lastUpdated: Date;
}

export interface FeedbackRequest {
    predictionId: string;
    wasAccurate: boolean;
    actualSeverity?: number;
    comments?: string;
}

// ===========================================
// WEBSOCKET EVENTS
// ===========================================

export type WebSocketEventType =
    | 'prediction:new'
    | 'prediction:update'
    | 'prediction:expired'
    | 'alert:new'
    | 'alert:update'
    | 'issue:detected';

export interface WebSocketMessage<T = unknown> {
    event: WebSocketEventType;
    data: T;
    timestamp: Date;
}

// ===========================================
// RAW MESSAGE TYPES (from data sources)
// ===========================================

export interface RawWhatsAppMessage {
    messageId: string;
    from: string;
    groupId?: string;
    text: string;
    timestamp: Date;
    media?: {
        type: 'image' | 'video' | 'document';
        url: string;
    };
}

export interface RawNewsArticle {
    sourceId: string;
    url: string;
    headline: string;
    summary?: string;
    publishedAt: Date;
    scrapedAt: Date;
}

export interface RawSocialPost {
    platform: 'twitter' | 'facebook';
    postId: string;
    userId: string;
    text: string;
    hashtags: string[];
    location?: Location;
    timestamp: Date;
}

// ===========================================
// ML MODEL TYPES
// ===========================================

export interface PredictionInput {
    areaId: number;
    type: IssueType;
    historicalData: CivicIssue[];
    weatherForecast: WeatherData[];
    trafficData: TrafficData[];
    socialSignals: SocialSignal[];
}

export interface SocialSignal {
    source: 'wa' | 'news' | 'social';
    text: string;
    sentiment: number; // -1 to 1
    issueType?: IssueType;
    urgency: number; // 0-1
    timestamp: Date;
}

export interface ModelOutput {
    probability: number;
    etaHours: number;
    confidence: number;
    riskBreakdown: RiskBreakdown;
    reasons: string[];
}

// ===========================================
// EXPORTS
// ===========================================

export * from './index';
