# 📅 Public Pulse AI - Implementation Plan

## Executive Summary

This document outlines the phased implementation plan for deploying Public Pulse AI in Vadodara, covering development sprints, deployment strategy, testing protocols, and rollout timeline.

---

## Phase Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE (16 Weeks)                         │
└──────────────────────────────────────────────────────────────────────────────┘

Week  1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    16
      │     │     │     │     │     │     │     │     │     │     │     │     │     │     │     │
      ├─────┴─────┴─────┴─────┤     │     │     │     │     │     │     │     │     │     │     │
      │      PHASE 1          │     │     │     │     │     │     │     │     │     │     │     │
      │  Foundation & Core    │     │     │     │     │     │     │     │     │     │     │     │
      ├───────────────────────┼─────┴─────┴─────┴─────┤     │     │     │     │     │     │     │
                              │      PHASE 2          │     │     │     │     │     │     │     │
                              │   AI & Integration    │     │     │     │     │     │     │     │
                              ├───────────────────────┼─────┴─────┴─────┴─────┤     │     │     │
                                                      │      PHASE 3          │     │     │     │
                                                      │  Testing & Refinement │     │     │     │
                                                      ├───────────────────────┼─────┴─────┴─────┤
                                                                              │      PHASE 4    │
                                                                              │  Deployment     │
                                                                              └─────────────────┘
```

---

## Phase 1: Foundation & Core (Weeks 1-4)

### Week 1: Project Setup & Infrastructure

#### Day 1-2: Environment Setup
- [ ] Set up development machines
- [ ] Install Node.js 18+, Python 3.10+, Docker
- [ ] Configure IDE (VS Code) with extensions
- [ ] Set up Git repository and branching strategy

#### Day 3-4: Database Setup
- [ ] Deploy PostgreSQL 15 with TimescaleDB extension
- [ ] Create initial schema (incidents, users, areas)
- [ ] Set up Redis for caching
- [ ] Configure database backups

#### Day 5-7: Docker & CI/CD
- [ ] Create Dockerfiles for all services
- [ ] Set up docker-compose for local development
- [ ] Configure GitHub Actions for CI
- [ ] Set up development, staging, production environments

**Deliverables:**
- Development environment ready for all team members
- Database running with initial schema
- docker-compose.yml working locally
- CI pipeline running on commits

---

### Week 2: API Gateway Development

#### Tasks
```
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY - WEEK 2                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Day 1-2: Express.js Setup                                       │
│  ├── Initialize TypeScript project                              │
│  ├── Configure middleware (CORS, auth, logging)                 │
│  └── Set up error handling                                       │
│                                                                  │
│  Day 3-4: Core REST APIs                                         │
│  ├── POST /api/incidents (create)                               │
│  ├── GET /api/incidents (list with filters)                     │
│  ├── GET /api/incidents/:id (detail)                            │
│  └── PUT /api/incidents/:id (update)                            │
│                                                                  │
│  Day 5-6: Authentication                                         │
│  ├── JWT token generation                                        │
│  ├── Role-based access control                                   │
│  └── Session management with Redis                               │
│                                                                  │
│  Day 7: Testing & Documentation                                  │
│  ├── Unit tests for all endpoints                               │
│  ├── Postman collection                                          │
│  └── OpenAPI spec generation                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables:**
- Working REST API with 10+ endpoints
- JWT authentication implemented
- API documentation in Swagger
- 80% test coverage

---

### Week 3: Citizen App Frontend

#### Sprint Goals
- [ ] Set up Next.js 14 project with App Router
- [ ] Implement dark theme design system
- [ ] Create Leaflet map component
- [ ] Build incident reporting modal
- [ ] Implement voting/verification UI

#### Component Breakdown

| Component | Priority | Complexity | Status |
|-----------|----------|------------|--------|
| Map.tsx | P0 | High | - |
| ReportIssueModal.tsx | P0 | Medium | - |
| IncidentDrawer.tsx | P0 | Medium | - |
| VerificationModal.tsx | P1 | Medium | - |
| BottomNav.tsx | P1 | Low | - |
| AlertsView.tsx | P2 | Medium | - |

#### Design Implementation
```css
/* Theme Variables - Dark Cyberpunk */
--bg-primary: #0a0a0a;
--bg-secondary: #111111;
--bg-card: rgba(20, 20, 20, 0.8);
--accent-cyan: #00d4ff;
--accent-glow: 0 0 20px rgba(0, 212, 255, 0.3);
--text-primary: #ffffff;
--text-secondary: #888888;
```

