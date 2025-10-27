# Integration Testing Guide

## Overview
This document outlines the integration testing strategy for the RFID Tapping System. Integration tests verify that different components work together correctly.

## Test Structure

### Test Categories

#### 1. Database Integration Tests (`database.test.js`)
- **Purpose**: Test database connections, schema, and CRUD operations
- **Scope**: PostgreSQL integration, transaction handling, data integrity
- **Key Tests**:
  - Database connection verification
  - Table structure validation
  - CRUD operations with real data
  - Transaction rollback scenarios

#### 2. API Integration Tests (`api.test.js`)
- **Purpose**: Test REST API endpoints with real database
- **Scope**: HTTP requests/responses, data validation, error handling
- **Key Tests**:
  - Tag management operations
  - Participant CRUD operations
  - Game Lite admin functions
  - Authentication and authorization
  - Error response handling

#### 3. MQTT Integration Tests (`mqtt.test.js`)
- **Purpose**: Test RFID hardware communication via MQTT
- **Scope**: Message publishing/subscribing, data validation
- **Key Tests**:
  - MQTT broker connection
  - RFID scan message handling
  - Reader configuration updates
  - Message format validation

#### 4. End-to-End Workflow Tests (`workflows.test.js`)
- **Purpose**: Test complete user workflows across multiple components
- **Scope**: Multi-step processes, business logic validation
- **Key Tests**:
  - Complete registration workflow
  - Team formation and management
  - Game state transitions
  - Error recovery scenarios

## Test Environment Setup

### Prerequisites
1. **PostgreSQL Database**: Running instance for test data
2. **MQTT Broker**: Optional - tests handle graceful failure
3. **Environment Variables**: Test-specific configuration

### Database Setup
```sql
-- Test database should be created separately
CREATE DATABASE rfid_test;
-- Schema and seed data will be applied automatically
```

### Environment Configuration
Test environment uses `.env.test` file with:
- Separate test database
- Test-specific MQTT settings
- Reduced connection limits
- Test admin keys

## Running Integration Tests

### Commands
```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:coverage

# Watch mode for development
npm run test:integration:watch

# Run all tests (unit + integration)
npm run test:all
```

### Test Data Management
- **Before Each Test**: Clean slate with test data cleanup
- **After Each Test**: Automatic cleanup of test records
- **Global Setup**: Test database preparation
- **Global Teardown**: Connection cleanup

## Test Data Patterns

### Naming Conventions
- Test participants: `test_participant_*`
- Test teams: `test_team_*` 
- Test cards: `test_card_*`
- Test workflows: `test_workflow_*`

### Data Isolation
- Each test creates its own test data
- Cleanup ensures no test interference
- Database transactions for atomic operations

## Continuous Integration

### CI Pipeline Integration
```bash
# Production CI command
npm run test:ci
```

This command runs:
1. Unit tests with coverage
2. Integration tests with coverage
3. Generates combined coverage reports

### Docker Integration
Integration tests can run against:
- Local development database
- Docker Compose test environment
- CI-specific test containers

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify PostgreSQL is running
- Check DATABASE_URL configuration
- Ensure test database exists

#### MQTT Connection Failures
- MQTT tests gracefully skip if broker unavailable
- Check MQTT_URL configuration
- Verify broker is accessible

#### Test Timeouts
- Integration tests have 30-second timeout
- Increase timeout for slow environments
- Check database query performance

### Debug Mode
```bash
# Run with verbose output
npm run test:integration -- --verbose

# Run specific test file
npm run test:integration -- --testPathPattern=database.test.js

# Run with debugging
node --inspect-brk node_modules/.bin/jest --config jest.integration.config.js
```

## Coverage Goals

### Target Coverage
- **Database Operations**: >90%
- **API Endpoints**: >85%
- **MQTT Handlers**: >80%
- **Workflow Logic**: >95%

### Coverage Reports
- HTML reports in `coverage/integration/`
- LCOV format for CI integration
- Combined unit + integration coverage

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and atomic
- Avoid test interdependencies

### Data Management
- Always clean up test data
- Use unique identifiers
- Avoid hard-coded IDs
- Test with realistic data volumes

### Error Testing
- Test both success and failure paths
- Verify error messages and codes
- Test edge cases and boundary conditions
- Ensure graceful degradation

### Performance Considerations
- Monitor test execution time
- Optimize database queries
- Use connection pooling appropriately
- Consider parallel test execution

## Future Enhancements

### Planned Additions
1. **Load Testing**: High-volume concurrent operations
2. **Security Testing**: Authentication and authorization scenarios
3. **Performance Testing**: Response time validation
4. **Chaos Engineering**: Failure injection and recovery
5. **Cross-Browser Testing**: Frontend integration scenarios

### Integration with Frontend
- API contract testing
- End-to-end user journey validation
- Real browser automation
- Mobile device testing

## Monitoring and Alerting

### Test Metrics
- Test execution time trends
- Coverage percentage tracking
- Failure rate monitoring
- Resource usage patterns

### Alerts
- CI pipeline failures
- Coverage drops below threshold
- Test execution time increases
- Database connection issues