import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios'; // Import axios

// Fix for Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

function HospitalMap() {
  const [hospitals, setHospitals] = useState([]);
  const [socket, setSocket] = useState(null); // Assuming socket is managed in App.js

  useEffect(() => {
    // Fetch hospitals from the backend API
    const fetchHospitals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/hospitals'); // Use axios
        const data = response.data;
        if (Array.isArray(data)) {
          setHospitals(data);
        } else {
          console.error('Error: Data fetched from API is not an array', data);
        }
      } catch (error) {
        console.error('Error fetching hospitals:', error);
      }
    };

    fetchHospitals();

    // Connect to WebSocket (if not already connected)
    if (!socket) {
      // Assuming socket connection is established in App.js
      // and passed down as a prop
      // You might need to adjust this part based on your actual implementation
      // const newSocket = socketIOClient('http://localhost:5000');
      // setSocket(newSocket);
    }

    // Clean up WebSocket connection on unmount
    return () => {
      // if (socket) {
      //   socket.disconnect();
      // }
    };
  }, []);

  // Update hospital locations in real-time via WebSocket
  useEffect(() => {
    if (socket) {
      socket.on('hospitalLocationUpdate', (data) => {
        setHospitals((prevHospitals) =>
          prevHospitals.map((hospital) =>
            hospital.id === data.hospitalId ? { ...hospital, location: data.location } : hospital
          )
        );
      });
    }
  }, [socket]);

  return (
    <MapContainer center={[18.5204, 73.8567]} zoom={10} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {hospitals && Array.isArray(hospitals) && hospitals.map((hospital) => (
        <Marker key={hospital.id} position={[hospital.location.lat, hospital.location.lng]}>
          <Popup>
            {hospital.name} <br /> {hospital.contact}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default HospitalMap;