**Deliverables:**
- Responsive citizen app with dark theme
- Interactive map with incident markers
- Issue reporting flow complete
- Connected to API Gateway

---

### Week 4: Admin Dashboard Foundation

#### Sprint Goals
- [ ] Set up admin dashboard project
- [ ] Implement authentication flow
- [ ] Create dashboard layout (sidebar, header)
- [ ] Build incident approval queue
- [ ] Basic analytics display

#### Dashboard Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│  ◉ PUBLIC PULSE                                    👤 Admin     │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                        │
│  📊     │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  Live   │  │ Active  │ │Resolved │ │ Pending │ │Critical │      │
│         │  │   24    │ │   156   │ │   12    │ │    3    │      │
│  📋     │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│ Approval│                                                        │
│         │  ┌────────────────────────────────────────────────┐   │
│  📈     │  │                                                │   │
│ Analytics│  │              APPROVAL QUEUE                   │   │
│         │  │                                                │   │
│  🗺️     │  │  🔴 [HIGH] Pothole - Alkapuri                 │   │
│  Map    │  │     5 votes | 15 min ago | [Approve] [Reject] │   │
│         │  │                                                │   │
│  📜     │  │  🟡 [MED] Streetlight - Fatehgunj             │   │
│ History │  │     3 votes | 1 hr ago | [Approve] [Reject]   │   │
│         │  │                                                │   │
│         │  └────────────────────────────────────────────────┘   │
└─────────┴───────────────────────────────────────────────────────┘
```

**Deliverables:**
- Admin login and role management
- Incident approval workflow
- Basic KPI dashboard
- Connected to same API Gateway

---

## Phase 2: AI Integration (Weeks 5-8)

### Week 5: AI Engine Setup

#### Day 1-2: Python Environment
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install fastapi uvicorn pandas scikit-learn prophet torch
```

#### Day 3-4: Classification Model
- [ ] Load vadodara_civic_text_dataset.csv
- [ ] Preprocess text (tokenization, cleaning)
- [ ] Train Random Forest classifier
- [ ] Export model to .pkl file

#### Day 5-7: Inference API
```python
# main.py
@app.post("/classify")
async def classify_incident(request: ClassifyRequest):
    text = request.text
    features = preprocess(text)
    prediction = model.predict([features])
    severity = calculate_severity(prediction, request.location)
    return {
        "category": prediction[0],
        "severity": severity,
        "confidence": model.predict_proba([features]).max()
    }
```

**Deliverables:**
- AI Engine running on port 8000
- Classification endpoint working
- Model with 85%+ accuracy
- Connected to API Gateway

---

### Week 6: Time-Series Predictions

#### Models to Implement

| Model | Use Case | Library | Training Data |
|-------|----------|---------|---------------|
| Prophet | Traffic forecasting | fbprophet | vadodara_traffic_speed.csv |
| ARIMA | Flood prediction | statsmodels | rainfall_vadodara.csv |
| Isolation Forest | Anomaly detection | sklearn | sensor readings |

#### Training Pipeline
```
┌─────────────────────────────────────────────────────────────────┐
│                    MODEL TRAINING PIPELINE                       │
└─────────────────────────────────────────────────────────────────┘

     Historical Data          Feature Engineering         Model Training
     ┌───────────┐            ┌───────────────┐          ┌───────────┐
     │ CSV Files │───────────►│ - Lag features │─────────►│  Prophet  │
     │           │            │ - Rolling avg  │          │  ARIMA    │
     │ • traffic │            │ - Day of week  │          │  I-Forest │
     │ • rainfall│            │ - Holidays     │          └─────┬─────┘
     │ • aqi     │            │ - Events       │                │
     └───────────┘            └───────────────┘                │
                                                                ▼
                                                          ┌───────────┐
                                                          │  Model    │
                                                          │  Store    │
                                                          │  (.pkl)   │
                                                          └───────────┘
```

**Deliverables:**
- Traffic congestion predictor
- Flood risk predictor
- AQI forecaster
- Anomaly detection system

---

### Week 7: LLM Integration (Groq)

#### Setup Steps
1. Create Groq account at console.groq.com
2. Generate API key
3. Add to environment variables
4. Implement narration service

