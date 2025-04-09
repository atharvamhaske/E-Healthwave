require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const jwt = require('jsonwebtoken');
const Hospital = require('./models/hospital');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Enable CORS
app.use(cors());
app.use(express.json());

// Store connected hospitals
const connectedHospitals = new Map();

// Google Authentication Middleware
const verifyGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    req.user = payload;
    next();
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Google Authentication Routes
app.post('/api/auth/google', verifyGoogleToken, async (req, res) => {
  try {
    const { email, name, picture } = req.user;
    
    // Check if hospital already exists
    let hospital = await Hospital.findOne({ email });
    
    if (!hospital) {
      // Create new hospital
      hospital = new Hospital({
        email,
        name,
        profilePicture: picture,
        isGoogleAuth: true
      });
      await hospital.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { hospitalId: hospital._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        profilePicture: hospital.profilePicture
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Regular Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, city, contact } = req.body;
    
    // Check if hospital already exists
    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      return res.status(400).json({ error: 'Hospital already exists' });
    }

    // Create new hospital
    const hospital = new Hospital({
      name,
      email,
      password, // Note: In production, hash the password before saving
      city,
      contact,
      isGoogleAuth: false
    });

    await hospital.save();

    // Generate JWT token
    const token = jwt.sign(
      { hospitalId: hospital._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find hospital
    const hospital = await Hospital.findOne({ email });
    if (!hospital) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password (Note: In production, use proper password comparison)
    if (hospital.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { hospitalId: hospital._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New Socket.IO connection');

  socket.on('register', (hospital) => {
    handleHospitalRegistration(socket, hospital);
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

  socket.on('send_request', (data) => {
    handleEmergencyRequest(data);
  });

  socket.on('accept_request', (data) => {
    handleRequestAcceptance(data);
  });

  socket.on('send_message', (data) => {
    handleMessage(data);
  });

  socket.on('disconnect', () => {
    handleHospitalDisconnection(socket);
  });
});

function handleHospitalRegistration(socket, hospital) {
  // Store hospital connection
  connectedHospitals.set(hospital.id, {
    socket,
    hospital,
    connected: false
  });

  // Send updated hospital list to all connected hospitals
  broadcastHospitalList();

  // Send confirmation to the registering hospital
  socket.emit('registrationConfirmed', { hospital });
}

function handleConnectionRequest(data) {
  const { fromHospitalId, toHospitalId } = data;
  const targetHospital = connectedHospitals.get(toHospitalId);

  if (targetHospital) {
    const sourceHospital = connectedHospitals.get(fromHospitalId);
    targetHospital.socket.emit('connectionRequest', {
      hospital: sourceHospital.hospital
    });
  }
}

function handleConnectionAccepted(data) {
  const { fromHospitalId, toHospitalId } = data;
  const sourceHospital = connectedHospitals.get(fromHospitalId);
  const targetHospital = connectedHospitals.get(toHospitalId);

  if (sourceHospital && targetHospital) {
    // Update connection status
    sourceHospital.connected = true;
    targetHospital.connected = true;

    // Notify both hospitals
    sourceHospital.socket.emit('connectionAccepted', {
      hospital: targetHospital.hospital
    });

    targetHospital.socket.emit('connectionAccepted', {
      hospital: sourceHospital.hospital
    });

    // Broadcast updated hospital list
    broadcastHospitalList();
  }
}

function handleConnectionRejected(data) {
  const { fromHospitalId, toHospitalId } = data;
  const sourceHospital = connectedHospitals.get(fromHospitalId);
  const targetHospital = connectedHospitals.get(toHospitalId);

  if (sourceHospital && targetHospital) {
    // Notify both hospitals
    sourceHospital.socket.emit('connectionRejected', {
      hospital: targetHospital.hospital
    });

    targetHospital.socket.emit('connectionRejected', {
      hospital: sourceHospital.hospital
    });
  }
}

function handleHospitalDisconnection(socket) {
  let disconnectedHospitalId = null;
  
  // Find and remove the disconnected hospital
  for (const [hospitalId, hospital] of connectedHospitals.entries()) {
    if (hospital.socket === socket) {
      disconnectedHospitalId = hospitalId;
      connectedHospitals.delete(hospitalId);
      break;
    }
  }

  if (disconnectedHospitalId) {
    // Notify all connected hospitals about the disconnection
    broadcastHospitalList();
    
    // Notify connected hospitals about the disconnection
    for (const [hospitalId, hospital] of connectedHospitals.entries()) {
      if (hospital.connected) {
        hospital.socket.emit('hospitalDisconnected', {
          hospitalId: disconnectedHospitalId
        });
      }
    }
  }
}

function handleEmergencyRequest(data) {
  const { to, request } = data;
  
  if (to === 'broadcast') {
    // Broadcast to all connected hospitals
    connectedHospitals.forEach(hospital => {
      if (hospital.socket.connected) {
        hospital.socket.emit('new_request', request);
      }
    });
  } else {
    // Send to specific hospital
    const targetHospital = connectedHospitals.get(to);
    if (targetHospital && targetHospital.socket.connected) {
      targetHospital.socket.emit('new_request', request);
    }
  }
}

function handleRequestAcceptance(data) {
  const { requestId, to, hospital } = data;
  const targetHospital = connectedHospitals.get(to);
  
  if (targetHospital && targetHospital.socket.connected) {
    targetHospital.socket.emit('request_accepted', {
      requestId,
      hospital
    });
  }
}

function handleMessage(data) {
  const { to, message } = data;
  const targetHospital = connectedHospitals.get(to);
  
  if (targetHospital && targetHospital.socket.connected) {
    targetHospital.socket.emit('new_message', message);
  }
}

function broadcastHospitalList() {
  const hospitalList = Array.from(connectedHospitals.values()).map(h => ({
    id: h.hospital.id,
    name: h.hospital.name,
    city: h.hospital.city,
    contact: h.hospital.contact,
    location: h.hospital.location,
    connected: h.connected
  }));

  // Broadcast to all connected hospitals
  connectedHospitals.forEach(hospital => {
    if (hospital.socket.connected) {
      hospital.socket.emit('hospitalList', { hospitals: hospitalList });
    }
  });
}

// API Routes
app.post('/api/hospitals/register', (req, res) => {
  const { hospital } = req.body;
  // Handle hospital registration
  res.json({ success: true, message: 'Hospital registered successfully' });
});

app.get('/api/hospitals', (req, res) => {
  const hospitalList = Array.from(connectedHospitals.values()).map(h => ({
    id: h.hospital.id,
    name: h.hospital.name,
    city: h.hospital.city,
    contact: h.hospital.contact,
    location: h.hospital.location,
    connected: h.connected
  }));
  res.json(hospitalList);
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 