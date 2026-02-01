/**
 * Alert Rules Engine for Public Pulse
 * Automatically generates alerts based on prediction thresholds
 */

import { pgPool } from '../server';
import { broadcastAlert } from '../websockets';
import { sendMultiChannelAlert, AlertPayload } from './notification.service';

export interface AlertRule {
    id: string;
    name: string;
    event_type?: string;        // Optional: specific event type (traffic, water, etc.)
    min_probability: number;    // Minimum probability to trigger
    severity: 'low' | 'medium' | 'high' | 'critical';
    channels: string[];         // notification channels
    message_template: string;
    enabled: boolean;
}

// Default alert rules
const DEFAULT_RULES: AlertRule[] = [
    {
        id: 'rule_critical_any',
        name: 'Critical Risk Alert',
        min_probability: 0.9,
        severity: 'critical',
        channels: ['dashboard', 'email', 'sms'],
        message_template: 'CRITICAL: {event_type} risk detected at {area_name} with {probability}% probability. Immediate action required.',
        enabled: true
    },
    {
        id: 'rule_high_traffic',
        name: 'High Traffic Alert',
        event_type: 'traffic',
        min_probability: 0.75,
        severity: 'high',
        channels: ['dashboard', 'email'],
        message_template: 'Traffic congestion predicted at {area_name}. Expected severity: {probability}%. Deploy traffic management.',
        enabled: true
    },
    {
        id: 'rule_high_water',
        name: 'Waterlogging Alert',
        event_type: 'water',
        min_probability: 0.7,
        severity: 'high',
        channels: ['dashboard', 'email'],
        message_template: 'Waterlogging risk at {area_name}. Probability: {probability}%. Prepare drainage pumps.',
        enabled: true
    },
    {
        id: 'rule_medium_any',
        name: 'Medium Risk Alert',
        min_probability: 0.6,
        severity: 'medium',
        channels: ['dashboard'],
        message_template: '{event_type} risk detected at {area_name}. Probability: {probability}%. Monitor situation.',
        enabled: true
    }
];

// Cache to prevent duplicate alerts
const alertCache = new Map<string, number>(); // key -> timestamp
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Process a prediction and generate alerts if rules match
 */
export async function processAlertRules(prediction: {
    id: string;
    event_type: string;
    probability: number;
    area_id: number;
    area_name: string;
}): Promise<void> {
    const matchingRules = DEFAULT_RULES.filter(rule => {
        if (!rule.enabled) return false;
        if (prediction.probability < rule.min_probability) return false;
        if (rule.event_type && rule.event_type !== prediction.event_type) return false;
        return true;
    });

    // Sort by severity (critical first) and take the highest
    const sortedRules = matchingRules.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    if (sortedRules.length === 0) return;

    const rule = sortedRules[0]; // Take highest severity match

    // Check cooldown
    const cacheKey = `${prediction.area_id}_${prediction.event_type}`;
    const lastAlert = alertCache.get(cacheKey);
    if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
        console.log(`[AlertEngine] Skipping alert for ${cacheKey} - cooldown active`);
        return;
    }

    // Generate alert message
    const message = rule.message_template
        .replace('{event_type}', prediction.event_type)
        .replace('{area_name}', prediction.area_name)
        .replace('{probability}', (prediction.probability * 100).toFixed(0));

    try {
        // Insert alert into database
        const result = await pgPool.query(`
            INSERT INTO alerts (prediction_id, severity, title, message, area_id, channels, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'sent')
            RETURNING id
        `, [
            prediction.id,
            rule.severity,
            `${prediction.event_type.charAt(0).toUpperCase() + prediction.event_type.slice(1)} Alert`,
            message,
            prediction.area_id,
            rule.channels
        ]);

        const alertId = result.rows[0].id;

        // Broadcast via WebSocket
        broadcastAlert({
            id: alertId,
            severity: rule.severity,
            title: `${prediction.event_type} Alert`,
            message,
            area_name: prediction.area_name,
            timestamp: new Date().toISOString()
        });

        // Send notifications
        const alertPayload: AlertPayload = {
            id: alertId,
            title: `${prediction.event_type.charAt(0).toUpperCase() + prediction.event_type.slice(1)} Alert`,
            message,
            severity: rule.severity,
            area_name: prediction.area_name,
            prediction_type: prediction.event_type,
            probability: prediction.probability
        };

        if (rule.channels.includes('email') || rule.channels.includes('sms')) {
            await sendMultiChannelAlert(alertPayload, {
                email: rule.channels.includes('email') ? process.env.ALERT_EMAIL_TO : undefined,
                sms: rule.channels.includes('sms') ? process.env.ALERT_SMS_TO : undefined
            });
        }

        // Update cooldown cache
        alertCache.set(cacheKey, Date.now());

        console.log(`[AlertEngine] Alert generated: ${rule.severity} - ${prediction.event_type} at ${prediction.area_name}`);
    } catch (error) {
        console.error('[AlertEngine] Failed to generate alert:', error);
    }
}

/**
 * Clean up old cache entries
 */
export function cleanupAlertCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of alertCache.entries()) {
        if (now - timestamp > ALERT_COOLDOWN_MS) {
            alertCache.delete(key);
        }
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupAlertCache, 10 * 60 * 1000);