#### Prompt Engineering

```typescript
const NARRATION_PROMPT = `
You are a helpful city assistant for Vadodara. Generate a brief, 
citizen-friendly explanation for this incident:

INCIDENT: {event_type}
LOCATION: {area_name} ({lat}, {lng})
SEVERITY: {severity}/10
TIME: Reported {time_ago}
CITIZEN VERIFICATION: {votes_yes} confirmed, {votes_no} disputed
WEATHER: {current_weather}

Instructions:
1. Use plain language (no technical jargon)
2. Mention specific impact on daily life
3. Include one safety tip if severity > 6
4. Suggest alternate routes if applicable
5. Keep response under 100 words
6. Use emojis sparingly for visual appeal

Respond in JSON format:
{
  "narration": "...",
  "safety_tip": "...",
  "estimated_resolution": "..."
}
`;
```

#### Service Implementation
```typescript
// groqService.ts
export async function generateNarration(incident: Incident): Promise<Narration> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildPrompt(incident) }
            ],
            temperature: 0.7,
            max_tokens: 300
        })
    });
    
    return parseNarration(await response.json());
}
```

**Deliverables:**
- Groq integration complete
- Narration panel in citizen app
- Admin AI recommendations
- <1 second response time

---

### Week 8: WebSocket Real-Time

#### Implementation Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

                         API Gateway
                    ┌─────────────────┐
                    │   Socket.io     │
                    │   Server        │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  Room:  │         │  Room:  │         │  Room:  │
   │incidents│         │  admin  │         │ alerts  │
   └─────────┘         └─────────┘         └─────────┘
        │                    │                    │
    All users          Admin only         Subscribed
```

#### Events to Implement

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `incident:new` | Server → Client | Incident | POST /incidents |
| `incident:vote` | Server → Client | Vote count | POST /vote |
| `incident:approved` | Server → Client | Status | Admin approval |
| `prediction:alert` | Server → Client | Prediction | AI batch job |
| `client:subscribe` | Client → Server | Area ID | User action |

**Deliverables:**
- Real-time incident updates
- Live vote counting
- Push notifications
- Admin alerts

---

## Phase 3: Testing & Refinement (Weeks 9-12)

### Week 9: Unit & Integration Testing

#### Test Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| API Gateway | 80% | - |
| AI Engine | 75% | - |
| Citizen App | 70% | - |
| Admin Dashboard | 70% | - |

#### Test Types
```
┌─────────────────────────────────────────────────────────────────┐
│                      TESTING PYRAMID                             │
└─────────────────────────────────────────────────────────────────┘

                         ┌───────┐
                         │  E2E  │     10 tests
                         │ Tests │     Playwright
                         ├───────┴───────┐
                         │  Integration   │     50 tests
                         │     Tests      │     Supertest
                         ├───────────────┴────────┐
                         │       Unit Tests        │     200+ tests
                         │    Jest / Pytest        │     Components
                         └────────────────────────┘
```

#### Key Test Scenarios
- [ ] Incident creation with photo upload
- [ ] Voting updates incident count
- [ ] Admin approval changes status
- [ ] AI classification returns valid category
- [ ] WebSocket broadcasts to connected clients
- [ ] Rate limiting prevents spam

---

### Week 10: Performance Optimization

#### Optimization Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| API Response | 300ms | <200ms | Redis caching |
| Map Load | 3s | <2s | Marker clustering |
| AI Inference | 1.2s | <800ms | Model optimization |
| Bundle Size | 500KB | <300KB | Code splitting |

#### Caching Strategy
```typescript
// Redis caching for frequent queries
const CACHE_TTL = {
    incidents_list: 30,      // 30 seconds
    incident_detail: 60,     // 1 minute
    analytics_summary: 300,  // 5 minutes
    predictions: 900,        // 15 minutes
    narration: 300           // 5 minutes
};

