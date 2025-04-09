import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import 'react-toastify/dist/ReactToastify.css';
import {
  // ... existing imports ...
} from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const mockDoctors = [
  {
    id: 'DOC001',
    name: 'John Smith',
    department: 'Cardiology',
    specialization: 'Interventional Cardiology',
    experience: 15,
    qualification: 'MD, DM Cardiology',
    availability: 'Available',
    consultationFee: 2000
  },
  {
    id: 'DOC002',
    name: 'Sarah Johnson',
    department: 'Neurology',
    specialization: 'Neurophysiology',
    experience: 12,
    qualification: 'MD, DM Neurology',
    availability: 'Available',
    consultationFee: 2500
  },
  {
    id: 'DOC003',
    name: 'Michael Chen',
    department: 'Orthopedics',
    specialization: 'Joint Replacement',
    experience: 10,
    qualification: 'MS Orthopedics',
    availability: 'Available',
    consultationFee: 1800
  },
  {
    id: 'DOC004',
    name: 'Emily Brown',
    department: 'Pediatrics',
    specialization: 'Neonatology',
    experience: 8,
    qualification: 'MD Pediatrics',
    availability: 'Available',
    consultationFee: 1500
  }
];

function Patients() {
  const [patients, setPatients] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [searchedPatient, setSearchedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  const [billDetails, setBillDetails] = useState({
    roomCharges: 2000,
    medicineCharges: 1500,
    doctorFees: 1000,
    otherCharges: 500,
    roomType: 'General',
    daysStayed: 1,
    medicines: '',
    treatments: '',
    doctorName: '',
    doctorDepartment: '',
    diagnosis: '',
    followUpDate: '',
    paymentMethod: 'Cash',
  });
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    gstNo: ''
  });
  const [paymentStatus, setPaymentStatus] = useState('pending');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPatients(patientsData);
    }, (error) => {
      console.error('Error fetching patients:', error);
      toast.error('Error fetching patients: ' + error.message);
    });

    return () => unsubscribe();
  }, []);

  const initializeMockDoctors = async () => {
    try {
      const doctorsRef = collection(db, 'doctors');
      const doctorsSnapshot = await getDocs(doctorsRef);
      
      if (doctorsSnapshot.empty) {
        console.log('No doctors found, initializing mock data...');
        const promises = mockDoctors.map(async (doctor) => {
          await setDoc(doc(db, 'doctors', doctor.id), doctor);
        });
        await Promise.all(promises);
        console.log('Mock doctors initialized successfully');
      }
    } catch (err) {
      console.error('Error initializing mock doctors:', err);
    }
  };

  useEffect(() => {
    initializeMockDoctors();
    
    const unsubscribe = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const doctorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDoctors(doctorsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      const doctor = doctors.find(d => d.id === selectedDoctor);
      if (doctor) {
        setBillDetails(prev => ({
          ...prev,
          doctorName: doctor.name,
          doctorDepartment: doctor.department,
          doctorFees: calculateDoctorFees(doctor)
        }));
      }
    }
  }, [selectedDoctor, doctors]);

  const calculateDoctorFees = (doctor) => {
    const baseFee = {
      'Cardiology': 2000,
      'Neurology': 2500,
      'Orthopedics': 1800,
      'Pediatrics': 1500,
      'General Medicine': 1200,
      'Surgery': 3000,
      'Gynecology': 1800,
      'Dermatology': 1500
    };
    const experienceMultiplier = Math.min(1 + (doctor.experience / 10), 2);
    return Math.round((baseFee[doctor.department] || 1500) * experienceMultiplier);
  };

  const calculateRoomCharges = () => {
    const ratePerDay = {
      'General': 1000,
      'Semi-Private': 2000,
      'Private': 3500,
      'ICU': 5000
    };
    return (ratePerDay[billDetails.roomType] || 1000) * billDetails.daysStayed;
  };

  useEffect(() => {
    const roomCharges = calculateRoomCharges();
    setBillDetails(prev => ({
      ...prev,
      roomCharges
    }));
  }, [billDetails.roomType, billDetails.daysStayed]);

  useEffect(() => {
    const fetchHospitalInfo = async () => {
      try {
        const hospitalDoc = await getDoc(doc(db, 'hospitals', 'H001'));
        if (hospitalDoc.exists()) {
          setHospitalInfo(hospitalDoc.data());
        }
      } catch (err) {
        console.error('Error fetching hospital info:', err);
      }
    };
    fetchHospitalInfo();
  }, []);

  const handlePayment = async (amount) => {
    try {
      // Validate doctor selection first
      if (!selectedDoctor) {
        toast.error('Please select an attending doctor before proceeding with payment');
        return;
      }

      const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
      if (!selectedDoctorData) {
        toast.error('Selected doctor not found. Please select a doctor again.');
        return;
      }

      if (selectedDoctorData.availability !== 'Available') {
        toast.error('Selected doctor is not available. Please select an available doctor.');
        return;
      }

      setLoading(true);
      
      // Validate amount
      if (!amount || amount < 1) {
        throw new Error('Invalid amount');
      }

      // Create order on your backend
      const orderResponse = await axios.post('http://localhost:5000/api/create-order', {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
      });

      if (!orderResponse.data || !orderResponse.data.id) {
        throw new Error('Failed to create order');
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: hospitalInfo.name || 'Hospital Name',
        description: `Bill Payment for ${searchedPatient?.name} - Dr. ${selectedDoctorData.name}`,
        order_id: orderResponse.data.id,
        prefill: {
          name: searchedPatient?.name || '',
          contact: searchedPatient?.mobileNumber || '',
          email: searchedPatient?.email || ''
        },
        notes: {
          patientId: searchedPatient?.id || '',
          abhaId: searchedPatient?.abhaId || '',
          hospitalId: hospitalInfo.id || '',
          doctorId: selectedDoctorData.id || '',
          doctorName: selectedDoctorData.name || ''
        },
        theme: {
          color: "#3B82F6"
        },
        handler: async function(response) {
          try {
            const verifyResponse = await axios.post('http://localhost:5000/api/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.data.verified) {
              setPaymentStatus('completed');
              toast.success('Payment successful!');
              await handleDischarge(searchedPatient.id, {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                method: billDetails.paymentMethod
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification failed:', err);
            toast.error('Payment verification failed. Please contact support.');
            setPaymentStatus('failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.info('Payment cancelled');
            setPaymentStatus('cancelled');
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function(response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setPaymentStatus('failed');
        setLoading(false);
      });

      paymentObject.open();
    } catch (err) {
      console.error('Payment initialization failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Payment initialization failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter a patient ID');
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'patients'),
        where('abhaId', '==', searchId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Patient not found');
        setSearchedPatient(null);
      } else {
        const patientData = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
        setSearchedPatient(patientData);
        toast.success('Patient found!');
      }
    } catch (err) {
      console.error('Error searching patient:', err);
      toast.error('Error searching patient: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCharges = () => {
    const { roomCharges, medicineCharges, doctorFees, otherCharges } = billDetails;
    return roomCharges + medicineCharges + doctorFees + otherCharges;
  };

  const handleDischarge = async (patientId, paymentDetails = null) => {
    try {
      if (!billDetails.doctorName) {
        toast.error('Please select a doctor');
        return;
      }

      const dischargeDate = new Date().toISOString().split('T')[0];
      const totalCharges = calculateTotalCharges();

      const billObject = {
        hospitalInfo: {
          name: hospitalInfo.name,
          address: hospitalInfo.address,
          phone: hospitalInfo.phone,
          email: hospitalInfo.email,
          website: hospitalInfo.website,
          gstNo: hospitalInfo.gstNo
        },
        patientInfo: {
          name: searchedPatient.name,
          abhaId: searchedPatient.abhaId,
          age: searchedPatient.age,
          gender: searchedPatient.gender,
          address: searchedPatient.address,
          contact: searchedPatient.mobileNumber
        },
        billDetails: {
          ...billDetails,
          totalCharges,
          dischargeDate,
          generatedAt: new Date().toISOString(),
          paymentMethod: billDetails.paymentMethod,
          paymentStatus: paymentStatus,
          ...(paymentDetails && {
            paymentId: paymentDetails.paymentId,
            orderId: paymentDetails.orderId,
            signature: paymentDetails.signature
          })
        },
        wardInfo: {
          wardType: searchedPatient.wardType,
          bedNumber: searchedPatient.bedNumber,
          admissionDate: searchedPatient.admissionDate,
          dischargeDate
        }
      };

      // For cash payments, generate PDF and send via WhatsApp
      if (billDetails.paymentMethod === 'Cash') {
        generateBillPDF(searchedPatient, billDetails, 'Cash');
        toast.success('Bill generated and WhatsApp message prepared!');
        setSearchedPatient(null);
        setSearchId('');
        return;
      }

      // For online payments, proceed with API call
      const response = await axios.put(`http://localhost:5000/api/patients/${patientId}/discharge`, billObject);

    if (response.status === 200) {
      toast.success('Patient discharged successfully!');
        generateBillPDF(searchedPatient, billDetails, billDetails.paymentMethod);
        setSearchedPatient(null);
        setSearchId('');
    }
  } catch (err) {
      console.error('Error discharging patient:', err);
    toast.error('Error discharging patient: ' + err.message);
  }
};

  const generateBillPDF = (patient, billDetails, paymentMethod) => {
    const doc = new jsPDF();
    
    // Add hospital header
    doc.setFontSize(20);
    doc.text(hospitalInfo.name || 'Healthcare Hospital', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(hospitalInfo.address || '123 Healthcare Street, Medical City, 12345', 105, 30, { align: 'center' });
    doc.text(`Phone: ${hospitalInfo.phone || '(123) 456-7890'} | Email: ${hospitalInfo.email || 'info@healthcare.com'}`, 105, 37, { align: 'center' });
    
    // Add bill details
    doc.setFontSize(16);
    doc.text('Bill Receipt', 105, 50, { align: 'center' });
    
    // Patient Information
    doc.setFontSize(12);
    doc.text('Patient Information:', 20, 65);
    doc.setFontSize(10);
    doc.text(`Name: ${patient.name}`, 20, 75);
    doc.text(`ABHA ID: ${patient.abhaId}`, 20, 82);
    doc.text(`Age: ${patient.age}`, 20, 89);
    doc.text(`Gender: ${patient.gender}`, 20, 96);
    doc.text(`Contact: ${patient.mobileNumber}`, 20, 103);
    
    // Admission Details
    doc.setFontSize(12);
    doc.text('Admission Details:', 20, 115);
    doc.setFontSize(10);
    doc.text(`Ward Type: ${patient.wardType}`, 20, 125);
    doc.text(`Bed Number: ${patient.bedNumber}`, 20, 132);
    doc.text(`Admission Date: ${new Date(patient.admissionDate).toLocaleDateString()}`, 20, 139);
    doc.text(`Discharge Date: ${new Date().toLocaleDateString()}`, 20, 146);
    
    // Doctor Details
    doc.setFontSize(12);
    doc.text('Doctor Details:', 20, 158);
    doc.setFontSize(10);
    doc.text(`Attending Doctor: ${billDetails.doctorName}`, 20, 168);
    doc.text(`Department: ${billDetails.doctorDepartment}`, 20, 175);
    
    // Treatment Details
    doc.setFontSize(12);
    doc.text('Treatment Details:', 20, 187);
    doc.setFontSize(10);
    doc.text(`Diagnosis: ${billDetails.diagnosis}`, 20, 197);
    doc.text(`Treatments: ${billDetails.treatments}`, 20, 204);
    
    // Bill Details
    doc.setFontSize(12);
    doc.text('Bill Details:', 20, 220);
    doc.setFontSize(10);
    let y = 230;
    doc.text(`Room Charges: ₹${billDetails.roomCharges}`, 20, y);
    y += 7;
    doc.text(`Doctor Fees: ₹${billDetails.doctorFees}`, 20, y);
    y += 7;
    doc.text(`Medicine Charges: ₹${billDetails.medicineCharges}`, 20, y);
    y += 7;
    doc.text(`Other Charges: ₹${billDetails.otherCharges}`, 20, y);
    y += 7;
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${billDetails.totalCharges}`, 20, y);
    
    // Payment Details
    y += 15;
    doc.setFontSize(12);
    doc.text('Payment Details:', 20, y);
    doc.setFontSize(10);
    y += 10;
    doc.text(`Payment Method: ${paymentMethod}`, 20, y);
    y += 7;
    doc.text(`Payment Status: ${paymentMethod === 'Cash' ? 'Paid' : 'Completed'}`, 20, y);
    if (billDetails.paymentId) {
      y += 7;
      doc.text(`Payment ID: ${billDetails.paymentId}`, 20, y);
    }
    
    // Footer
    y += 20;
    doc.setFontSize(8);
    doc.text('This is a computer-generated bill and does not require a signature.', 105, y, { align: 'center' });
    y += 7;
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, y, { align: 'center' });
    
    // Save the PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Create a more detailed WhatsApp message
    const whatsappMessage = `Dear ${patient.name},\n\nThank you for choosing ${hospitalInfo.name}.\n\nYour Bill Summary:\n-------------------\nPatient Name: ${patient.name}\nABHA ID: ${patient.abhaId}\nAdmission Date: ${new Date(patient.admissionDate).toLocaleDateString()}\nDischarge Date: ${new Date().toLocaleDateString()}\n\nBill Details:\n------------\nRoom Charges: ₹${billDetails.roomCharges}\nDoctor Fees: ₹${billDetails.doctorFees}\nMedicine Charges: ₹${billDetails.medicineCharges}\nOther Charges: ₹${billDetails.otherCharges}\nTotal Amount: ₹${billDetails.totalCharges}\n\nPayment Details:\n---------------\nPayment Method: ${paymentMethod}\nPayment Status: ${paymentMethod === 'Cash' ? 'Paid' : 'Completed'}\n${billDetails.paymentId ? `Payment ID: ${billDetails.paymentId}` : ''}\n\nFollow-up Date: ${billDetails.followUpDate ? new Date(billDetails.followUpDate).toLocaleDateString() : 'Not scheduled'}\n\nFor any queries, please contact us at ${hospitalInfo.phone}\n\nBest regards,\n${hospitalInfo.name}`;
    
    // Format the mobile number (remove any non-digit characters and ensure it starts with country code)
    const formattedMobileNumber = patient.mobileNumber.replace(/\D/g, '');
    const whatsappNumber = formattedMobileNumber.startsWith('91') ? formattedMobileNumber : `91${formattedMobileNumber}`;
    
    // Create WhatsApp URL with the formatted number
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
    
    // Also download the PDF
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `bill_${patient.abhaId}_${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(pdfUrl);
};

  const handleDownloadReceipt = (patientId) => {
    window.open(`http://localhost:5000/api/receipts/${patientId}`, '_blank');
  };

  const updateBillDetail = (field, value) => {
    setBillDetails(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const handleAssignDoctor = async (doctorId) => {
    if (!searchedPatient || !doctorId) return;

    try {
      const doctorRef = doc(db, 'doctors', doctorId);
      const doctorDoc = await getDoc(doctorRef);
      if (!doctorDoc.exists()) {
        toast.error('Doctor not found');
        return;
      }

      const doctorData = doctorDoc.data();
      const patientRef = doc(db, 'patients', searchedPatient.id);
      
      await updateDoc(patientRef, {
        assignedDoctor: {
          id: doctorId,
          name: doctorData.name,
          department: doctorData.department,
          assignedDate: new Date().toISOString()
        }
      });

      setAssignedDoctor(doctorData);
      toast.success('Doctor assigned successfully!');
    } catch (err) {
      console.error('Error assigning doctor:', err);
      toast.error('Failed to assign doctor');
    }
  };

  const renderBillForm = () => (
    <div className="border-l pl-4">
      <h3 className="text-lg font-semibold mb-2">Generate Bill</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm text-gray-600">Attending Doctor *</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className={`w-full p-1 border rounded mb-2 ${!selectedDoctor ? 'border-red-500' : ''}`}
          >
            <option value="">Select Doctor</option>
            {doctors.map(doctor => (
              <option 
                key={doctor.id} 
                value={doctor.id} 
                disabled={doctor.availability !== 'Available'}
              >
                Dr. {doctor.name} - {doctor.department} ({doctor.availability})
              </option>
            ))}
          </select>
          {!selectedDoctor && (
            <p className="text-red-500 text-sm mb-2">Please select an attending doctor</p>
          )}
          
          {selectedDoctor && doctors.find(d => d.id === selectedDoctor) && (
            <div className="bg-blue-50 p-3 rounded-md mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Dr. {doctors.find(d => d.id === selectedDoctor).name}</p>
                  <p className="text-sm text-gray-600">{doctors.find(d => d.id === selectedDoctor).department}</p>
                  <p className="text-sm text-gray-600">Specialization: {doctors.find(d => d.id === selectedDoctor).specialization}</p>
                  <p className="text-sm text-gray-600">Experience: {doctors.find(d => d.id === selectedDoctor).experience} years</p>
                  <p className="text-sm text-gray-600">Qualification: {doctors.find(d => d.id === selectedDoctor).qualification}</p>
                </div>
                <div className={`px-2 py-1 rounded text-sm ${
                  doctors.find(d => d.id === selectedDoctor).availability === 'Available' ? 'bg-green-100 text-green-800' :
                  doctors.find(d => d.id === selectedDoctor).availability === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {doctors.find(d => d.id === selectedDoctor).availability}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600">Room Type</label>
          <select
            value={billDetails.roomType}
            onChange={(e) => setBillDetails(prev => ({ ...prev, roomType: e.target.value }))}
            className="w-full p-1 border rounded"
          >
            <option value="General">General Ward</option>
            <option value="Semi-Private">Semi-Private Room</option>
            <option value="Private">Private Room</option>
            <option value="ICU">ICU</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Days Stayed</label>
          <input
            type="number"
            min="1"
            value={billDetails.daysStayed}
            onChange={(e) => setBillDetails(prev => ({ ...prev, daysStayed: parseInt(e.target.value) || 1 }))}
            className="w-full p-1 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Diagnosis</label>
          <input
            type="text"
            value={billDetails.diagnosis}
            onChange={(e) => setBillDetails(prev => ({ ...prev, diagnosis: e.target.value }))}
            className="w-full p-1 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Medicines Prescribed</label>
          <textarea
            value={billDetails.medicines}
            onChange={(e) => setBillDetails(prev => ({ ...prev, medicines: e.target.value }))}
            className="w-full p-1 border rounded"
            rows="2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Treatments</label>
          <textarea
            value={billDetails.treatments}
            onChange={(e) => setBillDetails(prev => ({ ...prev, treatments: e.target.value }))}
            className="w-full p-1 border rounded"
            rows="2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Follow-up Date</label>
          <input
            type="date"
            value={billDetails.followUpDate}
            onChange={(e) => setBillDetails(prev => ({ ...prev, followUpDate: e.target.value }))}
            className="w-full p-1 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Medicine Charges</label>
          <input
            type="number"
            value={billDetails.medicineCharges}
            onChange={(e) => updateBillDetail('medicineCharges', e.target.value)}
            className="w-full p-1 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Other Charges</label>
          <input
            type="number"
            value={billDetails.otherCharges}
            onChange={(e) => updateBillDetail('otherCharges', e.target.value)}
            className="w-full p-1 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Payment Method</label>
          <select
            value={billDetails.paymentMethod}
            onChange={(e) => setBillDetails(prev => ({ ...prev, paymentMethod: e.target.value }))}
            className="w-full p-1 border rounded"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Insurance">Insurance</option>
          </select>
        </div>

        <div className="pt-2 border-t">
          <p className="font-semibold">Room Charges: ₹{billDetails.roomCharges}</p>
          <p className="font-semibold">Doctor Fees: ₹{billDetails.doctorFees}</p>
          <p className="font-semibold">Medicine Charges: ₹{billDetails.medicineCharges}</p>
          <p className="font-semibold">Other Charges: ₹{billDetails.otherCharges}</p>
          <p className="font-semibold text-lg mt-2">Total: ₹{calculateTotalCharges()}</p>
        </div>

        {billDetails.paymentMethod === 'Cash' ? (
          <button
            onClick={() => handleDischarge(searchedPatient.id)}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Discharge Patient
          </button>
        ) : (
          <button
            onClick={() => handlePayment(calculateTotalCharges())}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay & Discharge'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Patient Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Search Patient</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter ABHA ID"
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searchedPatient && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Patient Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold">{searchedPatient.name}</h3>
              <p className="text-gray-600">ABHA ID: {searchedPatient.abhaId}</p>
              <p className="text-gray-600">Age: {searchedPatient.age} | Gender: {searchedPatient.gender}</p>
              <p className="text-gray-600">Admission Date: {searchedPatient.admissionDate}</p>
              <p className="text-gray-600">Status: <span className={`font-semibold ${searchedPatient.status === 'Admitted' ? 'text-green-500' : 'text-blue-500'}`}>
                {searchedPatient.status}
              </span></p>
              
              {searchedPatient.status === 'Admitted' && (
                <div className="mt-4 bg-blue-50 p-3 rounded-md">
                  <h4 className="text-md font-semibold mb-2">Ward Information</h4>
                  <p className="text-gray-700">Ward Type: {searchedPatient.wardType}</p>
                  <p className="text-gray-700">Bed Number: {searchedPatient.bedNumber}</p>
                  {searchedPatient.assignedDoctor && (
                    <>
                      <p className="text-gray-700 mt-2">Attending Doctor: Dr. {searchedPatient.assignedDoctor.name}</p>
                      <p className="text-gray-700">Department: {searchedPatient.assignedDoctor.department}</p>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Medical Information</h4>
                {searchedPatient.medicalHistory && (
                  <p className="text-gray-600">Medical History: {searchedPatient.medicalHistory}</p>
                )}
                {searchedPatient.currentMedications && (
                  <p className="text-gray-600">Current Medications: {searchedPatient.currentMedications}</p>
                )}
                {searchedPatient.allergies && (
                  <p className="text-gray-600">Allergies: {searchedPatient.allergies}</p>
                )}
              </div>
            </div>
            
            {searchedPatient.status === 'Admitted' && renderBillForm()}

            {searchedPatient.status === 'Discharged' && (
              <div className="border-l pl-4">
                <h3 className="text-lg font-semibold mb-2">Discharge Details</h3>
                <p className="text-gray-600">Discharge Date: {searchedPatient.dischargeDate}</p>
                <p className="text-gray-600">Total Charges: ₹{searchedPatient.bill?.totalCharges}</p>
                <div className="mt-2">
                  <p className="text-gray-600">Ward Type: {searchedPatient.wardType}</p>
                  <p className="text-gray-600">Bed Number: {searchedPatient.bedNumber}</p>
                  {searchedPatient.bill?.doctorName && (
                    <>
                      <p className="text-gray-600">Attending Doctor: Dr. {searchedPatient.bill.doctorName}</p>
                      <p className="text-gray-600">Department: {searchedPatient.bill.doctorDepartment}</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadReceipt(searchedPatient.id)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Download Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Patients</h2>
        {patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {patient.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-gray-500">
                      ABHA ID: {patient.abhaId} | Age: {patient.age} | {patient.gender}
                    </p>
                    <p className="text-sm text-gray-500">
                      Admitted: {patient.admissionDate}
                    </p>
                    {patient.status === 'Admitted' && (
                      <p className="text-sm text-gray-500">
                        Ward: {patient.wardType} | Bed: {patient.bedNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {patient.status === 'Admitted' ? (
                    <button
                      onClick={() => {
                        setSearchId(patient.abhaId);
                        setSearchedPatient(patient);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      View Details
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <p className="text-sm text-gray-500">Discharged: {patient.dischargeDate}</p>
                      <button
                        onClick={() => handleDownloadReceipt(patient.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Download Receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No patients found.</p>
        )}
      </div>
    </div>
  );
}

export default Patients;