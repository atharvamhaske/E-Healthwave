const express = require('express');
const router = express.Router();
const { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, query, where } = require('firebase-admin/firestore');

const db = getFirestore();

// API endpoint to send a connection request
router.post('/request', async (req, res) => {
  const { fromHospitalId, toHospitalId, description } = req.body;

  if (!fromHospitalId || !toHospitalId || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const requestId = `REQ-${Date.now()}`;

  try {
    // Store the connection request in Firestore
    await setDoc(doc(collection(db, 'hospital_connections')), {
      id: requestId,
      fromHospitalId,
      toHospitalId,
      description,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Connection request sent successfully', requestId });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// API endpoint to accept a connection request
router.post('/accept', async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Missing request ID' });
  }

  try {
    // Update the connection request status in Firestore
    const requestRef = doc(db, 'hospital_connections', requestId);
    await updateDoc(requestRef, {
      status: 'accepted',
    });

    res.json({ message: 'Connection request accepted successfully' });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    res.status(500).json({ error: 'Failed to accept connection request' });
  }
});

// API endpoint to reject a connection request
router.post('/reject', async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Missing request ID' });
  }

  try {
    // Update the connection request status in Firestore
    const requestRef = doc(db, 'hospital_connections', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
    });

    res.json({ message: 'Connection request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).json({ error: 'Failed to reject connection request' });
  }
});

module.exports = router;
