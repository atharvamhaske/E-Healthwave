const io = require('socket.io-client');

const hospital1 = {
  id: 'hospital1',
  name: 'Hospital One',
  city: 'City One',
  contact: '123-456-7890',
  location: { lat: 0, lng: 0 }
};

const hospital2 = {
  id: 'hospital2',
  name: 'Hospital Two',
  city: 'City Two',
  contact: '987-654-3210',
  location: { lat: 1, lng: 1 }
};

async function testWebsocketEmergency() {
  try {
    console.log('Testing WebSocket Emergency System...\n');

    // Connect to WebSocket server
    const socket1 = io('http://localhost:5000');
    const socket2 = io('http://localhost:5000');

    // Check if hospital2 received the message
    socket2.on('emergency', (data) => {
      console.log('✓ Emergency message received by hospital2');
      console.log('Message:', data.message);
      console.log('From:', data.hospital.name);
      if (data.message === emergencyMessage && data.hospital.id === hospital1.id) {
        console.log('✓ Emergency message test completed successfully!');
      } else {
        console.error('✗ ERROR: Emergency message test failed!');
      }
      socket1.close();
      socket2.close();
      process.exit(0);
    });

    // Register hospitals
    socket1.emit('register', hospital1);
    socket2.emit('register', hospital2);

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send emergency message from hospital1
    const emergencyMessage = 'This is an emergency!';
    socket1.emit('emergency', {
      fromHospitalId: hospital1.id,
      message: emergencyMessage
    });

    // Wait for message to be delivered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // If message is not received within 5 seconds, fail the test
    setTimeout(() => {
      console.error('✗ ERROR: Emergency message not received within 5 seconds!');
      socket1.close();
      socket2.close();
      process.exit(1);
    }, 5000);

  } catch (error) {
    console.error('\nError during testing:', error.message);
    process.exit(1);
  }
}

testWebsocketEmergency();