async function getIncidents(filters: Filters) {
    const cacheKey = `incidents:${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Fetch from DB
    const data = await db.query('SELECT * FROM incidents...');
    
    // Store in cache
    await redis.setex(cacheKey, CACHE_TTL.incidents_list, JSON.stringify(data));
    
    return data;
}
```

---

### Week 11: Security Hardening

#### Security Checklist

- [ ] **Authentication**
  - JWT tokens with short expiry (1 hour)
  - Refresh token rotation
  - Password hashing (bcrypt)

- [ ] **Authorization**
  - Role-based access control
  - API key for service-to-service

- [ ] **Input Validation**
  - Sanitize all user inputs
  - Validate file uploads (type, size)
  - Prevent SQL injection

- [ ] **API Security**
  - Rate limiting (100 req/min)
  - CORS configuration
  - HTTPS only

- [ ] **Data Protection**
  - Environment variables for secrets
  - Encrypted database connections
  - Audit logging

---

### Week 12: UAT & Bug Fixes

#### User Acceptance Testing Plan

| Tester Group | Count | Focus Area | Duration |
|--------------|-------|------------|----------|
| Development Team | 5 | Full functionality | 2 days |
| Municipal Staff | 10 | Admin workflow | 3 days |
| Citizen Volunteers | 50 | Mobile app | 5 days |

#### UAT Scenarios
1. Report an incident with photo
2. Vote on existing incidents
3. Receive real-time notification
4. Admin approves incident
5. View AI predictions
6. Access historical data

#### Bug Tracking
- Use GitHub Issues for bug tracking
- Labels: `bug`, `priority-high`, `priority-medium`, `priority-low`
- Daily bug triage meetings
- Fix all high-priority bugs before launch

---

## Phase 4: Deployment & Launch (Weeks 13-16)

### Week 13: Staging Deployment

#### Infrastructure Setup
```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                           │
└─────────────────────────────────────────────────────────────────┘

                    AWS / Azure Cloud
     ┌──────────────────────────────────────────┐
     │                                          │
     │  ┌─────────────┐    ┌─────────────┐     │
     │  │   Load      │    │   CDN       │     │
     │  │  Balancer   │    │ (CloudFlare)│     │
     │  └──────┬──────┘    └──────┬──────┘     │
     │         │                  │             │
     │         ▼                  ▼             │
     │  ┌─────────────────────────────────┐    │
     │  │         Kubernetes              │    │
     │  │  ┌─────┐ ┌─────┐ ┌─────┐       │    │
     │  │  │ API │ │ Web │ │ AI  │       │    │
     │  │  │ x2  │ │ x2  │ │ x1  │       │    │
     │  │  └─────┘ └─────┘ └─────┘       │    │
     │  └─────────────────────────────────┘    │
     │                                          │
     │  ┌─────────────────────────────────┐    │
     │  │  Managed Services               │    │
     │  │  • PostgreSQL (RDS)             │    │
     │  │  • Redis (ElastiCache)          │    │
     │  └─────────────────────────────────┘    │
     │                                          │
     └──────────────────────────────────────────┘
```

#### Deployment Checklist
- [ ] Set up cloud accounts (AWS/Azure)
- [ ] Configure Kubernetes cluster
- [ ] Deploy staging database
- [ ] Configure secrets management
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure logging (ELK stack)
- [ ] Test auto-scaling

---

### Week 14: Data Migration

#### Migration Plan

```
SOURCE                    TRANSFORM                 DESTINATION
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│ CSV Datasets  │───────►│ Python ETL    │───────►│ PostgreSQL    │
│               │        │               │        │               │
│ • Traffic     │        │ • Validate    │        │ • incidents   │
│ • Weather     │        │ • Clean       │        │ • areas       │
│ • Complaints  │        │ • Transform   │        │ • predictions │
│ • AQI         │        │ • Load        │        │ • time_series │
└───────────────┘        └───────────────┘        └───────────────┘
```

#### Migration Scripts
```python
# scripts/migrate_data.py
def migrate_complaints():
    df = pd.read_csv('datasets/vadodara_complaints.csv')
    
    # Clean data
    df['created_at'] = pd.to_datetime(df['date'])
    df['lat'] = df['lat'].fillna(22.3072)
    df['lng'] = df['lng'].fillna(73.1812)
    
    # Transform to incidents format
    incidents = []
    for _, row in df.iterrows():
        incidents.append({
            'id': str(uuid.uuid4()),
            'event_type': map_category(row['category']),
            'lat': row['lat'],
            'lng': row['lng'],
            'severity': calculate_severity(row),
            'status': 'historical',
            'created_at': row['created_at']
        })
    
    # Bulk insert
    db.bulk_insert('incidents', incidents)
    print(f"Migrated {len(incidents)} complaints to incidents")
```

---

### Week 15: Production Deployment

#### Go-Live Checklist

| Category | Task | Owner | Status |
|----------|------|-------|--------|
| Infrastructure | Production cluster ready | DevOps | ⬜ |
| Database | Production DB provisioned | DevOps | ⬜ |
| Security | SSL certificates installed | DevOps | ⬜ |
| Monitoring | Alerting configured | DevOps | ⬜ |
| Backup | Automated backups enabled | DevOps | ⬜ |
| DNS | Domain configured | DevOps | ⬜ |
| App | Citizen app deployed | Frontend | ⬜ |
| App | Admin dashboard deployed | Frontend | ⬜ |
| API | API Gateway deployed | Backend | ⬜ |
| AI | AI Engine deployed | ML | ⬜ |
| Data | Historical data loaded | Data | ⬜ |
| Docs | User documentation ready | PM | ⬜ |

#### Rollback Plan
```
IF deployment fails:
  1. Stop new deployments
  2. Route traffic to previous version
  3. Rollback database if needed
  4. Investigate root cause
  5. Fix and redeploy
```

---

### Week 16: Launch & Monitoring

#### Launch Day Schedule

| Time | Activity | Responsible |
|------|----------|-------------|
| 06:00 | Final health checks | DevOps |
| 07:00 | Enable public access | DevOps |
| 08:00 | Monitor first users | All |
| 09:00 | Press release goes out | Marketing |
| 10:00 | Municipal announcement | Government |
| 12:00 | Review first 4 hours | Team |
| 18:00 | Daily summary | PM |
| 22:00 | Night monitoring begins | DevOps |

#### Success Metrics (First Week)
- 1,000+ app downloads
- 100+ incidents reported
- 50+ incidents verified
- <200ms average API response
- 99.5% uptime
- 0 critical bugs

#### Monitoring Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                    GRAFANA DASHBOARD                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Requests/s  │  │ Error Rate  │  │  P95 Latency│             │
│  │    📈 450   │  │   📉 0.1%   │  │   📊 180ms  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Response Time (24h)                     │   │
│  │     200│   ╭──╮                                          │   │
│  │        │  ╭╯  ╰──────────╮         ╭───────╮             │   │
│  │     100│──╯              ╰─────────╯       ╰─────        │   │
│  │        └────────────────────────────────────────────     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Server overload at launch | Medium | High | Auto-scaling, load testing |
| AI model accuracy low | Low | Medium | Continuous training, feedback loop |
| Low citizen adoption | Medium | High | Marketing, gamification |
| Data privacy concerns | Low | High | Compliance review, anonymization |
| Integration failures | Medium | Medium | API contracts, mocking |

### Contingency Plans

1. **Server Issues**: Fallback to queue-based processing
2. **AI Failures**: Default severity, manual classification
3. **Database Down**: Read-only mode from Redis cache
4. **Third-party API Fails**: Graceful degradation

---

## Resource Allocation

### Team Schedule

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| Frontend Dev | 100% | 80% | 60% | 40% |
| Backend Dev | 100% | 80% | 60% | 40% |
| ML Engineer | 20% | 100% | 60% | 40% |
| DevOps | 40% | 40% | 60% | 100% |
| QA | 20% | 40% | 100% | 60% |
| PM | 100% | 100% | 100% | 100% |

### Budget Allocation

| Category | Amount (USD) | Percentage |
|----------|-------------|------------|
| Cloud Infrastructure | $5,000 | 35% |
| Third-party APIs | $2,000 | 14% |
| Development Tools | $1,000 | 7% |
| Testing/QA | $1,500 | 10% |
| Contingency | $4,500 | 34% |
| **Total** | **$14,000** | 100% |

---

## Documentation Deliverables

| Document | Owner | Due Date |
|----------|-------|----------|
| API Documentation | Backend | Week 4 |
| User Manual (Citizen) | PM | Week 12 |
| Admin Guide | PM | Week 12 |
| Deployment Runbook | DevOps | Week 13 |
| Incident Response Plan | DevOps | Week 14 |
| Training Materials | PM | Week 15 |

---

## Sign-Off

| Stakeholder | Approval | Date |
|-------------|----------|------|
| Project Lead | ⬜ | |
| Technical Lead | ⬜ | |
| Municipal Officer | ⬜ | |
| Quality Assurance | ⬜ | |

---

*Document Version: 1.0*
*Created: February 2026*
*Next Review: March 2026*
