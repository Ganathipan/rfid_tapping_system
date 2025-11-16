---
layout: home
permalink: index.html

# Please update this with your repository name and title
repository-name: e21-co227-RFID-Hardware-and-Tag-Lifecycle
title: RFID Tapping System - Production Ready Event Management Solution
---

<div align="center">

# 🎫 RFID Tapping System

### Production-Ready Event Management & Visitor Tracking

*Real-time analytics • Interactive gaming • IoT integration*

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)](https://github.com/cepdnaclk/e21-co227-RFID-Hardware-and-Tag-Lifecycle)
[![Tests](https://img.shields.io/badge/Tests-99.9%25%20Passing-brightgreen?style=flat-square)](https://github.com/cepdnaclk/e21-co227-RFID-Hardware-and-Tag-Lifecycle)
[![Coverage](https://img.shields.io/badge/Coverage-89.33%25-green?style=flat-square)](https://github.com/cepdnaclk/e21-co227-RFID-Hardware-and-Tag-Lifecycle)

</div>

---

<div align="center">

## 🎯 What is this?

An **intelligent RFID-based system** designed for large-scale events like exhibitions and conferences. It combines IoT hardware, real-time data processing, and interactive dashboards to transform how events track visitors, manage crowds, and engage attendees.

**Built for EngEx 2025** | University of Peradeniya

</div>

---

<div align="center">

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔄 Real-Time Tracking
- Instant RFID card detection
- Live visitor flow monitoring
- Multi-zone booth tracking
- FIFO queue management

</td>
<td width="50%">

### 📊 Smart Analytics
- Real-time crowd metrics
- Historical trend analysis
- Venue occupancy insights
- Visitor behavior patterns

</td>
</tr>
<tr>
<td width="50%">

### 🎮 Interactive Gaming
- Team-based scoring system
- Live leaderboards
- Achievement tracking
- Engagement rewards

</td>
<td width="50%">

### 🛠️ Admin Control
- System configuration panel
- Live event monitoring
- User management
- Complete data control

</td>
</tr>
</table>

</div>

---

<div align="center">

## 🏗️ How It Works

```mermaid
graph LR
    A[RFID Reader] -->|WiFi/MQTT| B[Message Broker]
    B -->|Real-time| C[Backend API]
    C -->|Store| D[Database]
    C -->|Updates| E[Live Dashboard]
    E -->|Control| C
```

1. **RFID readers** detect cards at registration, exits, and activity zones
2. **MQTT broker** routes messages in real-time across the system
3. **Backend API** processes events, updates database, and manages game logic
4. **Live dashboards** display analytics, leaderboards, and admin controls
5. **Interactive interface** engages visitors with games and feedback

</div>

---

<div align="center">

## 💻 Technology Stack

| Component | Technology |
|-----------|------------|
| **Hardware** | ESP8266 + RDM6300 RFID (125kHz) |
| **IoT** | MQTT (Mosquitto), WiFi, JSON |
| **Backend** | Node.js, Express, WebSocket |
| **Frontend** | React, Vite, TailwindCSS |
| **Database** | PostgreSQL |
| **Testing** | Jest, Vitest (1,455+ tests) |

</div>

---

<div align="center">

## 🚀 Quick Start

**One command deployment:**

```powershell
# Edit configuration (database password, etc.)
notepad deploy-local.ps1

# Deploy the entire system
.\deploy-local.ps1
```

**Access your system:**
- 🌐 **Dashboard**: http://localhost:5173
- 🔌 **API**: http://localhost:4000
- 💾 **Database**: localhost:5432
- 📡 **MQTT**: localhost:1883

> 📖 **Need more details?** Check the [complete documentation](../README.md) in the main repository.

</div>

---

<div align="center">

## 📊 System Highlights

- ✅ **Production Ready** - Fully tested and deployment-ready
- 🧪 **99.9% Test Success** - 1,455+ passing tests across all components  
- 📈 **89% Code Coverage** - Comprehensive test coverage
- 🔒 **Secure** - No hardcoded credentials, proper secret management
- 🎨 **Modern UI** - Responsive design for mobile and desktop
- ⚡ **Real-Time** - Live updates via WebSocket and MQTT
- 🔧 **Easy Setup** - Single-script automated deployment

</div>

---

<div align="center">

## 👥 Team

**University of Peradeniya - Department of Computer Engineering**

| Name | Email |
|------|-------|
| S. Ganathipan | [e21148@eng.pdn.ac.lk](mailto:e21148@eng.pdn.ac.lk) |
| V.G. Amirsha | [e21152@eng.pdn.ac.lk](mailto:e21152@eng.pdn.ac.lk) |
| K. Kartheepan | [e21214@eng.pdn.ac.lk](mailto:e21214@eng.pdn.ac.lk) |
| S. Kavishanthan | [e21220@eng.pdn.ac.lk](mailto:e21220@eng.pdn.ac.lk) |

**Supervisor:** Ms. Yasodha Vimukthi ([yasodhav@eng.pdn.ac.lk](mailto:yasodhav@eng.pdn.ac.lk))

</div>

---

<div align="center">

## 🔗 Links

- 📦 [**GitHub Repository**](https://github.com/cepdnaclk/e21-co227-RFID-Hardware-and-Tag-Lifecycle) - View source code
- 📖 [**Complete Documentation**](../README.md) - Detailed setup & API docs
- 🚀 [**Deployment Guide**](../DEPLOYMENT.md) - Step-by-step installation
- 🏛️ [**Department of Computer Engineering**](http://www.ce.pdn.ac.lk/)
- 🎓 [**University of Peradeniya**](https://eng.pdn.ac.lk/)

</div>

---

<div align="center">

## 🎓 Academic Context

**Course:** CO227 Computer Engineering Project  
**Institution:** University of Peradeniya  
**Year:** 2024-2025  
**Event:** EngEx 2025 - Engineering Exhibition

This project demonstrates the integration of IoT hardware, real-time systems, web technologies, and database management to solve real-world event management challenges.

</div>

---

<div align="center">

**Made with ❤️ for EngEx 2025**

*Transforming event experiences through intelligent RFID technology*

</div>