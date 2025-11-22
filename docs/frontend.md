---
layout: page
title: Frontend Implementation
permalink: /frontend/
---

<div class="markdown-body" data-aos="fade-up">

# Frontend Implementation

The frontend is a modern, responsive Single Page Application (SPA) built with **React** and **Vite**. It serves as the primary interface for administrators, registration staff, and public displays.

<div class="tech-stack">
  <span class="tech-badge">React 18</span>
  <span class="tech-badge">Vite</span>
  <span class="tech-badge">TailwindCSS</span>
  <span class="tech-badge">Socket.IO Client</span>
  <span class="tech-badge">Recharts</span>
</div>

## Key Components

### 1. Live Dashboard
The heart of the system is the real-time dashboard. It uses WebSocket connections to display data as it happens, with zero page refreshes.
- **Crowd Analytics**: Live counters for total visitors and current occupancy.
- **Charts**: Dynamic line and bar charts showing tap velocity and hourly trends.
- **Recent Activity**: A live feed of the latest card taps.

### 2. Registration Portal
A streamlined interface for linking physical RFID cards to user profiles.
- **FIFO Queue Integration**: Automatically detects the last tapped "unknown" card.
- **Group Registration**: Supports registering entire groups/families in one go.
- **Validation**: Real-time form validation for data integrity.

### 3. Admin Panel
Comprehensive control over the entire system.
- **Device Management**: Monitor status of all connected RFID readers.
- **User Management**: Edit or delete user profiles.
- **System Config**: Update game rules and system settings on the fly.

## User Interface

<div class="carousel-container">
  <div class="carousel-slide active">
    <img src="{{ '/images/sample.png' | relative_url }}" alt="Dashboard View" style="width:100%">
    <div style="text-align: center; padding: 10px;">Live Analytics Dashboard</div>
  </div>
  <!-- Add more slides here if you have more images -->
</div>

## State Management
We use React Context and custom hooks to manage global state, particularly for:
- **WebSocket Connection**: Ensuring a single, persistent connection.
- **Auth State**: Managing admin session tokens.
- **Theme**: Toggling between dark and light modes.

</div>
