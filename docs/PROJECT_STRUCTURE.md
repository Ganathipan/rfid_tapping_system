# RFID Tapping System - Project Structure

## 📁 Project Organization

```
rfid_tapping_system/
├── 📄 README.md                    # Main project documentation
├── 📄 package.json                 # Root package configuration
├── 📄 package-lock.json           # Dependency lock file
├── 📄 .gitignore                  # Git ignore rules
│
├── 📁 apps/                       # Application code
│   ├── 📁 backend/                # Node.js/Express API server
│   │   ├── 📄 package.json        # Backend dependencies
│   │   ├── 📄 jest.config.json    # Jest testing configuration
│   │   ├── 📄 Dockerfile          # Container configuration
│   │   ├── 📁 src/                # Source code
│   │   │   ├── 📄 app.js          # Express application
│   │   │   ├── 📄 server.js       # Server entry point
│   │   │   ├── 📁 config/         # Configuration modules
│   │   │   ├── 📁 db/             # Database connection & setup
│   │   │   ├── 📁 routes/         # API route handlers
│   │   │   ├── 📁 services/       # Business logic services
│   │   │   ├── 📁 realtime/       # MQTT & real-time handlers
│   │   │   └── 📁 utils/          # Utility functions
│   │   └── 📁 tests/              # Backend test suites
│   │       ├── 📄 setup.js        # Test configuration
│   │       ├── 📁 routes/         # Route tests
│   │       └── 📁 services/       # Service tests
│   │
│   └── 📁 frontend/               # React application
│       ├── 📄 package.json        # Frontend dependencies
│       ├── 📄 vite.config.js      # Vite build configuration
│       ├── 📄 vitest.config.js    # Vitest testing configuration
│       ├── 📄 tailwind.config.js  # Tailwind CSS configuration
│       ├── 📄 eslint.config.js    # ESLint configuration
│       ├── 📄 postcss.config.js   # PostCSS configuration
│       ├── 📄 index.html          # HTML entry point
│       ├── 📁 src/                # Source code
│       │   ├── 📄 main.jsx        # React application entry
│       │   ├── 📄 App.jsx         # Main App component
│       │   ├── 📄 api.js          # API client functions
│       │   ├── 📄 config.js       # Frontend configuration
│       │   ├── 📁 components/     # Reusable components
│       │   ├── 📁 pages/          # Page components
│       │   ├── 📁 layouts/        # Layout components
│       │   ├── 📁 lib/            # Utility libraries
│       │   └── 📁 assets/         # Static assets
│       ├── 📁 data/               # Static data files
│       │   ├── 📄 provinces.json  # Location data
│       │   ├── 📄 universities.json
│       │   └── 📁 schools/        # School data by province
│       ├── 📁 public/             # Public static files
│       └── 📁 tests/              # Frontend test suites
│           ├── 📄 setup.js        # Test configuration
│           └── 📄 *.test.jsx      # Component tests
│
├── 📁 firmware/                   # IoT device firmware
│   ├── 📁 config/                # Hardware configuration
│   │   ├── 📄 reader-1-config.h  # Reader 1 settings
│   │   └── 📄 reader-2-config.h  # Reader 2 settings
│   ├── 📁 esp01_rdm6300_mqtt/    # Arduino firmware
│   │   ├── 📄 config.h           # Firmware configuration
│   │   └── 📄 main.ino           # Main firmware code
│   └── 📁 PCB_layout/            # PCB design files
│       └── 📄 PCB_RFID.pdsprj    # PCB project file
│
├── 📁 infra/                     # Infrastructure & deployment
│   ├── 📄 docker-compose.yml     # Multi-container orchestration
│   ├── 📁 db/                    # Database setup
│   │   ├── 📄 schema.sql         # Database schema
│   │   └── 📄 seed.sql           # Initial data
│   └── 📁 mosquitto/             # MQTT broker configuration
│       └── 📄 mosquitto.conf     # MQTT settings
│
├── 📁 deployment/                # Deployment configurations
│   ├── 📄 railway.json           # Railway deployment
│   └── 📄 vercel.json            # Vercel deployment
│
├── 📁 scripts/                   # Utility scripts
│   └── 📄 generate-configs.js    # Configuration generator
│
├── 📁 config/                    # Global configuration
│   └── 📄 master-config.js       # Master configuration
│
└── 📁 docs/                      # Project documentation
    └── 📁 testing/               # Testing documentation
        ├── 📄 TESTING_COMPLETE_SUMMARY.md      # Complete testing overview
        ├── 📄 ANALYTICS_TESTING_RESOLUTION.md  # Analytics testing solutions
        ├── 📄 REACT_ACT_WARNINGS_EXPLAINED.md  # React testing fixes
        └── 📄 UNIT_TESTING_SUMMARY.md          # Unit testing details
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: MQTT (Mosquitto)
- **Testing**: Jest + Supertest
- **Containerization**: Docker

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint

### IoT/Firmware
- **Platform**: ESP8266 (ESP-01)
- **RFID**: RDM6300 125kHz reader
- **Communication**: MQTT over WiFi
- **IDE**: Arduino IDE

### Infrastructure
- **Database**: PostgreSQL
- **Message Broker**: Eclipse Mosquitto (MQTT)
- **Orchestration**: Docker Compose
- **Deployment**: Railway (backend), Vercel (frontend)

## 📋 Quick Start Commands

### Development
```bash
# Install all dependencies
npm install

# Start backend development server
cd apps/backend && npm run dev

# Start frontend development server  
cd apps/frontend && npm run dev

# Start infrastructure (database + MQTT)
docker-compose -f infra/docker-compose.yml up -d
```

### Testing
```bash
# Run backend tests
cd apps/backend && npm test

# Run frontend tests
cd apps/frontend && npm test

# Run all tests
npm run test:all
```

### Production
```bash
# Build frontend
cd apps/frontend && npm run build

# Start production backend
cd apps/backend && npm start

# Deploy infrastructure
docker-compose -f infra/docker-compose.yml up -d
```

## 📝 Key Features

- **Real-time RFID tracking** with MQTT communication
- **Live analytics dashboard** with crowd metrics
- **User registration system** with location data
- **Card history tracking** and session management
- **Responsive web interface** with modern UI
- **Comprehensive testing suite** (100% test coverage)
- **Containerized deployment** ready for production
- **IoT device firmware** for RFID readers

## 🎯 Project Status

- ✅ **Backend API**: Complete with 50/50 tests passing
- ✅ **Frontend UI**: Complete with 16/16 tests passing  
- ✅ **Testing Infrastructure**: 100% coverage achieved
- ✅ **Documentation**: Comprehensive and organized
- ✅ **IoT Firmware**: Functional RFID reader code
- ✅ **Infrastructure**: Production-ready setup