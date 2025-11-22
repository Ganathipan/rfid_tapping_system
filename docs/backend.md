---
layout: page
title: Backend Implementation
permalink: /backend/
---

<div class="markdown-body" data-aos="fade-up" markdown="1">

# Backend Implementation

The backend is the brain of the operation, orchestrating communication between hardware, database, and frontend. It is built with **Node.js** and **Express**, designed for high concurrency and low latency.

<div class="tech-stack">
  <span class="tech-badge">Node.js</span>
  <span class="tech-badge">Express</span>
  <span class="tech-badge">PostgreSQL</span>
  <span class="tech-badge">MQTT.js</span>
  <span class="tech-badge">Socket.IO</span>
</div>

## Core Services

### 1. MQTT Ingestion Service
This service subscribes to the Mosquitto broker and processes every incoming RFID tap.
- **Debouncing**: Prevents duplicate processing if a user holds their card against the reader.
- **Normalization**: Converts raw hardware payloads into standardized event objects.

### 2. Game Logic Engine
Calculates scores and achievements in real-time.
- **Rules Engine**: Configurable rules for points (e.g., "First visit = 10pts", "Group of 5 = 50pts").
- **Leaderboard**: Updates global rankings instantly upon score changes.

### 3. REST API
Provides endpoints for the frontend to fetch historical data and manage configuration.
- **Secure**: JWT-based authentication for admin routes.
- **Documented**: Full Swagger/OpenAPI documentation.

## Database Schema

The system uses **PostgreSQL** for reliable data storage.

```mermaid
erDiagram
    USERS ||--o{ TAPS : generates
    USERS {
        int id
        string name
        string rfid_tag
        int score
        timestamp created_at
    }
    TAPS {
        int id
        int user_id
        string portal_id
        timestamp tapped_at
    }
    PORTALS ||--o{ TAPS : captures
    PORTALS {
        string id
        string name
        string location
    }
```

## Testing Strategy
We maintain a high standard of code quality with over **99.9% test pass rate**.
- **Unit Tests**: For all utility functions and game logic.
- **Integration Tests**: For API endpoints and database interactions.
- **End-to-End Tests**: Simulating full user flows from tap to dashboard update.

</div>
