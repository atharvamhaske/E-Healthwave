import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import PatientInfo from './components/PatientInfo';
import HospitalConnection from './components/HospitalConnection';
import InventoryManagement from './components/InventoryManagement';
import { Toaster } from 'react-hot-toast';
import socketIOClient from "socket.io-client";

const ENDPOINT = "http://localhost:5000"; // Replace with your backend endpoint

function App() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = socketIOClient(ENDPOINT);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("connect", () => {
        console.log("Connected to backend!");
      });

      socket.on("message", (data) => {
        console.log("Received message:", data);
        // Handle the message here (e.g., update state, display notification)
      });
    }
  }, [socket]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<PatientInfo />} />
            <Route path="/connections" element={<HospitalConnection />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
