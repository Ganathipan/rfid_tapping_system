# RFID Tapping System - New Scoring Implementation

## Overview

This document describes the new scoring system that has been implemented to replace the previous scoring logic. The new system implements unique tapping logic with team-based scoring.

## Key Features

### 1. Unique Tapping Logic
- Each member can only tap into a cluster once per cluster
- Prevents duplicate scoring for the same cluster
- Maintains data integrity and fair scoring

### 2. Team-Based Scoring
- Teams are formed with multiple members
- When any member earns points, the team score is updated
- Team score = sum of all unique cluster taps of its members
- Scores are stored in the `teamscore` table

### 3. Exit Handling
- When a team exits (logs EXITOUT), their entry in the teamscore table is deleted
- Automatic cleanup prevents orphaned score records

## Database Schema Changes

### New Tables

#### `teamscore`
```sql
CREATE TABLE teamscore (
    registration_id INT PRIMARY KEY REFERENCES registration(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    last_update TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### `cluster_config`
```sql
CREATE TABLE cluster_config (
    id SERIAL PRIMARY KEY,
    cluster_name VARCHAR(50) UNIQUE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Updated Tables
- Renamed `team_points` to `teamscore` for consistency
- Added cluster configuration management

## API Endpoints

### New Endpoints

#### `POST /api/tags/tap`
Records a tap and updates team scoring.

**Request Body:**
```json
{
  "rfid": "string",
  "cluster": "string", 
  "portal": "string"
}
```

**Response:**
```json
{
  "success": true,
  "teamId": 123,
  "clusterPoints": 10,
  "totalPoints": 50
}
```

#### `GET /api/tags/status/:rfid`
Returns team score for a specific RFID.

**Response:**
```json
{
  "rfid": "string",
  "teamId": 123,
  "points": 50
}
```

#### `GET /api/admin/clusters`
Gets all cluster configurations.

**Response:**
```json
[
  {
    "cluster_name": "Cluster1",
    "points": 10
  }
]
```

#### `POST /api/admin/clusters`
Creates or updates cluster configurations.

**Request Body:**
```json
{
  "clusters": [
    {
      "name": "Cluster1",
      "points": 10
    }
  ]
}
```

#### `GET /api/admin/teams`
Gets all teams with their scores.

**Response:**
```json
[
  {
    "team_id": 123,
    "portal": "Portal1",
    "group_size": 4,
    "points": 50,
    "last_update": "2024-01-01T12:00:00Z",
    "member_count": 4
  }
]
```

## Frontend Components

### GamePortal.jsx
- Main interface for players to tap RFID cards
- Displays available clusters with point values
- Shows team score and tap history
- Handles tap recording and score checking

### AdminPanel.jsx
- Admin interface for managing cluster configurations
- View and manage team scores
- Add/remove clusters with custom point values
- Real-time score monitoring

## How It Works

### 1. Tap Recording Process
1. Player enters RFID and selects a cluster
2. System checks if RFID is assigned to a team
3. System verifies member hasn't tapped this cluster before
4. System records the tap in logs table
5. System retrieves cluster point value from configuration
6. System updates team score (adds points to existing total)
7. System returns success with updated team score

### 2. Team Score Calculation
- Team score is the sum of all unique cluster taps by team members
- Each cluster can only be counted once per member
- Scores are automatically updated on each valid tap

### 3. Exit Handling
- Background process monitors for EXITOUT logs
- When a team exits, all team members are released
- If team has no remaining members, team score is deleted
- Prevents orphaned score records

## Configuration

### Cluster Points
- Admins can configure cluster names and point values
- Points are stored in the `cluster_config` table
- Default sample data includes Cluster1 (10pts), Cluster2 (20pts), etc.

### Team Management
- Teams are created during registration process
- Members are assigned to teams via RFID cards
- Team scores are automatically managed

## Error Handling

### Common Error Cases
1. **RFID not assigned to team**: Returns 404 error
2. **Duplicate cluster tap**: Returns 409 error
3. **Invalid cluster**: Returns 400 error
4. **Database errors**: Returns 500 error

### Validation
- All required fields must be provided
- RFID must be assigned to a team
- Cluster must exist in configuration
- Points must be non-negative integers

## Testing

### Manual Testing Steps
1. Start the backend server
2. Start the frontend development server
3. Navigate to the Game Interface
4. Enter a valid RFID and select a cluster
5. Tap to record the score
6. Verify team score updates
7. Try tapping the same cluster again (should fail)
8. Test admin panel for cluster management

### Database Testing
1. Check `teamscore` table for updated scores
2. Verify `logs` table contains tap records
3. Confirm `cluster_config` table has cluster data
4. Test EXITOUT cleanup process

## Migration Notes

### Removed Components
- Old scoring service files
- Previous game portal components
- Old admin configuration system

### Preserved Components
- Registration system
- RFID hardware integration
- Basic portal selection
- Member assignment logic

## Future Enhancements

### Potential Improvements
1. Real-time score updates via WebSocket
2. Score history tracking
3. Advanced analytics and reporting
4. Mobile-responsive design improvements
5. Bulk cluster configuration import/export

### Performance Considerations
- Database indexes on frequently queried columns
- Connection pooling for database operations
- Caching for cluster configurations
- Background job processing for score updates

## Troubleshooting

### Common Issues
1. **Scores not updating**: Check database connection and transaction handling
2. **Duplicate tap errors**: Verify unique constraint logic
3. **Missing clusters**: Ensure cluster configuration is properly saved
4. **Team not found**: Verify RFID is properly assigned to a team

### Debug Information
- Check server logs for database errors
- Verify API endpoint responses
- Monitor database transaction logs
- Check frontend console for JavaScript errors

