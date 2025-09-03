
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Placeholder components
function Dashboard() {
  return <div><h2>Crowd Dashboard</h2><p>View crowd in each slot/room.</p></div>;
}

function Login() {
  return <div><h2>Admin Login</h2><p>Login form for admins.</p></div>;
}

function AdminPanel() {
  return <div><h2>Admin Panel</h2><p>Manage users, slots, crowd limits, and card assignments.</p></div>;
}

function App() {
  return (
    <Router>
      <div className="App">
        <h1>RFID Exhibition Crowd Management</h1>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
