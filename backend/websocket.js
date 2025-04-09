const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected hospitals
const connectedHospitals = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      switch (data.type) {
        case 'register':
          handleHospitalRegistration(ws, data.hospital);
          break;
        case 'connectionRequest':
          handleConnectionRequest(data);
          break;
        case 'connectionAccepted':
          handleConnectionAccepted(data);
          break;
        case 'connectionRejected':
          handleConnectionRejected(data);
          break;
        case 'emergency':
          handleEmergency(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    }   catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  });

  ws.on('close', () => {
    handleHospitalDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleHospitalDisconnection(ws);
  });
});

function handleHospitalRegistration(ws, hospital) {
  // Store hospital connection
  connectedHospitals.set(hospital.id, {
    ws,
    hospital,
    connected: false
  });

  // Send updated hospital list to all connected hospitals
  broadcastHospitalList();

  // Send confirmation to the registering hospital
  ws.send(JSON.stringify({
    type: 'registrationConfirmed',
    hospital
  }));
}

function handleConnectionRequest(data) {
  const { fromHospitalId, toHospitalId } = data;
  const targetHospital = connectedHospitals.get(toHospitalId);

  if (targetHospital) {
    const sourceHospital = connectedHospitals.get(fromHospitalId);
    targetHospital.ws.send(JSON.stringify({
      type: 'connectionRequest',
      hospital: sourceHospital.hospital
    }));
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
    sourceHospital.ws.send(JSON.stringify({
      type: 'connectionAccepted',
      hospital: targetHospital.hospital
    }));

    targetHospital.ws.send(JSON.stringify({
      type: 'connectionAccepted',
      hospital: sourceHospital.hospital
    }));

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
      sourceHospital.ws.send(JSON.stringify({
        type: 'connectionRejected',
        hospital: targetHospital.hospital
      }));

      targetHospital.ws.send(JSON.stringify({
        type: 'connectionRejected',
        hospital: sourceHospital.hospital
      }));
    }
  }

function handleEmergency(data) {
    const { fromHospitalId, message } = data;
    const sourceHospital = connectedHospitals.get(fromHospitalId);

    if (sourceHospital) {
      // Broadcast emergency message to all connected hospitals
      connectedHospitals.forEach((hospital, hospitalId) => {
        if (hospital.ws.readyState === WebSocket.OPEN && hospitalId !== fromHospitalId) {
          hospital.ws.send(JSON.stringify({
            type: 'emergency',
            hospital: sourceHospital.hospital,
            message: message
          }));
        }
      });
    }
  }

function handleHospitalDisconnection(ws) {
  let disconnectedHospitalId = null;
  
  // Find and remove the disconnected hospital
  for (const [hospitalId, hospital] of connectedHospitals.entries()) {
    if (hospital.ws === ws) {
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
        hospital.ws.send(JSON.stringify({
          type: 'hospitalDisconnected',
          hospitalId: disconnectedHospitalId
        }));
      }
    }
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

  const message = JSON.stringify({
    type: 'hospitalList',
    hospitals: hospitalList
  });

  // Broadcast to all connected hospitals
  connectedHospitals.forEach(hospital => {
    if (hospital.ws.readyState === WebSocket.OPEN) {
      hospital.ws.send(message);
    }
  });
}

const PORT = process.env.WS_PORT || 5000;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
