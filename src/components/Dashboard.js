import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Assuming you use React Router for navigation
import axios from 'axios'; // Import axios for API calls
import io from 'socket.io-client'; // Import socket.io client

// Assuming backend runs on port 5000
const SOCKET_SERVER_URL = 'http://localhost:5000';

function Dashboard() {
  const [hospitalData, setHospitalData] = useState(null); // Initialize as null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Assuming the backend runs on the same host or is proxied
        // Adjust '/api/hospital/dashboard-data' if your endpoint is different
        const response = await axios.get('/api/hospital/dashboard-data');
        setHospitalData(response.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError('Failed to load dashboard data. Please refresh the page.');
        // Set some default structure on error to prevent render issues
        setHospitalData({
            name: 'Hospital', 
            id: 'N/A', 
            totalPatients: 0,
            beds: { 
              general: { available: 0, total: 0 }, 
              private: { available: 0, total: 0 }, 
              icu: { available: 0, total: 0 }, 
              emergency: { available: 0, total: 0 } 
            },
            doctors: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up WebSocket connection for real-time updates
    const socket = io(SOCKET_SERVER_URL);

    socket.on('connect', () => {
        console.log('Dashboard WebSocket connected:', socket.id);
        // Optional: Authenticate if your backend requires it after connection
        // const token = localStorage.getItem('authToken'); // Example: get token
        // if (token) {
        //     socket.emit('authenticate', token);
        // }
    });

    socket.on('dashboard_update', (updatedData) => {
        console.log('Received dashboard_update event for hospital:', updatedData.id);
        // Optional: Add logic to only update if the data is for the current hospital
        // if (updatedData.id === hospitalData?.id) { // Check if hospitalData exists
             setHospitalData(updatedData);
        // }
    });

    socket.on('connect_error', (err) => {
        console.error('Dashboard WebSocket connection error:', err);
        // Optionally set an error state to inform the user
        // setError('Real-time connection failed. Displayed data might be outdated.');
    });

    socket.on('disconnect', (reason) => {
        console.log('Dashboard WebSocket disconnected:', reason);
    });

    // Cleanup WebSocket on component unmount
    return () => {
        console.log('Disconnecting Dashboard WebSocket');
        socket.disconnect();
    };

  }, []); // Empty dependency array means this runs once on mount

  const renderBedCard = (type, data) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
      <h3 className="text-lg font-semibold text-gray-600 mb-2 capitalize">{type} Beds</h3>
      <p className="text-3xl font-bold text-green-600 mb-1">
        {data.available}<span className="text-gray-500 text-2xl">/{data.total}</span>
      </p>
      <p className="text-sm text-gray-500">Available/Total</p>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  // Ensure hospitalData is not null before rendering
  if (!hospitalData) {
      return <div className="p-8 text-center">No data available.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{hospitalData.name} Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(hospitalData.beds).map(([type, data]) => (
          <div key={type}>
            {renderBedCard(type, data)}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Total Patients</h2>
        <p className="text-3xl font-bold text-blue-600">{hospitalData.totalPatients}</p>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Doctors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitalData.doctors.map((doctor) => (
            <div key={doctor.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-semibold text-gray-800">{doctor.name}</h3>
              <p className="text-gray-600">{doctor.department}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Patient Button */}
      <div className="mb-8">
        {/* Link to the Add Patient form/page */}
        <Link to="/add-patient" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add New Patient
        </Link>
      </div>

      {/* Department-wise Doctor Availability Section (Placeholder) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Doctor Availability</h2>
          {hospitalData.doctors && hospitalData.doctors.length > 0 ? (
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Doctor Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {hospitalData.doctors.map((doctor) => (
                            <tr key={doctor.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {doctor.department}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {doctor.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        doctor.available
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                        {doctor.available ? 'Available' : 'Unavailable'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          ) : (
             <p className="text-gray-500">No doctor availability information currently.</p>
          )}
      </div>

    </div>
  );
}

export default Dashboard;
