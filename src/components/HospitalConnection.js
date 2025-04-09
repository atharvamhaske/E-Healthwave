import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ToastContainer, toast } from 'react-toastify';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create socket instance outside component
const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Add connection status tracking
let isConnecting = false;
let registrationRetries = 0;
const MAX_RETRIES = 3;

function HospitalConnection() {
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRequests, setActiveRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('emergency');
  const [requestDetails, setRequestDetails] = useState({
    type: 'emergency',
    urgency: 'high',
    description: '',
    requiredBloodGroup: '',
    organType: '',
    patientCondition: '',
    transportationNeeded: false
  });
  const [videoCall, setVideoCall] = useState({
    isActive: false,
    peerId: null,
    stream: null
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const peerRef = useRef();
  const videoRef = useRef();

  // Get current hospital details
  const currentHospital = {
    id: localStorage.getItem('hospitalId'),
    name: localStorage.getItem('hospitalName'),
    city: localStorage.getItem('hospitalCity'),
    contact: localStorage.getItem('hospitalContact'),
    location: JSON.parse(localStorage.getItem('hospitalLocation') || '{"lat": 0, "lng": 0}')
  };

  useEffect(() => {
    // Socket.IO event listeners
    socket.on('connect', () => {
      console.log('Socket.IO Connected');
      setConnectionStatus('connected');
      setError(null);
      
      // Send hospital registration data
      socket.emit('register', currentHospital);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO Disconnected');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO Connection Error:', error);
      setConnectionStatus('error');
      setError('Connection error occurred');
    });

    socket.on('hospitalList', (data) => {
      setHospitals(data.hospitals);
    });

    socket.on('newHospital', (data) => {
      setHospitals(prev => [...prev, data.hospital]);
    });

    socket.on('hospitalDisconnected', (data) => {
      setHospitals(prev => prev.filter(h => h.id !== data.hospitalId));
    });

    socket.on('connectionRequest', (data) => {
      handleConnectionRequest(data);
    });

    socket.on('connectionAccepted', (data) => {
      handleConnectionAccepted(data);
    });

    socket.on('connectionRejected', (data) => {
      handleConnectionRejected(data);
    });

    socket.on('new_request', (request) => {
      setActiveRequests(prev => [...prev, request]);
    });

    socket.on('request_accepted', (data) => {
      setActiveRequests(prev =>
        prev.map(req =>
          req.id === data.requestId ? { ...req, status: 'accepted' } : req
        )
      );
    });

    socket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('emergency', (data) => {
      toast.error(`Emergency from ${data.hospital.name}: ${data.message}`);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('hospitalList');
      socket.off('newHospital');
      socket.off('hospitalDisconnected');
      socket.off('connectionRequest');
      socket.off('connectionAccepted');
      socket.off('connectionRejected');
      socket.off('new_request');
      socket.off('request_accepted');
      socket.off('new_message');
      socket.off('emergency');
    };
  }, []);

  const handleConnectionRequest = (data) => {
    // Show connection request notification
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                Connection Request
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {data.hospital.name} wants to connect with your hospital
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => handleConnectionResponse(data.hospital.id, true)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none"
          >
            Accept
          </button>
          <button
            onClick={() => handleConnectionResponse(data.hospital.id, false)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
          >
            Reject
          </button>
        </div>
      </div>
    ));
  };

  const handleConnectionResponse = (hospitalId, accepted) => {
    socket.emit(accepted ? 'connectionAccepted' : 'connectionRejected', {
      fromHospitalId: currentHospital.id,
      toHospitalId: hospitalId
    });
  };

  const handleConnectionAccepted = (data) => {
    toast.success(`Connected with ${data.hospital.name}`);
    // Update connected hospitals list
    setHospitals(prev => 
      prev.map(h => 
        h.id === data.hospital.id 
          ? { ...h, connected: true }
          : h
      )
    );
  };

  const handleConnectionRejected = (data) => {
    toast.error(`Connection request rejected by ${data.hospital.name}`);
  };

  const requestConnection = (hospitalId) => {
    socket.emit('connectionRequest', {
      fromHospitalId: currentHospital.id,
      toHospitalId: hospitalId
    });
    toast.success('Connection request sent');
  };

  const getUrgencyStyle = (urgency = 'medium') => {
    switch(urgency.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const handleHospitalSelect = (hospital) => {
    if (!hospital) return toast.error('Select a valid hospital');
    setSelectedHospital(hospital);
    socket.emit('hospital_connect', hospital);
    toast.success(`Connected to ${hospital.name}`);
  };

  const handleSendEmergency = () => {
    const message = prompt('Enter emergency message:');
    if (message) {
      socket.emit('emergency', {
        fromHospitalId: currentHospital.id,
        message
      });
      toast.info('Sending emergency message...');
    }
  };

  const handleSendEmergencyMessage = (e) => {
    e.preventDefault();
    if (!currentHospital.id) {
      toast.error('Please log in to send requests');
      return;
    }

    const newRequest = {
      id: Date.now(),
      hospitalId: 'broadcast',
      type: requestType,
      urgency: requestDetails.urgency || 'medium',
      ...requestDetails,
      timestamp: new Date().toISOString(),
      status: 'pending',
      from: currentHospital
    };

    console.log('Sending request:', newRequest);

    socket.emit('send_request', {
      to: 'broadcast',
      request: newRequest
    });

    toast.info('Sending emergency request...');
    setShowRequestModal(false);
  };

  const handleAcceptRequest = (requestId) => {
    if (!currentHospital) {
      toast.error('Please select your hospital first');
      return;
    }

    const request = activeRequests.find(req => req.id === requestId);
    if (!request) {
      toast.error('Request not found');
      return;
    }

    // Check if request.from exists
    if (!request.from || !request.from.id) {
      toast.error('Invalid request data: Missing sender information');
      return;
    }

    socket.emit('accept_request', {
      requestId,
      to: request.from.id,
      hospital: currentHospital
    });

    setSelectedHospital(request.from);
    setActiveRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: 'accepted' } : req
      )
    );
    setShowChatModal(true);
    toast.success('Request accepted! Chat channel opened.');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedHospital) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      timestamp: new Date().toISOString(),
      from: currentHospital
    };

    socket.emit('send_message', {
      to: selectedHospital.id,
      message
    });

    setNewMessage('');
  };

  const initiateVideoCall = async (hospitalId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream
      });

      peer.on('signal', (signal) => {
        socket.emit('call_initiate', {
          to: hospitalId,
          from: currentHospital,
          signal
        });
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
      });

      peerRef.current = peer;
      setVideoCall({
        isActive: true,
        peerId: hospitalId,
        stream
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Could not access camera or microphone');
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream
      });

      peer.on('signal', (signal) => {
        socket.emit('call_accept', {
          to: incomingCall.from.id,
          signal
        });
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
      });

      peer.signal(incomingCall.signal);
      peerRef.current = peer;
      setVideoCall({
        isActive: true,
        peerId: incomingCall.from.id,
        stream
      });
      setIncomingCall(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Could not access camera or microphone');
    }
  };

  const rejectCall = () => {
    socket.emit('call_reject', {
      to: incomingCall.from.id,
      from: currentHospital
    });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setVideoCall({
      isActive: false,
      peerId: null,
      stream: null
    });
    setLocalStream(null);
    setRemoteStream(null);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Hospital Network Hub</h1>
            <p className="text-gray-600">Connected as: {currentHospital.name}</p>
            <p className="text-gray-600">ID: {currentHospital.id}</p>
            <p className="text-gray-600">City: {currentHospital.city}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Connected Hospitals: {hospitals.length}</p>
            <p className="text-sm text-gray-600">All hospitals can see your emergency requests</p>
            <button
              onClick={handleSendEmergency}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Send Emergency Message
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Active Requests Dashboard */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Active Requests</h2>
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            New Request
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyStyle(request.urgency)}`}>
                  {(request.urgency || 'MEDIUM').toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {request.status.toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                {request.type === 'blood' ? `Blood Request: ${request.bloodGroup || 'Any'}` :
                 request.type === 'organ' ? `Organ Request: ${request.organType || 'Not specified'}` :
                 'Emergency Assistance'}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{request.description || 'No description provided'}</p>
              <div className="text-xs text-gray-500 mb-3">
                {new Date(request.timestamp).toLocaleString()}
              </div>
              {request.status === 'pending' && (
                <button
                  onClick={() => handleAcceptRequest(request.id)}
                  className="w-full bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                >
                  Accept Request
                </button>
              )}
              {request.status === 'accepted' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowChatModal(true)}
                    className="flex-1 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                  >
                    Open Chat
                  </button>
                  <button
                    onClick={() => initiateVideoCall(request.hospitalId)}
                    className="flex-1 bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 text-sm"
                  >
                    Video Call
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Hospitals Map */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Nearby Hospitals</h2>
        {userLocation && hospitals.length > 0 ? (
          <MapContainer
            center={userLocation}
            zoom={10}
            style={{ height: '400px', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* User's location marker */}
            <Marker position={userLocation}>
              <Popup>
                <div>
                  <h3 className="font-bold">Your Hospital</h3>
                  <p className="text-sm text-gray-600">Current Position</p>
                </div>
              </Popup>
            </Marker>

            {/* Hospital markers */}
            {hospitals.map((hospital) => (
                <Marker
                  key={hospital.id}
                  position={[hospital.location.lat, hospital.location.lng]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">{hospital.name}</h3>
                      <p className="text-sm mb-1"><strong>City:</strong> {hospital.city}</p>
                      <p className="text-sm mb-1"><strong>Contact:</strong> {hospital.contact}</p>
                      <p className="text-sm mb-1">
                        <strong>Available Beds:</strong> {hospital.availableBeds} (ICU: {hospital.icuBeds})
                      </p>
                      <div className="mt-2">
                        <button
                          onClick={() => handleHospitalSelect(hospital)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        ) : (
          <p className="text-gray-500">Loading map...</p>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Request</h2>
          <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-500 hover:text-gray-700"
          >
                ✕
          </button>
            </div>

            <form onSubmit={handleSendEmergencyMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Request Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="emergency">Emergency Assistance</option>
                  <option value="blood">Blood Requirement</option>
                  <option value="organ">Organ Transplant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Urgency Level</label>
                <select
                  value={requestDetails.urgency}
                  onChange={(e) => setRequestDetails({...requestDetails, urgency: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
      </div>

              {requestType === 'blood' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Blood Group Required</label>
                  <select
                    value={requestDetails.requiredBloodGroup}
                    onChange={(e) => setRequestDetails({...requestDetails, requiredBloodGroup: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              )}

              {requestType === 'organ' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organ Type</label>
                  <select
                    value={requestDetails.organType}
                    onChange={(e) => setRequestDetails({...requestDetails, organType: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Organ Type</option>
                    <option value="kidney">Kidney</option>
                    <option value="liver">Liver</option>
                    <option value="heart">Heart</option>
                    <option value="lungs">Lungs</option>
                    <option value="pancreas">Pancreas</option>
                  </select>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Patient Condition</label>
                <textarea
                  value={requestDetails.patientCondition}
                  onChange={(e) => setRequestDetails({...requestDetails, patientCondition: e.target.value})}
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Describe patient's current condition and requirements..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Details</label>
                <textarea
                  value={requestDetails.description}
                  onChange={(e) => setRequestDetails({...requestDetails, description: e.target.value})}
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Any additional information..."
                ></textarea>
          </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="transportation"
                  checked={requestDetails.transportationNeeded}
                  onChange={(e) => setRequestDetails({...requestDetails, transportationNeeded: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="transportation" className="ml-2 block text-sm text-gray-700">
                  Transportation assistance needed
                </label>
      </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Chat with {selectedHospital.name}</h2>
                <p className="text-sm text-gray-600">
                  {selectedHospital.city} • {selectedHospital.contact}
                </p>
      </div>
            <button
                onClick={() => {
                  setShowChatModal(false);
                  setMessages([]);
                }}
                className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

            {/* Video Call Section */}
            {videoCall.isActive && (
              <div className="mb-4 bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white">Video Call</h3>
                  <button
                    onClick={endCall}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    End Call
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full rounded"
                    />
                    <p className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                      You
                    </p>
                  </div>
                  {remoteStream && (
                    <div className="relative">
                      <video
                        autoPlay
                        playsInline
                        className="w-full rounded"
                        ref={remote => {
                          if (remote) remote.srcObject = remoteStream;
                        }}
                      />
                      <p className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        {selectedHospital.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Incoming Call Alert */}
            {incomingCall && (
              <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-lg font-semibold">
                  Incoming call from {incomingCall.from.name}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {incomingCall.from.city} • {incomingCall.from.contact}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={acceptCall}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={rejectCall}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-lg p-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`mb-2 ${
                    message.from.id === currentHospital.id
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg px-4 py-2 max-w-xs ${
                      message.from.id === currentHospital.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <div className="flex items-center justify-between text-xs mt-1 opacity-75">
                      <span>{message.from.name}</span>
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
              </div>
            ))}
          </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalConnection;
