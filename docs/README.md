---
layout: home
permalink: index.html

# Please update this with your repository name and title
repository-name: e21-co227-RFID-Hardware-and-Tag-Lifecycle
title: RFID Tapping System - Production Ready Event Management Solution
---
# RFID-Based Visitor Tracking and Engagement System

## Team

- E/21/148, S. Ganathipan, [e21148@eng.pdn.ac.lk](mailto:e21148@eng.pdn.ac.lk)
- E/21/152, V.G. Amirsha, [e21152@eng.pdn.ac.lk](mailto:e21152@eng.pdn.ac.lk)
- E/21/214, K. Kartheepan, [e21214@eng.pdn.ac.lk](mailto:e21214@eng.pdn.ac.lk)
- E/21/220, S. Kavishanthan, [e21220@eng.pdn.ac.lk](mailto:e21220@eng.pdn.ac.lk)

## Supervisor

- Ms. Yasodha Vimukthi, [yasodhav@eng.pdn.ac.lk](mailto:yasodhav@eng.pdn.ac.lk)

## Table of Contents

1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Links](#links)

---

## Introduction

A complete RFID-based visitor tracking and engagement system for **EngEx 2025**. Powered by LF RFID + ESP-01 hardware, MQTT messaging, Node.js backend, PostgreSQL database, and React dashboards, delivering live analytics, scoring, and robust multi-booth tracking under heavy event traffic.

### Problem Statement

Large-scale university exhibitions struggle with:

- Real-time crowd monitoring and management
- Efficient visitor registration and tracking
- Engaging interactive experiences for attendees
- Data-driven insights for event optimization

### Our Solution

An integrated IoT system providing:

- **Instant RFID registration** with automated queue management
- **Real-time analytics** for crowd density and visitor flow
- **Interactive gaming** with live leaderboards and team scoring
- **Multi-zone tracking** across exhibition booths and clusters
- **Admin dashboard** for live event monitoring and control

## Solution Architecture

**Hardware Layer:**

- ESP8266 (ESP-01) + RDM6300 RFID readers deployed across exhibition zones
- WiFi connectivity with automatic reconnection and MQTT communication

**Communication Layer:**

- MQTT broker (Mosquitto) handling real-time message routing
- JSON message format for reliable data transmission

**Backend Services:**

- Node.js REST API with Express framework
- PostgreSQL database for data persistence and analytics
- Real-time WebSocket connections for live updates

**Frontend Applications:**

- React SPA with responsive design for mobile/desktop
- Live analytics dashboard with real-time crowd metrics
- Admin panel for system configuration and monitoring
- Interactive gaming interface with leaderboards

## Key Features

- **Real-time Visitor Tracking**: FIFO queue management for fair card processing and live status monitoring
- **Interactive Gaming**: Team scoring system with live leaderboards and achievement tracking
- **Live Analytics Dashboard**: Real-time crowd metrics, venue occupancy, and visitor flow analysis
- **Multi-Zone Support**: Scalable deployment across multiple exhibition areas and booths
- **Admin Control Panel**: Complete system configuration, monitoring, and management tools
- **IoT Integration**: Production-ready ESP8266 firmware with automatic WiFi reconnection
- **Mobile Responsive**: Cross-platform web interface optimized for tablets and smartphones

## Technology Stack

| Layer                       | Technologies                                         |
| --------------------------- | ---------------------------------------------------- |
| **Hardware**          | ESP8266 (ESP-01), RDM6300 125kHz RFID Reader         |
| **IoT Communication** | MQTT (Mosquitto), WiFi, JSON messaging               |
| **Backend**           | Node.js, Express.js, PostgreSQL, WebSocket           |
| **Frontend**          | React.js, Vite, TailwindCSS, Responsive Design       |
| **Testing**           | Jest, Vitest (99.9% backend, 100% frontend coverage) |

## Links

- [Project Repository](https://github.com/cepdnaclk/e21-co227-RFID-Hardware-and-Tag-Lifecycle)
- [Project Page](https://cepdnaclk.github.io/e21-co227-RFID-Hardware-and-Tag-Lifecycle/)
- [Complete Documentation](../README.md)
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/) 
- [University of Peradeniya](https://eng.pdn.ac.lk/)

---
*Developed for CO227 Computer Engineering Project, University of Peradeniya*