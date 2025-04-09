import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import toast, { Toaster } from 'react-hot-toast';
import Web3 from 'web3';
import HealthRecordABI from '../contracts/HealthRecord.json';

function PatientInfo() {
  const [patients, setPatients] = useState(() => {
    try {
      const savedPatients = localStorage.getItem('patients');
      return savedPatients ? JSON.parse(savedPatients) : [];
    } catch (error) {
      console.error('Error parsing patients data:', error);
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBedType, setFilterBedType] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDetails, setBillDetails] = useState({
    roomCharges: 0,
    medicineCharges: 0,
    doctorFees: 0,
    miscCharges: 0,
    paymentMethod: 'cash'
  });
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  
  // New state for Add Patient modal and photo capture
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    abhaId: '', mobileNumber: '', name: '', age: '', gender: '', admissionDate: '', bedType: '', bedNumber: '', wardNumber: '', bloodGroup: '', state: '', district: '', taluka: '', photo: ''
  });
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});

  // Add new state for insurance claiming
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  // Emergency access states
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAccess, setEmergencyAccess] = useState({
    enabled: false,
    pin: '',
    tempPin: ''
  });
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);

  const [insuranceDetails, setInsuranceDetails] = useState({
    insuranceCompany: '',
    policyNumber: '',
    claimAmount: '',
    claimType: 'Hospitalization',
    documents: [],
    status: 'Pending'
  });

  // Indian states, districts, and talukas (sample data, you can expand or fetch from an API)
  const indianStates = ["Maharashtra", "Delhi", "Karnataka"];
  const districtsByState = {
    Maharashtra: ["Pune", "Mumbai", "Nagpur"],
    Delhi: ["Central Delhi", "South Delhi", "East Delhi"],
    Karnataka: ["Bangalore", "Mysore", "Hubli"]
  };
  const talukasByDistrict = {
    Pune: ["Haveli", "Khed", "Mulshi"],
    Mumbai: ["Andheri", "Bandra", "Colaba"],
    Nagpur: ["Nagpur Rural", "Hingna", "Kamptee"],
    "Central Delhi": ["Daryaganj", "Karol Bagh", "Paharganj"],
    "South Delhi": ["Hauz Khas", "Saket", "Vasant Vihar"],
    "East Delhi": ["Preet Vihar", "Mayur Vihar", "Shahdara"],
    Bangalore: ["Bangalore Urban", "Bangalore Rural", "Anekal"],
    Mysore: ["Mysore City", "Hunsur", "Nanjangud"],
    Hubli: ["Hubli City", "Dharwad", "Navalgund"]
  };

  useEffect(() => {
    const savedPatients = localStorage.getItem('patients');
    if (savedPatients) {
      setPatients(JSON.parse(savedPatients));
    }

    const checkRazorpayLoaded = () => {
      if (window.Razorpay) {
        setIsRazorpayLoaded(true);
      }
    };
    checkRazorpayLoaded();
    const timeoutId = setTimeout(checkRazorpayLoaded, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Initialize Web3 and smart contract
  useEffect(() => {
    const initWeb3 = async () => {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await web3Instance.eth.getAccounts();
          
          const contractInstance = new web3Instance.eth.Contract(
            HealthRecordABI,
            process.env.REACT_APP_CONTRACT_ADDRESS
          );

          setWeb3(web3Instance);
          setContract(contractInstance);
          setAccount(accounts[0]);

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0]);
          });

          toast.success('Connected to blockchain network');
        } else {
          toast.error('Please install MetaMask to use blockchain features');
        }
      } catch (error) {
        console.error('Error initializing Web3:', error);
        toast.error('Failed to connect to blockchain network');
      }
    };

    initWeb3();
  }, []);

  // Handle emergency access
  const handleEmergencyAccess = async (enable) => {
    try {
      if (!contract || !account) {
        toast.error('Blockchain connection not available');
        return;
      }

      if (enable) {
        // Generate a random 6-character PIN
        const pin = Math.random().toString(36).substring(2, 8);
        await contract.methods.setEmergencyAccess(true, pin)
          .send({ from: account });
        setEmergencyAccess(prev => ({ ...prev, enabled: true, pin }));
        toast.success(`Emergency access enabled. PIN: ${pin}`);
      } else {
        await contract.methods.setEmergencyAccess(false, '')
          .send({ from: account });
        setEmergencyAccess(prev => ({ ...prev, enabled: false, pin: '' }));
        toast.success('Emergency access disabled');
      }
    } catch (error) {
      console.error('Error managing emergency access:', error);
      toast.error('Failed to manage emergency access');
    }
  };

  const verifyEmergencyAccess = async () => {
    try {
      if (!contract || !selectedPatient) {
        toast.error('Patient or blockchain connection not available');
        return;
      }

      const result = await contract.methods
        .getRecord(selectedPatient.ethereumAddress, emergencyAccess.tempPin)
        .call({ from: account });

      if (result) {
        toast.success('Emergency access granted');
        setShowEmergencyModal(false);
      }
    } catch (error) {
      console.error('Error verifying emergency access:', error);
      toast.error('Invalid emergency PIN');
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = (
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.abhaId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    const matchesBedType = filterBedType === 'all' || patient.bedType === filterBedType;
    return matchesSearch && matchesStatus && matchesBedType;
  });

  const updateBedAvailability = (wardType, action) => {
    try {
      const bedStatus = JSON.parse(localStorage.getItem('bedStatus')) || {
        general: { total: 100, available: 50 },
        icu: { total: 20, available: 10 },
        emergency: { total: 30, available: 15 }
      };

      if (bedStatus[wardType]) {
        bedStatus[wardType].available = action === 'increase'
          ? bedStatus[wardType].available + 1
          : bedStatus[wardType].available - 1;
        
        localStorage.setItem('bedStatus', JSON.stringify(bedStatus));
      }
    } catch (err) {
      console.error('Error updating bed availability:', err);
      throw err;
    }
  };

  const handleDischarge = (patientId) => {
    try {
      const patient = patients.find(p => p.patientId === patientId);
      if (!patient) return;
      const updatedPatients = patients.map(p => {
        if (p.patientId === patientId) {
          return { ...p, status: 'Discharged', dischargeDate: new Date().toISOString() };
        }
        return p;
      });
      updateBedAvailability(patient.bedType, 'increase');
      setPatients(updatedPatients);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      toast.success('Patient discharged successfully');
    } catch (err) {
      console.error('Error discharging patient:', err);
      toast.error('Error discharging patient');
    }
  };

  const calculateTotal = () => {
    return Object.values(billDetails).reduce((acc, val) => 
      typeof val === 'number' ? acc + val : acc, 0
    );
  };

  const handleBillInputChange = (e) => {
    const { name, value } = e.target;
    setBillDetails(prev => ({
      ...prev,
      [name]: name === 'paymentMethod' ? value : Number(value)
    }));
  };

  const generatePDF = (patient, billDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 15;

    // Header with Apollo Logo (simulated with text)
    doc.setFontSize(24);
    doc.setTextColor(0, 48, 135); // Apollo dark blue
    doc.text('APOLLO', 20, yPos);
    doc.setFontSize(12);
    doc.text('HOSPITALS', 20, yPos + 7);

    // Right side header details
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Apollo Hospitals Enterprise Limited', pageWidth - 20, yPos, { align: 'right' });
    doc.text('Off Greams Lane, Off Greams Road', pageWidth - 20, yPos + 4, { align: 'right' });
    doc.text('Chennai - 600006', pageWidth - 20, yPos + 8, { align: 'right' });
    doc.text('Tel: 044-28290200 / 28293333', pageWidth - 20, yPos + 12, { align: 'right' });
    doc.text('GSTIN: 33AAACA5443N2Z1', pageWidth - 20, yPos + 16, { align: 'right' });

    // Blue header bar
    yPos += 22;
    doc.setFillColor(0, 48, 135);
    doc.rect(0, yPos, pageWidth, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.text('FINAL BILL', pageWidth / 2, yPos + 5.5, { align: 'center' });

    yPos += 15;

    // Bill details in two columns
    doc.setTextColor(0);
    doc.setFontSize(9);
    
    // Left column
    doc.text('Bill No:', 20, yPos);
    doc.text(`IP${Math.floor(Math.random() * 1000000)}`, 60, yPos);
    
    doc.text('Patient Name:', 20, yPos + 5);
    doc.text(patient.name, 60, yPos + 5);
    
    doc.text('IP No:', 20, yPos + 10);
    doc.text(`IP${Math.floor(Math.random() * 100000)}`, 60, yPos + 10);
    
    // Right column
    doc.text('Bill Date:', pageWidth - 90, yPos);
    doc.text(new Date().toLocaleDateString(), pageWidth - 50, yPos);
    
    doc.text('Admission:', pageWidth - 90, yPos + 5);
    doc.text(new Date(patient.admissionDate).toLocaleDateString(), pageWidth - 50, yPos + 5);
    
    doc.text('Discharge:', pageWidth - 90, yPos + 10);
    doc.text(new Date().toLocaleDateString(), pageWidth - 50, yPos + 10);

    // Add patient's photo if available
    if (patient.photo) {
      try {
        // Calculate dimensions for the photo
        const imgWidth = 40;
        const imgHeight = 40;
        const xPos = pageWidth - imgWidth - 20; // Move photo to right side
        
        // Add the photo
        doc.addImage(patient.photo, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        
        // Add photo verification box
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.rect(xPos - 2, yPos - 2, imgWidth + 4, imgHeight + 4);
        
        // Add verification text below photo
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.text('Photo Verified', xPos, yPos + imgHeight + 8, { align: 'left' });
        
        // Reset text color
        doc.setTextColor(0);
        doc.setFontSize(12);
      } catch (error) {
        console.error('Error adding patient photo to PDF:', error);
        toast.error('Error adding photo to bill');
      }
    }

    // Add patient details (on the left side)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Patient Name: ${patient.name}`, 20, yPos);
    yPos += 10;
    doc.text(`ABHA ID: ${patient.abhaId}`, 20, yPos);
    yPos += 10;
    doc.text(`Age: ${patient.age}`, 20, yPos);
    yPos += 10;
    doc.text(`Gender: ${patient.gender}`, 20, yPos);
    yPos += 10;
    doc.text(`Contact: ${patient.mobileNumber || 'N/A'}`, 20, yPos);
    yPos += 10;
    doc.text(`Emergency Contact: ${patient.emergencyContact || 'N/A'}`, 20, yPos);
    yPos += 10;
    doc.text(`Address: ${patient.address || 'N/A'}`, 20, yPos);
    yPos += 20;

    // Add admission details
    doc.text(`Admission Date: ${new Date(patient.admissionDate).toLocaleDateString()}`, 20, yPos);
    yPos += 10;
    doc.text(`Ward Type: ${patient.wardType}`, 20, yPos);
    yPos += 10;
    doc.text(`Bed Number: ${patient.bedNumber}`, 20, yPos);
    yPos += 15;

    // Add bill details table
    doc.setFontSize(14);
    doc.text('Bill Details', 20, yPos);
    yPos += 10;

    // Table headers
    const headers = ['Description', 'Amount'];
    const data = Object.entries(billDetails)
      .filter(([key]) => key !== 'paymentMethod')
      .map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        `₹${parseFloat(value).toFixed(2)}`
      ]);

    doc.autoTable({
      startY: yPos,
      head: [headers],
      body: data,
      margin: { left: 20 },
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10 }
    });

    yPos = doc.lastAutoTable.finalY + 20;

    // Add total
    const total = Object.entries(billDetails)
      .filter(([key]) => key !== 'paymentMethod')
      .reduce((sum, [_, value]) => sum + parseFloat(value), 0);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Amount: ₹${total.toFixed(2)}`, pageWidth - 40, yPos, { align: 'right' });

    // Add verification text
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text('This bill includes patient photo verification for insurance purposes.', 20, yPos);
    
    // Add payment method
    yPos += 10;
    doc.text(`Payment Method: ${billDetails.paymentMethod.toUpperCase()}`, 20, yPos);

    // Save the PDF
    doc.save(`APOLLO_${patient.name}_bill_${new Date().getTime()}.pdf`);
  };

  const initializeRazorpayPayment = (options) => {
    return new Promise((resolve, reject) => {
      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(response) {
          reject(new Error(response.error.description));
        });
        rzp.open();
        resolve(rzp);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handlePayment = async () => {
    const totalAmount = calculateTotal();
    if (billDetails.paymentMethod === 'online' || billDetails.paymentMethod === 'card') {
      if (!isRazorpayLoaded) {
        alert('Payment system is still loading. Please try again in a few seconds.');
        return;
      }
      try {
        const options = {
          key: 'rzp_test_xD09vItc8qkt0H',
          amount: totalAmount * 100,
          currency: 'INR',
          name: 'Hospital Management System',
          description: `Medical Bill for ${selectedPatient.name}`,
          handler: function(response) {
            const paymentDetails = { transactionId: response.razorpay_payment_id, method: billDetails.paymentMethod };
            const doc = generatePDF(selectedPatient, billDetails);
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `bill_${selectedPatient.patientId}.pdf`;
            a.click();
            const paymentRecord = {
              patientId: selectedPatient.patientId,
              patientName: selectedPatient.name,
              amount: totalAmount,
              transactionId: response.razorpay_payment_id,
              paymentMethod: billDetails.paymentMethod,
              timestamp: new Date().toISOString(),
              billDetails: { ...billDetails }
            };
            const payments = JSON.parse(localStorage.getItem('payments') || '[]');
            payments.push(paymentRecord);
            localStorage.setItem('payments', JSON.stringify(payments));
            setShowBillModal(false);
            setBillDetails({ roomCharges: 0, medicineCharges: 0, doctorFees: 0, miscCharges: 0, paymentMethod: 'cash' });
            setSelectedPatient(null);
            alert('Payment successful! Bill has been generated.');
          },
          prefill: { name: selectedPatient.name, contact: selectedPatient.mobileNumber },
          theme: { color: '#3B82F6' },
          modal: { ondismiss: function() { console.log('Payment modal closed'); } }
        };
        await initializeRazorpayPayment(options);
      } catch (error) {
        console.error('Payment failed:', error);
        alert(`Payment failed: ${error.message}`);
      }
    } else {
      const paymentDetails = { transactionId: `CASH_${Date.now()}`, method: 'cash' };
      try {
        const doc = generatePDF(selectedPatient, billDetails);
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `bill_${selectedPatient.patientId}.pdf`;
        a.click();
        const paymentRecord = {
          patientId: selectedPatient.patientId,
          patientName: selectedPatient.name,
          amount: totalAmount,
          transactionId: paymentDetails.transactionId,
          paymentMethod: 'cash',
          timestamp: new Date().toISOString(),
          billDetails: { ...billDetails }
        };
        const payments = JSON.parse(localStorage.getItem('payments') || '[]');
        payments.push(paymentRecord);
        localStorage.setItem('payments', JSON.stringify(payments));
        setShowBillModal(false);
        setBillDetails({ roomCharges: 0, medicineCharges: 0, doctorFees: 0, miscCharges: 0, paymentMethod: 'cash' });
        setSelectedPatient(null);
        alert('Cash payment recorded! Bill has been generated.');
      } catch (error) {
        console.error('Error processing cash payment:', error);
        alert('Error generating bill. Please try again.');
      }
    }
  };

  // New Functions for Add Patient
  const handleNewPatientChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "user",
          aspectRatio: 4/3
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.transform = 'scaleX(-1)'; // Mirror the video
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setVideoStream(stream);
            toast.success('Camera started successfully');
          } catch (err) {
            console.error('Error playing video:', err);
            toast.error('Failed to start video playback');
          }
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error(`Camera access denied: ${err.message}`);
    }
  };

  const capturePhoto = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas reference not found');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Make sure video is playing and has valid dimensions
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        throw new Error('Video stream is not ready yet');
      }

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG with quality 0.8
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      if (!photoData || photoData === 'data:,') {
        throw new Error('Failed to capture image data');
      }

      setNewPatient(prev => ({ ...prev, photo: photoData }));
      toast.success('Photo captured successfully!');
      stopCamera();
    } catch (err) {
      console.error('Error capturing photo:', err);
      toast.error(`Failed to capture photo: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.label);
      });
      setVideoStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setNewPatient(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      // Validate current step
      if (!validateCurrentStep()) {
        return;
      }

      // Generate a unique patient ID
      const patientId = `PAT${Date.now()}`;
      
      const patientData = {
        ...newPatient,
        patientId,
        admissionDate: new Date().toISOString(),
        status: 'Active',
        hospitalId: localStorage.getItem('hospitalId') || '',
        hospitalName: localStorage.getItem('hospitalName') || '',
        photo: newPatient.photo || null
      };

      // Get existing patients with error handling
      let existingPatients = [];
      try {
        const savedPatients = localStorage.getItem('patients');
        existingPatients = savedPatients ? JSON.parse(savedPatients) : [];
      } catch (error) {
        console.error('Error parsing existing patients:', error);
        existingPatients = [];
      }

      // Add new patient
      existingPatients.push(patientData);

      // Save to localStorage with error handling
      try {
        localStorage.setItem('patients', JSON.stringify(existingPatients));
      } catch (error) {
        console.error('Error saving patient data:', error);
        toast.error('Failed to save patient data');
        return;
      }

      // Update state
      setPatients(existingPatients);
      setShowAddPatientModal(false);
      setNewPatient({
        patientId: '',
        abhaId: '',
        adhaarId: '',
        name: '',
        age: '',
        gender: '',
        bloodGroup: '',
        mobileNumber: '',
        emergencyContact: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        admissionDate: '',
        status: '',
        hospitalId: '',
        hospitalName: '',
        photo: null
      });
      setCurrentStep(1);
      toast.success('Patient added successfully!');
    } catch (error) {
      console.error('Error adding patient:', error);
      toast.error('Failed to add patient');
    }
  };

  // Update the photo capture UI section
  const renderPhotoSection = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Patient Photo</h3>
      
      {newPatient.photo ? (
        <div className="flex flex-col items-center">
          <div className="relative">
            <img 
              src={newPatient.photo} 
              alt="Patient" 
              className="w-64 h-64 object-cover rounded-lg shadow-lg"
            />
            <button
              type="button"
              onClick={() => setNewPatient(prev => ({ ...prev, photo: null }))}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Photo captured successfully</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Take Photo
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Photo
                </label>
              </div>
            </div>
          </div>
          
          {videoStream && (
            <div className="relative flex flex-col items-center mt-4">
              <div className="relative w-full max-w-2xl mx-auto rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ maxHeight: '480px', transform: 'scaleX(-1)' }}
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Position your face within the frame and ensure good lighting</p>
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const validateStep = (step) => {
    const errors = {};
    switch(step) {
      case 1:
        if (!newPatient.abhaId) errors.abhaId = 'ABHA ID is required';
        if (!newPatient.name) errors.name = 'Name is required';
        if (!newPatient.mobileNumber) errors.mobileNumber = 'Mobile number is required';
        if (!newPatient.age) errors.age = 'Age is required';
        if (!newPatient.gender) errors.gender = 'Gender is required';
        break;
      case 2:
        if (!newPatient.bloodGroup) errors.bloodGroup = 'Blood group is required';
        if (!newPatient.bedType) errors.bedType = 'Ward type is required';
        if (!newPatient.bedNumber) errors.bedNumber = 'Bed number is required';
        if (!newPatient.wardNumber) errors.wardNumber = 'Ward number is required';
        break;
      case 3:
        if (!newPatient.state) errors.state = 'State is required';
        if (!newPatient.district) errors.district = 'District is required';
        if (!newPatient.taluka) errors.taluka = 'Taluka is required';
        break;
    }
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Add insurance claiming function
  const handleInsuranceClaim = async (patient) => {
    try {
      const claimData = {
        patientId: patient.patientId,
        patientName: patient.name,
        insuranceDetails: {
          ...insuranceDetails,
          claimDate: new Date().toISOString(),
          documents: [
            { name: 'Patient Photo', url: patient.photo },
            { name: 'Medical Records', url: '' }, // Add medical records URL
            { name: 'Bill Details', url: '' } // Add bill details URL
          ]
        }
      };

      // Send to server
      const response = await fetch('http://localhost:5000/api/insurance-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData)
      });

      if (!response.ok) throw new Error('Failed to submit insurance claim');

      toast.success('Insurance claim submitted successfully');
      setShowInsuranceModal(false);
      setInsuranceDetails({
        insuranceCompany: '',
        policyNumber: '',
        claimAmount: '',
        claimType: 'Hospitalization',
        documents: [],
        status: 'Pending'
      });
    } catch (err) {
      console.error('Error submitting insurance claim:', err);
      toast.error('Failed to submit insurance claim');
    }
  };

  // Add this function before handleAddPatient
  const validateCurrentStep = () => {
    const errors = {};
    switch(currentStep) {
      case 1:
        if (!newPatient.abhaId) errors.abhaId = 'ABHA ID is required';
        if (!newPatient.name) errors.name = 'Name is required';
        if (!newPatient.mobileNumber) errors.mobileNumber = 'Mobile number is required';
        if (!newPatient.age) errors.age = 'Age is required';
        if (!newPatient.gender) errors.gender = 'Gender is required';
        break;
      case 2:
        if (!newPatient.bloodGroup) errors.bloodGroup = 'Blood group is required';
        if (!newPatient.bedType) errors.bedType = 'Ward type is required';
        if (!newPatient.bedNumber) errors.bedNumber = 'Bed number is required';
        if (!newPatient.wardNumber) errors.wardNumber = 'Ward number is required';
        break;
      case 3:
        if (!newPatient.state) errors.state = 'State is required';
        if (!newPatient.district) errors.district = 'District is required';
        if (!newPatient.taluka) errors.taluka = 'Taluka is required';
        break;
      case 4:
        if (!newPatient.photo) errors.photo = 'Patient photo is required';
        break;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update the insurance claim modal content
  const renderInsuranceClaimForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Company</label>
          <select
            value={insuranceDetails.insuranceCompany}
            onChange={(e) => setInsuranceDetails(prev => ({ ...prev, insuranceCompany: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Insurance Company</option>
            <option value="LIC">Life Insurance Corporation</option>
            <option value="ICICI">ICICI Prudential</option>
            <option value="HDFC">HDFC Life</option>
            <option value="SBI">SBI Life</option>
            <option value="Max">Max Life Insurance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
          <input
            type="text"
            value={insuranceDetails.policyNumber}
            onChange={(e) => setInsuranceDetails(prev => ({ ...prev, policyNumber: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Enter policy number"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={insuranceDetails.claimAmount}
              onChange={(e) => setInsuranceDetails(prev => ({ ...prev, claimAmount: e.target.value }))}
              className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Enter claim amount"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
          <select
            value={insuranceDetails.claimType}
            onChange={(e) => setInsuranceDetails(prev => ({ ...prev, claimType: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="Hospitalization">Hospitalization</option>
            <option value="DayCare">Day Care Treatment</option>
            <option value="PreHospitalization">Pre-Hospitalization</option>
            <option value="PostHospitalization">Post-Hospitalization</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Required Documents</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Government ID</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, 'govtId')}
                className="text-sm"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Medical Records</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, 'medicalRecords')}
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Insurance Card</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, 'insuranceCard')}
                className="text-sm"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Other Documents</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, 'other')}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Add new function to handle document uploads
  const handleDocumentUpload = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setInsuranceDetails(prev => ({
          ...prev,
          documents: [...prev.documents, { type: docType, file: reader.result }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <Toaster position="top-right" />
      <div className="h-full overflow-y-auto px-4 py-8">
        <div className="container mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Patient Information</h1>
              <button
                onClick={() => setShowAddPatientModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Patient
              </button>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Search by name, ID, ABHA ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>
              <div>
                <select
                  value={filterBedType}
                  onChange={(e) => setFilterBedType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Bed Types</option>
                  <option value="General">General</option>
                  <option value="Private">Private</option>
                  <option value="ICU">ICU</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>

            {/* Patient List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ABHA ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emergency Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.patientId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{patient.patientId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.name}</div>
                        <div className="text-sm text-gray-500">{patient.age} years • {patient.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{patient.abhaId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800`}>{patient.bloodGroup}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.bedType} - {patient.bedNumber}</div>
                        <div className="text-sm text-gray-500">Ward: {patient.wardNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {patient.status === 'Active' && (
                          <button
                            onClick={() => handleEmergencyAccess(!emergencyAccess.enabled)}
                            className={`px-3 py-1.5 rounded ${emergencyAccess.enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white text-sm`}
                          >
                            {emergencyAccess.enabled ? 'Disable' : 'Enable'} Emergency
                          </button>
                        )}
                        {emergencyAccess.enabled && patient.status === 'Active' && (
                          <div className="mt-1 text-xs text-gray-500">
                            PIN: {emergencyAccess.pin}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button onClick={() => { setSelectedPatient(patient); setShowBillModal(true); }} className="text-blue-600 hover:text-blue-900">Generate Bill</button>
                          <button onClick={() => { setSelectedPatient(patient); setShowInsuranceModal(true); }} className="text-green-600 hover:text-green-900">Insurance</button>
                          <button 
                            onClick={() => handleDischarge(patient.patientId)} 
                            className={`text-indigo-600 hover:text-indigo-900 ${patient.status === 'Discharged' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            disabled={patient.status === 'Discharged'}
                          >
                            Discharge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-8 text-gray-500">No patients found matching the search criteria</div>
            )}
          </div>
        </div>

        {/* Bill Modal */}
        {showBillModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="relative w-full max-w-lg mx-4">
              <div className="bg-white rounded-lg shadow-xl">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Generate Bill</h2>
                    <button onClick={() => setShowBillModal(false)} className="text-white hover:text-gray-200">✕</button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-base font-semibold mb-2">Patient Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-gray-600">Name</p><p className="font-medium">{selectedPatient.name}</p></div>
                      <div><p className="text-gray-600">Patient ID</p><p className="font-medium">{selectedPatient.patientId}</p></div>
                      <div><p className="text-gray-600">Room</p><p className="font-medium">{selectedPatient.bedType} - {selectedPatient.bedNumber}</p></div>
                      <div><p className="text-gray-600">Ward</p><p className="font-medium">{selectedPatient.wardNumber}</p></div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-3">Bill Details</h3>
                    <div className="space-y-3">
                      {Object.entries(billDetails).map(([key, value]) => (
                        key !== 'paymentMethod' && (
                          <div key={key} className="flex items-center gap-3">
                            <label className="w-1/3 text-sm text-gray-700">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                            <div className="w-2/3 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                              <input type="number" name={key} value={value} onChange={handleBillInputChange} className="w-full pl-6 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500" min="0" />
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-3">Payment Method</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['cash', 'card', 'online'].map((method) => (
                        <label key={method} className={`flex items-center justify-center p-2 border rounded-md cursor-pointer text-sm ${billDetails.paymentMethod === method ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-200'}`}>
                          <input type="radio" name="paymentMethod" value={method} checked={billDetails.paymentMethod === method} onChange={handleBillInputChange} className="sr-only" />
                          <span className="font-medium capitalize">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t">
                    <span className="text-base font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-blue-600">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t rounded-b-lg">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowBillModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handlePayment} disabled={calculateTotal() <= 0} className={`px-4 py-1.5 text-sm rounded-md text-white ${calculateTotal() > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}>Process Payment</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Patient Modal */}
        {showAddPatientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-2xl h-[80vh] flex flex-col bg-white rounded-xl shadow-2xl">
              {/* Header */}
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-xl flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">Add New Patient</h2>
                  <button 
                    onClick={() => { setShowAddPatientModal(false); stopCamera(); }} 
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                <div className="flex justify-between">
                  {['Personal Details', 'Medical Info', 'Address', 'Photo'].map((step, index) => (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 
                        ${currentStep > index + 1 ? 'bg-green-500 border-green-500' : 
                          currentStep === index + 1 ? 'bg-blue-500 border-blue-500' : 
                          'border-gray-300'} text-white font-semibold text-xs`}>
                        {currentStep > index + 1 ? '✓' : index + 1}
                      </div>
                      <div className={`ml-1 text-xs ${currentStep === index + 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                        {step}
                      </div>
                      {index < 3 && (
                        <div className={`w-4 h-0.5 mx-1 ${currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddPatient} className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="max-w-xl mx-auto">
                    {/* Form steps content remains the same */}
                    {currentStep === 1 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ABHA ID</label>
                            <input 
                              type="text"
                              name="abhaId"
                              value={newPatient.abhaId}
                              onChange={handleNewPatientChange}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                                ${formErrors.abhaId ? 'border-red-500' : ''}`}
                              placeholder="Enter ABHA ID"
                            />
                            {formErrors.abhaId && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.abhaId}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                              type="text"
                              name="name"
                              value={newPatient.name}
                              onChange={handleNewPatientChange}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.name ? 'border-red-500' : ''}`}
                              placeholder="Enter full name"
                            />
                            {formErrors.name && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                            <input 
                              type="tel"
                              name="mobileNumber"
                              value={newPatient.mobileNumber}
                              onChange={handleNewPatientChange}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.mobileNumber ? 'border-red-500' : ''}`}
                              placeholder="Enter mobile number"
                            />
                            {formErrors.mobileNumber && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.mobileNumber}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <input 
                              type="number"
                              name="age"
                              value={newPatient.age}
                              onChange={handleNewPatientChange}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.age ? 'border-red-500' : ''}`}
                              placeholder="Enter age"
                            />
                            {formErrors.age && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.age}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select 
                              name="gender"
                              value={newPatient.gender}
                              onChange={handleNewPatientChange}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.gender ? 'border-red-500' : ''}`}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                            {formErrors.gender && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.gender}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Medical Information */}
                    {currentStep === 2 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                            <select 
                              name="bloodGroup"
                              value={newPatient.bloodGroup}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.bloodGroup ? 'border-red-500' : ''}`}
                            >
                              <option value="">Select Blood Group</option>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(group => (
                                <option key={group} value={group}>{group}</option>
                              ))}
                            </select>
                            {formErrors.bloodGroup && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.bloodGroup}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ward Type</label>
                            <select 
                              name="bedType"
                              value={newPatient.bedType}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.bedType ? 'border-red-500' : ''}`}
                            >
                              <option value="">Select Ward Type</option>
                              <option value="General">General Ward</option>
                              <option value="Private">Private Room</option>
                              <option value="ICU">ICU</option>
                              <option value="Emergency">Emergency</option>
                            </select>
                            {formErrors.bedType && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.bedType}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                            <input 
                              type="text"
                              name="bedNumber"
                              value={newPatient.bedNumber}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.bedNumber ? 'border-red-500' : ''}`}
                              placeholder="Enter bed number"
                            />
                            {formErrors.bedNumber && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.bedNumber}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ward Number</label>
                            <input 
                              type="text"
                              name="wardNumber"
                              value={newPatient.wardNumber}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.wardNumber ? 'border-red-500' : ''}`}
                              placeholder="Enter ward number"
                            />
                            {formErrors.wardNumber && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.wardNumber}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
                            <input 
                              type="date"
                              name="admissionDate"
                              value={newPatient.admissionDate}
                              onChange={handleNewPatientChange}
                              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Address Information */}
                    {currentStep === 3 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <select 
                              name="state"
                              value={newPatient.state}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.state ? 'border-red-500' : ''}`}
                            >
                              <option value="">Select State</option>
                              {indianStates.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            {formErrors.state && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select 
                              name="district"
                              value={newPatient.district}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.district ? 'border-red-500' : ''}`}
                              disabled={!newPatient.state}
                            >
                              <option value="">Select District</option>
                              {newPatient.state && districtsByState[newPatient.state]?.map(district => (
                                <option key={district} value={district}>{district}</option>
                              ))}
                            </select>
                            {formErrors.district && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.district}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Taluka</label>
                            <select 
                              name="taluka"
                              value={newPatient.taluka}
                              onChange={handleNewPatientChange}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                                ${formErrors.taluka ? 'border-red-500' : ''}`}
                              disabled={!newPatient.district}
                            >
                              <option value="">Select Taluka</option>
                              {newPatient.district && talukasByDistrict[newPatient.district]?.map(taluka => (
                                <option key={taluka} value={taluka}>{taluka}</option>
                              ))}
                            </select>
                            {formErrors.taluka && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.taluka}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Photo */}
                    {currentStep === 4 && (
                      <div className="space-y-3">
                        {renderPhotoSection()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Footer with Navigation Buttons */}
                <div className="flex-shrink-0 px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className={`px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center text-xs
                      ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentStep === 1}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddPatientModal(false); stopCamera(); }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
                    >
                      Cancel
                    </button>
                    {currentStep < 4 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-xs"
                      >
                        Next
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center text-xs"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Insurance Claim Modal */}
        {showInsuranceModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-600 to-green-800 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Insurance Claim</h2>
                  <button onClick={() => setShowInsuranceModal(false)} className="text-white hover:text-gray-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Patient ID</p>
                      <p className="font-medium">{selectedPatient.patientId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ABHA ID</p>
                      <p className="font-medium">{selectedPatient.abhaId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Admission Date</p>
                      <p className="font-medium">{new Date(selectedPatient.admissionDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {renderInsuranceClaimForm()}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowInsuranceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleInsuranceClaim(selectedPatient)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Submit Claim
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientInfo;