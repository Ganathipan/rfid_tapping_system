-- PostgreSQL schema for RFID Exhibition Crowd Management System

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    place VARCHAR(100),
    rfid_card_id VARCHAR(32),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    max_capacity INT DEFAULT 0
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    slot_id INT REFERENCES slots(id),
    action VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_assignments (
    id SERIAL PRIMARY KEY,
    rfid_card_id VARCHAR(32) NOT NULL,
    user_id INT REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
