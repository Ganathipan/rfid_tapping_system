# Integration Tests Structure

This directory contains comprehensive integration tests for the RFID Tapping System backend.

## 📁 Directory Structure

```
integration/
├── 📁 core/                    # Core system tests
│   ├── database.test.js        # Database connectivity & CRUD operations (7 tests)
│   └── api.test.js            # API endpoint integration tests (9 tests)
├── 📁 routes/                  # Route-specific integration tests
│   ├── routes.test.js         # General routing tests (33 tests)
│   ├── exitout-routes.test.js # Exit-out specific routes (31 tests)
│   ├── reader1-cluster-kiosk.test.js # Kiosk reader tests (25 tests)
│   └── post-internal.test.js  # Internal POST endpoints (20 tests)
├── 📁 services/                # Service layer integration tests
│   ├── services.test.js       # Service integration tests (29 tests)
│   ├── service-layer.test.js  # Service layer functionality (29 tests)
│   ├── stats-controller.test.js # Statistics controller (19 tests)
│   └── workflows.test.js      # Workflow integration tests (6 tests)
├── 📁 hardware/                # Hardware-related integration tests
│   └── rfid-hardware.test.js  # RFID hardware communication (31 tests)
├── 📁 realtime/                # Real-time system tests
│   ├── realtime.test.js       # Real-time functionality (25 tests)
│   └── mqtt.test.js           # MQTT messaging tests (8 tests)
├── 📁 utils/                   # Utility and helper tests
│   ├── utilities.test.js      # Utility functions (21 tests)
│   ├── setup.js              # Test setup and teardown utilities
│   └── env-setup.js           # Environment setup and mocking
└── README.md                   # This documentation file
```

## 🧪 Test Categories

### Core Tests (16 tests)
- **Database Integration**: Connection, schema validation, CRUD operations
- **API Integration**: Core API endpoint functionality and response validation

### Route Tests (109 tests)
- **General Routes**: Route handling, middleware, and request processing
- **Exit-out Routes**: Specialized exit-out functionality and workflows
- **Kiosk Routes**: Reader cluster and kiosk-specific endpoints
- **Internal Routes**: Internal API endpoints and post-processing

### Service Tests (83 tests)
- **Service Layer**: Business logic and service integration
- **Statistics**: Analytics and reporting functionality
- **Workflows**: Complex multi-step process integration

### Hardware Tests (31 tests)
- **RFID Hardware**: Hardware communication, tag reading, and processing

### Real-time Tests (33 tests)
- **Real-time System**: Live updates and event processing
- **MQTT Integration**: Message queuing and real-time communication

### Utility Tests (21 tests)
- **Helper Functions**: Utility functions and common operations
- **Test Infrastructure**: Setup, teardown, and test environment management

## 🚀 Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Category-Specific Tests
```bash
# Core system tests
npm run test:integration -- --testPathPattern="core/"

# Route-specific tests
npm run test:integration -- --testPathPattern="routes/"

# Service layer tests
npm run test:integration -- --testPathPattern="services/"

# Hardware integration tests
npm run test:integration -- --testPathPattern="hardware/"

# Real-time system tests
npm run test:integration -- --testPathPattern="realtime/"

# Utility and helper tests
npm run test:integration -- --testPathPattern="utils/"
```

### Run Individual Test Files
```bash
# Database tests
npm run test:integration -- core/database.test.js

# RFID hardware tests
npm run test:integration -- hardware/rfid-hardware.test.js

# MQTT tests
npm run test:integration -- realtime/mqtt.test.js
```

## 📊 Test Statistics

- **Total Tests**: 293 integration tests
- **Test Files**: 14 organized test files
- **Coverage**: Comprehensive integration testing across all system components
- **Success Rate**: 100% (293/293 passing)

## 🔧 Test Environment

- **Database**: PostgreSQL with comprehensive mocking system
- **Messaging**: MQTT with event simulation
- **HTTP**: Supertest for API endpoint testing
- **Setup**: Automated test environment configuration

## 📝 Adding New Tests

When adding new integration tests:

1. **Identify the category**: Determine which folder the test belongs to
2. **Follow naming conventions**: Use descriptive test names with proper grouping
3. **Use shared utilities**: Leverage `utils/setup.js` and `utils/env-setup.js`
4. **Maintain organization**: Keep tests focused and appropriately categorized
5. **Update documentation**: Update this README when adding new test categories

## 🛠️ Test Infrastructure

- **`utils/setup.js`**: Global test setup and teardown
- **`utils/env-setup.js`**: Database mocking and environment configuration
- **Jest Configuration**: `jest.integration.config.js` in project root
- **Shared Utilities**: Common test helpers and mock data generators