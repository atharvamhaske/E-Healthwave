const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Update CORS configuration
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Update Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 10000
});

// Store all registered hospitals (persistent storage)
let registeredHospitals = new Map();

// Store connected hospitals and their active requests
const connectedHospitals = new Map();
const activeRequests = new Map();

// Add hospital registration endpoint with error handling
app.post('/register-hospital', async (req, res) => {
  try {
    const hospitalData = req.body;
    if (!hospitalData || !hospitalData.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid hospital data' 
      });
    }
    
    registeredHospitals.set(hospitalData.id, hospitalData);
    console.log('New hospital registered:', hospitalData);
    
    res.json({ 
      success: true, 
      message: 'Hospital registered successfully',
      data: hospitalData 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get registered hospitals endpoint
app.get('/registered-hospitals', (req, res) => {
  const hospitals = Array.from(registeredHospitals.values());
  res.json(hospitals);
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Handle hospital connection
  socket.on('hospital_connected', (hospital) => {
    console.log('Hospital connected:', hospital.name, hospital.id);
    
    // Store hospital data with socket ID
    connectedHospitals.set(socket.id, {
      ...hospital,
      socketId: socket.id,
      status: 'online'
    });

    // Join hospital-specific room
    socket.join(`hospital_${hospital.id}`);
    socket.join('all_hospitals'); // Join broadcast room

    // Send existing active requests to newly connected hospital
    const existingRequests = Array.from(activeRequests.values());
    if (existingRequests.length > 0) {
      socket.emit('existing_requests', existingRequests);
    }

    // Broadcast updated hospital list
    broadcastHospitalList();
  });

  // Handle emergency requests
  socket.on('send_request', ({ to, request }) => {
    const fromHospital = connectedHospitals.get(socket.id);
    if (!fromHospital) {
      console.log('Hospital not found for socket:', socket.id);
      return;
    }

    console.log('Processing request from:', fromHospital.name);
    
    // Store the request with the sender's information
    const enrichedRequest = {
      ...request,
      from: fromHospital,
      timestamp: new Date().toISOString()
    };
    activeRequests.set(request.id, enrichedRequest);

    // Broadcast to all hospitals in the broadcast room
    socket.to('all_hospitals').emit('request_received', {
      request: enrichedRequest,
      from: fromHospital
    });

    // Send confirmation back to sender
    socket.emit('request_sent_confirmation', {
      request: enrichedRequest
    });

    console.log('Request broadcast complete. Active requests:', activeRequests.size);
  });

  // Handle request acceptance
  socket.on('accept_request', ({ requestId, to, hospital }) => {
    const fromHospital = connectedHospitals.get(socket.id);
    if (!fromHospital) return;

    console.log('Request accepted by:', fromHospital.name);

    // Update request status
    const request = activeRequests.get(requestId);
    if (request) {
      request.status = 'accepted';
      request.acceptedBy = fromHospital;
      request.acceptedAt = new Date().toISOString();

      // Notify all hospitals about the status update
      io.to('all_hospitals').emit('request_status_updated', {
        requestId,
        status: 'accepted',
        acceptedBy: fromHospital
      });

      // Notify the requesting hospital specifically
      io.to(`hospital_${to}`).emit('request_accepted', {
        requestId,
        hospital: fromHospital
      });
    }
  });

  // Handle messages
  socket.on('send_message', ({ to, message }) => {
    const fromHospital = connectedHospitals.get(socket.id);
    if (!fromHospital) return;

    const enrichedMessage = {
      ...message,
      from: fromHospital,
      timestamp: new Date().toISOString()
    };

    // Send to specific hospital room
    io.to(`hospital_${to}`).emit('message_received', enrichedMessage);
    
    // Also send confirmation to sender
    socket.emit('message_sent_confirmation', enrichedMessage);
  });

  // Handle video calls
  socket.on('call_initiate', ({ to, from, signal }) => {
    io.to(`hospital_${to}`).emit('call_incoming', { from, signal });
  });

  socket.on('call_accept', ({ to, signal }) => {
    const fromHospital = connectedHospitals.get(socket.id);
    if (fromHospital) {
      io.to(`hospital_${to}`).emit('call_accepted', {
        signal,
        hospital: fromHospital
      });
    }
  });

  socket.on('call_reject', ({ to, from }) => {
    io.to(`hospital_${to}`).emit('call_rejected', { from });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const hospital = connectedHospitals.get(socket.id);
    if (hospital) {
      console.log('Hospital disconnected:', hospital.name);
      socket.leave(`hospital_${hospital.id}`);
      socket.leave('all_hospitals');
      connectedHospitals.delete(socket.id);
      broadcastHospitalList();
    }
  });
});

// Helper function to broadcast hospital list
function broadcastHospitalList() {
  const onlineHospitals = Array.from(connectedHospitals.values())
    .map(({ socketId, ...hospital }) => ({
      ...hospital,
      isOnline: true
    }));

  // Combine with registered hospitals that are offline
  const allHospitals = Array.from(registeredHospitals.values())
    .map(hospital => {
      const isOnline = onlineHospitals.some(h => h.id === hospital.id);
      return {
        ...hospital,
        isOnline
      };
    });
  
  console.log('Broadcasting updated hospital list:', allHospitals.length, 'hospitals');
  io.emit('hospitals_updated', allHospitals);
}

// Clean up old requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, request] of activeRequests) {
    const requestTime = new Date(request.timestamp).getTime();
    if (now - requestTime > 24 * 60 * 60 * 1000) { // 24 hours
      activeRequests.delete(id);
    }
  }
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 