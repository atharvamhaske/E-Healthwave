const express = require('express');
const { db } = require('../firebase');
const router = express.Router();
const { generateBill } = require('../utils/billGenerator');
const path = require('path');

router.get('/dashboard', async (req, res) => {
  const patients = await db.collection('patients').get();
  const doctors = await db.collection('doctors').get();
  const revenue = await db.collection('revenue').get();
  res.json({ patients: patients.docs.length, doctors: doctors.docs.length, revenue });
});

router.get('/patient/:id', async (req, res) => {
  const patient = await db.collection('patients').doc(req.params.id).get();
  res.json(patient.data());
});

// Generate bill PDF
router.post('/generate-bill', async (req, res) => {
  try {
    const { patientId, billNo, services } = req.body;
    
    // Get patient details
    const patientDoc = await db.collection('patients').doc(patientId).get();
    const patient = patientDoc.data();

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Calculate total amount
    const totalAmount = services.reduce((sum, service) => sum + service.amount, 0);

    // Prepare bill data
    const billData = {
      billNo,
      patientId,
      patientName: patient.name,
      services,
      totalAmount
    };

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bill-${billNo}.pdf`);

    // Generate and stream the PDF
    generateBill(billData, res);

    // Save bill record to database
    await db.collection('bills').doc(billNo).set({
      ...billData,
      generatedAt: new Date(),
      status: 'paid'
    });

  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
});

module.exports = router;