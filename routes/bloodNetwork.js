const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get nearby donors
router.get('/nearby-donors', async (req, res) => {
  try {
    const { lat, lng, radius = 10, bloodType } = req.query;
    const donorsRef = db.collection('donors');
    
    let query = donorsRef;
    if (bloodType) {
      query = query.where('bloodType', '==', bloodType);
    }
    
    const snapshot = await query.get();
    const donors = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const distance = calculateDistance(
        lat,
        lng,
        data.location.latitude,
        data.location.longitude
      );
      
      if (distance <= radius) {
        donors.push({
          id: doc.id,
          ...data,
          distance
        });
      }
    });
    
    res.json(donors.sort((a, b) => a.distance - b.distance));
  } catch (error) {
    console.error('Error getting nearby donors:', error);
    res.status(500).json({ error: 'Failed to get nearby donors' });
  }
});

// Get nearby blood banks
router.get('/nearby-blood-banks', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const bloodBanksRef = db.collection('bloodBanks');
    const snapshot = await bloodBanksRef.get();
    const bloodBanks = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const distance = calculateDistance(
        lat,
        lng,
        data.location.latitude,
        data.location.longitude
      );
      
      if (distance <= radius) {
        bloodBanks.push({
          id: doc.id,
          ...data,
          distance
        });
      }
    });
    
    res.json(bloodBanks.sort((a, b) => a.distance - b.distance));
  } catch (error) {
    console.error('Error getting nearby blood banks:', error);
    res.status(500).json({ error: 'Failed to get nearby blood banks' });
  }
});

// Register as donor
router.post('/register-donor', async (req, res) => {
  try {
    const { name, bloodType, phone, email, location } = req.body;
    
    const donorRef = await db.collection('donors').add({
      name,
      bloodType,
      phone,
      email,
      location: new admin.firestore.GeoPoint(location.latitude, location.longitude),
      lastDonation: null,
      available: true,
      registeredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ id: donorRef.id, message: 'Successfully registered as donor' });
  } catch (error) {
    console.error('Error registering donor:', error);
    res.status(500).json({ error: 'Failed to register donor' });
  }
});

// Send message to donor
router.post('/send-message', async (req, res) => {
  try {
    const { donorId, message, senderId } = req.body;
    
    const messageRef = await db.collection('messages').add({
      donorId,
      senderId,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });
    
    // You could implement push notifications here
    
    res.json({ id: messageRef.id, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Update blood bank inventory
router.put('/blood-bank/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory } = req.body;
    
    await db.collection('bloodBanks').doc(id).update({
      inventory,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Inventory updated successfully' });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router; 