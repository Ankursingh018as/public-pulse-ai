"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("../src/models");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || '';
// Sample areas in Vadodara
const areas = [
    { name: 'Alkapuri', zone: 'zone_1', lat: 22.3015, lng: 73.1818, population: 85000, risk_score: 3, active_incidents: 0 },
    { name: 'Gotri', zone: 'zone_2', lat: 22.2891, lng: 73.1938, population: 120000, risk_score: 5, active_incidents: 0 },
    { name: 'Manjalpur', zone: 'zone_3', lat: 22.2850, lng: 73.1730, population: 95000, risk_score: 4, active_incidents: 0 },
    { name: 'Sayajigunj', zone: 'zone_1', lat: 22.3072, lng: 73.1812, population: 70000, risk_score: 2, active_incidents: 0 },
    { name: 'Vadodara Central', zone: 'zone_1', lat: 22.3104, lng: 73.1815, population: 150000, risk_score: 6, active_incidents: 0 },
    { name: 'Fatehgunj', zone: 'zone_2', lat: 22.3094, lng: 73.1769, population: 105000, risk_score: 4, active_incidents: 0 },
    { name: 'Akota', zone: 'zone_3', lat: 22.2864, lng: 73.1945, population: 110000, risk_score: 5, active_incidents: 0 },
    { name: 'Karelibaug', zone: 'zone_2', lat: 22.2972, lng: 73.1903, population: 88000, risk_score: 3, active_incidents: 0 }
];
// Sample incidents
const incidents = [
    {
        event_type: 'pothole',
        description: 'Large pothole near Alkapuri Circle causing traffic issues',
        lat: 22.3015,
        lng: 73.1818,
        severity: 7,
        status: 'pending',
        source: 'citizen_app',
        reported_by: 'citizen_001',
        zone: 'zone_1',
        area_name: 'Alkapuri',
        confidence: 0.85,
        verified_count: 2,
        total_votes: 3,
        resolved: false
    },
    {
        event_type: 'waterlogging',
        description: 'Water logging near Gotri Railway Station after rain',
        lat: 22.2891,
        lng: 73.1938,
        severity: 8,
        status: 'approved',
        source: 'citizen_app',
        reported_by: 'citizen_002',
        zone: 'zone_2',
        area_name: 'Gotri',
        confidence: 0.92,
        verified_count: 5,
        total_votes: 6,
        resolved: false
    },
    {
        event_type: 'traffic_jam',
        description: 'Heavy traffic congestion on RC Dutt Road',
        lat: 22.3072,
        lng: 73.1812,
        severity: 6,
        status: 'pending',
        source: 'sensor',
        reported_by: 'system',
        zone: 'zone_1',
        area_name: 'Sayajigunj',
        confidence: 0.78,
        verified_count: 1,
        total_votes: 2,
        resolved: false
    },
    {
        event_type: 'streetlight',
        description: 'Multiple streetlights not working in Manjalpur area',
        lat: 22.2850,
        lng: 73.1730,
        severity: 5,
        status: 'approved',
        source: 'citizen_app',
        reported_by: 'citizen_003',
        zone: 'zone_3',
        area_name: 'Manjalpur',
        confidence: 0.72,
        verified_count: 3,
        total_votes: 4,
        resolved: false
    }
];
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');
        // Clear existing data
        await models_1.Area.deleteMany({});
        await models_1.Incident.deleteMany({});
        console.log('🧹 Cleared existing data');
        // Insert areas
        const insertedAreas = await models_1.Area.insertMany(areas);
        console.log(`✅ Inserted ${insertedAreas.length} areas`);
        // Insert incidents
        const insertedIncidents = await models_1.Incident.insertMany(incidents);
        console.log(`✅ Inserted ${insertedIncidents.length} incidents`);
        console.log('\n📊 Database seeded successfully!');
        console.log(`   - Areas: ${insertedAreas.length}`);
        console.log(`   - Incidents: ${insertedIncidents.length}`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}
seedDatabase();
