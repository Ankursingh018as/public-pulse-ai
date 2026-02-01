# 🌐 Public Pulse AI

<div align="center">

![Public Pulse](https://img.shields.io/badge/Public_Pulse-AI_Powered-00d4aa?style=for-the-badge&logo=brain&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**An AI-powered civic intelligence platform for smart city management**

*Real-time incident detection • Predictive analytics • Citizen engagement*

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API Reference](#-api-reference)

</div>

---

## 🎯 Overview

Public Pulse AI is a comprehensive smart city platform designed for **Vadodara, India** that combines real-time incident monitoring, AI-powered predictions, and citizen engagement to improve urban governance and quality of life.

The platform uses machine learning models to predict civic issues before they escalate, enabling proactive city management and faster response times.

---

## ✨ Features

### 🗺️ Interactive Dark-Theme Map
- Real-time visualization of city incidents on a sleek dark map
- Color-coded markers by incident type (traffic, water, garbage, streetlights)
- Glowing severity indicators with pulse animations
- AI prediction zones with dashed outline circles

### 🤖 AI-Powered Intelligence
- **Predictive Analytics**: Forecast incidents before they occur
- **LLM Narration**: Natural language summaries powered by Groq AI (Llama 3.1)
- **Safety Scores**: Real-time area safety assessments
- **Trend Analysis**: Track incident patterns over time

### 👥 Citizen Engagement
- **Report Issues**: One-tap incident reporting with location
- **Verification System**: Crowdsourced incident confirmation
- **Trust Scores**: Gamified citizen participation
- **Photo Evidence**: Attach images to reports

### 🏛️ Admin Dashboard
- Comprehensive incident management
- Approval/rejection workflow
- Historical data analysis with filters
- Export capabilities (CSV)
- Real-time statistics

### 📊 Data Sync System
- Offline-first architecture with localStorage queue
- Automatic retry with exponential backoff
- Sync status indicators
- Full history tracking for admin review

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC PULSE AI                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Citizen App │    │ Admin Dashboard│    │   AI Engine  │      │
│  │   (Next.js)  │    │   (Next.js)   │    │   (Python)   │      │
│  │   Port 3000  │    │   Port 3001   │    │   Port 8000  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   API Gateway   │                          │
│                    │    (Express)    │                          │
│                    │    Port 3002    │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐        │
│  │  PostgreSQL │    │    Redis    │    │   MongoDB   │        │
│  │ (TimescaleDB)│    │   (Cache)   │    │  (Optional) │        │
│  │  Port 5432  │    │  Port 6379  │    │  Port 27017 │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Leaflet |
| **Backend** | Node.js, Express.js, TypeScript |
| **AI/ML** | Python, PyTorch, SpaCy, FastAPI |
| **Database** | PostgreSQL + TimescaleDB, Redis, MongoDB |
| **LLM** | Groq API (Llama 3.1 8B Instant) |
| **Maps** | Leaflet + CartoDB Dark Matter tiles |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Python** 3.9+
- **PostgreSQL** 14+ (with TimescaleDB extension)
- **Redis** 7+
- **Docker** (optional, for containerized setup)

### Option 1: Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/public-pulse-ai.git
cd public-pulse-ai

# Start all services with Docker
docker-compose up -d

# Access the applications
# Citizen App:      http://localhost:3000
# Admin Dashboard:  http://localhost:3001
# API Gateway:      http://localhost:3002
```

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# Start PostgreSQL and Redis (via Docker or locally)
docker run -d --name pulse-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password timescale/timescaledb:latest-pg14
docker run -d --name pulse-redis -p 6379:6379 redis:alpine

# Create database
psql -U postgres -c "CREATE DATABASE pulse_db;"

# Run schema migrations
psql -U postgres -d pulse_db -f scripts/schema.sql
```

#### 2. Environment Configuration

Create `.env` files in each service directory:

**services/api-gateway/.env**
```env
PORT=3002
DATABASE_URL=postgresql://postgres:password@localhost:5432/pulse_db
REDIS_URL=redis://localhost:6379
```

**frontend/citizen-app/.env**
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key
```

**frontend/admin-dashboard/.env**
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

#### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm install --workspaces
```

#### 4. Start Services

**Windows (PowerShell):**
```powershell
# Terminal 1: API Gateway
cd services/api-gateway
$env:PORT="3002"; npm run dev

# Terminal 2: Citizen App
cd frontend/citizen-app
npm run dev

# Terminal 3: Admin Dashboard
cd frontend/admin-dashboard
npm run dev -- -p 3001
```

**Linux/Mac:**
```bash
# Terminal 1: API Gateway
cd services/api-gateway
PORT=3002 npm run dev

# Terminal 2: Citizen App
cd frontend/citizen-app
npm run dev

# Terminal 3: Admin Dashboard
cd frontend/admin-dashboard
npm run dev -- -p 3001
```

#### 5. (Optional) Start AI Engine

```bash
cd public-pulse-ai
pip install -r requirements.txt
python main.py
```

---

## 📁 Project Structure

```
pulse-ai/
├── frontend/
│   ├── citizen-app/              # Citizen-facing mobile-first app
│   │   ├── src/
│   │   │   ├── app/              # Next.js app router pages
│   │   │   │   ├── page.tsx      # Main map view
│   │   │   │   ├── layout.tsx    # Root layout
│   │   │   │   └── globals.css   # Global styles
│   │   │   ├── components/       # React components
│   │   │   │   ├── Map.tsx               # Interactive Leaflet map
│   │   │   │   ├── AINarrationPanel.tsx  # LLM-powered insights
│   │   │   │   ├── AIPredictionPanel.tsx # Prediction dashboard
│   │   │   │   ├── ReportIssueModal.tsx  # Issue reporting form
│   │   │   │   └── VerificationModal.tsx # Crowdsourced verification
│   │   │   └── services/         # API & data services
│   │   │       ├── dataService.ts        # Offline-first sync
│   │   │       ├── groqService.ts        # LLM integration
│   │   │       └── predictionService.ts  # AI predictions
│   │   ├── .env
│   │   └── package.json
│   │
│   └── admin-dashboard/          # Admin management portal
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   │   └── HistoryView.tsx       # Historical data viewer
│       │   └── services/
│       │       └── adminDataService.ts   # Admin API client
│       ├── .env
│       └── package.json
│
├── services/
│   └── api-gateway/              # Express.js API server
│       ├── src/
│       │   ├── routes/
│       │   │   ├── incident.routes.ts    # Incident CRUD
│       │   │   ├── prediction.routes.ts  # AI predictions
│       │   │   └── history.routes.ts     # Historical data
│       │   ├── db.ts             # Database connections
│       │   └── server.ts         # Express app entry
│       ├── .env
│       └── package.json
│
├── public-pulse-ai/              # Python ML/AI engine
│   ├── main.py                   # FastAPI server
│   ├── train_civic_model.py      # NLP model training
│   ├── train_timeseries_models.py
│   ├── train_anomaly_models.py
│   ├── test_civic_model.py
│   └── visualize_*.py            # Visualization scripts
│
├── datasets/                     # Training & reference data
│   ├── vadodara_complaints.csv
│   ├── vadodara_traffic_incidents.csv
│   ├── vadodara_civic_text_dataset.csv
│   ├── flood_sensor_vadodara.csv
│   └── ...
│
├── scripts/                      # Utility scripts
│   ├── import_data.py
│   ├── ingest_complaints.py
│   └── fetch_live_weather.py
│
├── notebooks/                    # Jupyter notebooks
│   └── Public_Pulse_Training.ipynb
│
├── docker-compose.yml            # Container orchestration
├── package.json                  # Root workspace config
└── README.md
```

---

## 🔌 API Reference

### Base URL
```
http://localhost:3002/api/v1
```

### Authentication
Currently uses session-based authentication. API keys for production coming soon.

### Endpoints

#### Incidents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/incidents` | List all incidents |
| `GET` | `/incidents?limit=100` | List with pagination |
| `GET` | `/incidents/:id` | Get incident by ID |
| `POST` | `/incidents` | Create new incident |
| `PATCH` | `/incidents/:id` | Update incident (admin) |
| `DELETE` | `/incidents/:id` | Delete incident (admin) |

**Create Incident Request:**
```json
{
  "event_type": "traffic",
  "lat": 22.3072,
  "lng": 73.1812,
  "severity": 0.7,
  "description": "Heavy congestion near Sayajigunj",
  "source": "citizen"
}
```

#### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/predictions` | Get AI predictions |
| `GET` | `/predictions/area/:areaId` | Predictions for area |

#### History (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/history` | All historical data |
| `GET` | `/history?status=approved` | Filter by status |
| `GET` | `/history?type=traffic` | Filter by type |
| `GET` | `/history/stats` | Aggregated statistics |
| `GET` | `/history/export` | Export as CSV |

#### Verifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/incidents/:id/verify` | Submit verification |
| `GET` | `/incidents/:id/verifications` | Get verifications |

---

## 🎨 UI Theme

The citizen app features a **dark cyberpunk theme** optimized for outdoor visibility:

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Near Black | `#0a0a0a` |
| Cards | Dark Navy | `#1a1a2e` |
| Primary Accent | Cyan | `#22d3ee` |
| Secondary | Purple | `#a855f7` |
| Success | Emerald | `#10b981` |

### Incident Type Colors

| Type | Color | Hex |
|------|-------|-----|
| 🚗 Traffic | Red | `#ef4444` |
| 💧 Water/Flood | Blue | `#3b82f6` |
| 🗑️ Garbage | Orange | `#f97316` |
| 💡 Streetlight | Yellow | `#eab308` |
| 🛣️ Road | Purple | `#a855f7` |

### Severity Indicators

| Level | Color | Animation |
|-------|-------|-----------|
| Critical (>80%) | Red | Fast pulse |
| High (60-80%) | Orange | Medium pulse |
| Medium (40-60%) | Yellow | Slow pulse |
| Low (<40%) | Green | Subtle glow |

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `MONGODB_URI` | MongoDB connection (optional) | - |
| `NEXT_PUBLIC_API_URL` | API base URL for frontend | Required |
| `NEXT_PUBLIC_GROQ_API_KEY` | Groq LLM API key | Required |

### Map Configuration

The map is centered on **Vadodara, Gujarat, India**:

| Setting | Value |
|---------|-------|
| Center | `[22.3072, 73.1812]` |
| Default Zoom | `13` |
| Min Zoom | `11` |
| Max Zoom | `18` |
| Tile Provider | CartoDB Dark Matter |

---

## 📊 Data Models

### Incident

```typescript
interface Incident {
  id: string;
  event_type: 'traffic' | 'water' | 'garbage' | 'light' | 'road' | 'noise';
  lat: number;
  lng: number;
  severity: number;        // 0.0 - 1.0
  verified: number;        // Verification count
  description?: string;
  source: string;          // 'citizen' | 'sensor' | 'api'
  status: string;          // 'pending' | 'approved' | 'resolved'
  admin_notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Prediction

```typescript
interface Prediction {
  id: string;
  type: string;
  lat: number;
  lng: number;
  probability: number;     // 0.0 - 1.0
  severity: string;        // 'low' | 'medium' | 'high' | 'critical'
  area_name: string;
  timeframe: string;       // e.g., '1-2 hours'
  trend: 'increasing' | 'stable' | 'decreasing';
  reasons: string[];
  confidence: number;
}
```

### Citizen Verification

```typescript
interface Verification {
  id: string;
  incident_id: string;
  user_id: string;
  response: 'yes' | 'no' | 'partial';
  has_photo: boolean;
  trust_delta: number;
  created_at: Date;
}
```

---

## 🤖 AI Models

### 1. Civic Text Classifier
- **Purpose**: Classify citizen complaints into categories
- **Model**: Fine-tuned DistilBERT
- **Training**: `public-pulse-ai/train_civic_model.py`
- **Dataset**: `datasets/vadodara_civic_text_dataset.csv`

### 2. Time Series Forecaster
- **Purpose**: Predict incident occurrence patterns
- **Model**: LSTM + Prophet ensemble
- **Training**: `public-pulse-ai/train_timeseries_models.py`

### 3. Anomaly Detector
- **Purpose**: Detect unusual patterns in sensor data
- **Model**: Isolation Forest + AutoEncoder
- **Training**: `public-pulse-ai/train_anomaly_models.py`

### 4. LLM Narration
- **Purpose**: Generate human-readable incident summaries
- **Model**: Llama 3.1 8B Instant (via Groq)
- **Integration**: `citizen-app/src/services/groqService.ts`

---

## 🧪 Testing

### API Tests
```bash
cd services/api-gateway
npm test
```

### AI Model Tests
```bash
cd public-pulse-ai
python -m pytest
python test_civic_model.py
python test_timeseries_models.py
```

### Manual API Testing
```bash
# Get incidents
curl http://localhost:3002/api/v1/incidents

# Create incident
curl -X POST http://localhost:3002/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{"event_type":"traffic","lat":22.31,"lng":73.18,"severity":0.6}'

# Get predictions
curl http://localhost:3002/api/v1/predictions
```

---

## 📈 Performance Optimizations

1. **Lightweight Markers**: CircleMarkers instead of heavy icons
2. **Throttled Updates**: 5-second intervals for data refresh
3. **Lazy LLM Calls**: Only when panels are expanded
4. **Redis Caching**: Predictions cached for 60 seconds
5. **Offline Queue**: localStorage with retry logic

---

## 🚧 Roadmap

- [ ] Push notifications for nearby incidents
- [ ] Multi-language support (Hindi, Gujarati)
- [ ] Photo upload with AI analysis
- [ ] Integration with municipal systems
- [ ] Mobile app (React Native)
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript for all frontend/backend code
- ESLint + Prettier for formatting
- Conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Groq** - Ultra-fast LLM inference
- **Leaflet** - Interactive mapping library
- **TimescaleDB** - Time-series database extension
- **CartoDB** - Beautiful dark map tiles
- **Vadodara Municipal Corporation** - Domain expertise and data

---

<div align="center">

**Built with ❤️ for smarter cities**

Made for Vadodara 🇮🇳

[Report Bug](https://github.com/your-org/public-pulse-ai/issues) • [Request Feature](https://github.com/your-org/public-pulse-ai/issues)

</div>
