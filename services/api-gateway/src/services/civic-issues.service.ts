import { pgPool } from '../config/database';

export interface CivicIssue {
    id?: string;
    type: 'traffic' | 'garbage' | 'water' | 'light';
    location: { lat: number; lng: number };
    area_id?: number;
    area_name?: string;
    severity?: number;
    sources?: string[];
    raw_text?: string;
    confidence?: number;
    metadata?: any;
    created_at?: Date;
    user_id?: string;
    photo_url?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'resolved';
    verified?: number;
}

/**
 * Create a new civic issue in PostgreSQL
 */
export async function createCivicIssue(issue: CivicIssue): Promise<CivicIssue> {
    const {
        type,
        location,
        area_id,
        area_name,
        severity = 0.5,
        sources = ['citizen'],
        raw_text,
        confidence = 1.0,
        metadata = {},
        user_id,
        photo_url,
        status = 'pending'
    } = issue;

    // Convert metadata to JSONB-safe format
    const metadataJson = {
        ...metadata,
        user_id,
        photo_url,
        status,
        verified: 0
    };

    const query = `
        INSERT INTO civic_issues (
            type, 
            location, 
            area_id, 
            area_name, 
            severity, 
            sources, 
            raw_text, 
            confidence, 
            metadata,
            created_at
        ) VALUES (
            $1, 
            ST_SetSRID(ST_MakePoint($2, $3), 4326),
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            NOW()
        )
        RETURNING 
            id,
            type,
            ST_X(location::geometry) as lng,
            ST_Y(location::geometry) as lat,
            area_id,
            area_name,
            severity,
            sources,
            raw_text,
            confidence,
            metadata,
            created_at
    `;

    const values = [
        type,
        location.lng,
        location.lat,
        area_id || null,
        area_name || 'Unknown',
        severity,
        sources,
        raw_text || `${type} reported at ${location.lat}, ${location.lng}`,
        confidence,
        JSON.stringify(metadataJson)
    ];

    const result = await pgPool.query(query, values);
    const row = result.rows[0];

    return {
        id: row.id,
        type: row.type,
        location: { lat: row.lat, lng: row.lng },
        area_id: row.area_id,
        area_name: row.area_name,
        severity: row.severity,
        sources: row.sources,
        raw_text: row.raw_text,
        confidence: row.confidence,
        metadata: row.metadata,
        created_at: row.created_at,
        status: row.metadata?.status || 'pending',
        verified: row.metadata?.verified || 0,
        user_id: row.metadata?.user_id,
        photo_url: row.metadata?.photo_url
    };
}

/**
 * Get civic issues with filtering
 */
export async function getCivicIssues(filters: {
    type?: string;
    status?: string;
    limit?: number;
    since?: Date;
    area_id?: number;
}): Promise<CivicIssue[]> {
    const { type, status, limit = 50, since, area_id } = filters;

    let query = `
        SELECT 
            id,
            type,
            ST_X(location::geometry) as lng,
            ST_Y(location::geometry) as lat,
            area_id,
            area_name,
            severity,
            sources,
            raw_text,
            confidence,
            metadata,
            created_at
        FROM civic_issues
        WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (type) {
        query += ` AND type = $${paramCount++}`;
        values.push(type);
    }

    if (status) {
        query += ` AND metadata->>'status' = $${paramCount++}`;
        values.push(status);
    }

    if (area_id) {
        query += ` AND area_id = $${paramCount++}`;
        values.push(area_id);
    }

    if (since) {
        query += ` AND created_at >= $${paramCount++}`;
        values.push(since);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    values.push(limit);

    const result = await pgPool.query(query, values);

    return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        location: { lat: row.lat, lng: row.lng },
        area_id: row.area_id,
        area_name: row.area_name,
        severity: row.severity,
        sources: row.sources,
        raw_text: row.raw_text,
        confidence: row.confidence,
        metadata: row.metadata,
        created_at: row.created_at,
        status: row.metadata?.status || 'pending',
        verified: row.metadata?.verified || 0,
        user_id: row.metadata?.user_id,
        photo_url: row.metadata?.photo_url
    }));
}

/**
 * Get a single civic issue by ID
 */
export async function getCivicIssueById(id: string): Promise<CivicIssue | null> {
    const query = `
        SELECT 
            id,
            type,
            ST_X(location::geometry) as lng,
            ST_Y(location::geometry) as lat,
            area_id,
            area_name,
            severity,
            sources,
            raw_text,
            confidence,
            metadata,
            created_at
        FROM civic_issues
        WHERE id = $1
    `;

    const result = await pgPool.query(query, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        type: row.type,
        location: { lat: row.lat, lng: row.lng },
        area_id: row.area_id,
        area_name: row.area_name,
        severity: row.severity,
        sources: row.sources,
        raw_text: row.raw_text,
        confidence: row.confidence,
        metadata: row.metadata,
        created_at: row.created_at,
        status: row.metadata?.status || 'pending',
        verified: row.metadata?.verified || 0,
        user_id: row.metadata?.user_id,
        photo_url: row.metadata?.photo_url
    };
}

/**
 * Update civic issue status
 */
export async function updateCivicIssueStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'resolved'
): Promise<CivicIssue | null> {
    const query = `
        UPDATE civic_issues
        SET metadata = jsonb_set(metadata, '{status}', to_jsonb($2::text))
        WHERE id = $1
        RETURNING 
            id,
            type,
            ST_X(location::geometry) as lng,
            ST_Y(location::geometry) as lat,
            area_id,
            area_name,
            severity,
            sources,
            raw_text,
            confidence,
            metadata,
            created_at
    `;

    const result = await pgPool.query(query, [id, status]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        type: row.type,
        location: { lat: row.lat, lng: row.lng },
        area_id: row.area_id,
        area_name: row.area_name,
        severity: row.severity,
        sources: row.sources,
        raw_text: row.raw_text,
        confidence: row.confidence,
        metadata: row.metadata,
        created_at: row.created_at,
        status: row.metadata?.status || 'pending',
        verified: row.metadata?.verified || 0,
        user_id: row.metadata?.user_id,
        photo_url: row.metadata?.photo_url
    };
}

/**
 * Increment verification count for a civic issue
 */
export async function incrementVerification(id: string): Promise<void> {
    const query = `
        UPDATE civic_issues
        SET metadata = jsonb_set(
            metadata, 
            '{verified}', 
            to_jsonb(COALESCE((metadata->>'verified')::int, 0) + 1)
        )
        WHERE id = $1
    `;

    await pgPool.query(query, [id]);
}
