import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AddPatient() {
  const [doctors, setDoctors] = useState([]);
  const [beds, setBeds] = useState({
    General: { total: 100, available: 100 },
    'Semi-Private': { total: 50, available: 50 },
    Private: { total: 30, available: 30 },
    ICU: { total: 20, available: 20 }
  });
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    abhaId: '',
    contact: '',
    address: '',
    state: '',
    district: '',
    taluka: '',
    wardType: 'General',
    bedNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'Admitted',
    emergencyContact: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: '',
    assignedDoctor: null,
    photo: null
  });

  // Add new states for photo capture and location
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);

  // Fetch doctors
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const doctorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDoctors(doctorsData);
    });
    return () => unsubscribe();
  }, []);

  // Fetch current bed status
  useEffect(() => {
    const fetchBedStatus = async () => {
      try {
        const bedsRef = collection(db, 'beds');
        const snapshot = await getDocs(bedsRef);
        if (!snapshot.empty) {
          const bedData = snapshot.docs[0].data();
          setBeds(bedData);
        }
      } catch (err) {
        console.error('Error fetching bed status:', err);
      }
    };
    fetchBedStatus();
  }, []);

  // Fetch states data
  useEffect(() => {
    fetch('https://cdn-api.co-vin.in/api/v2/admin/location/states')
      .then(response => response.json())
      .then(data => {
        setStates(data.states);
      })
      .catch(error => console.error('Error fetching states:', error));
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (patientData.state) {
      fetch(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/${patientData.state}`)
        .then(response => response.json())
        .then(data => {
          setDistricts(data.districts);
        })
        .catch(error => console.error('Error fetching districts:', error));
    }
  }, [patientData.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateBedCount = async (wardType, operation) => {
    try {
      const bedsRef = collection(db, 'beds');
      const snapshot = await getDocs(bedsRef);
      const bedDocId = snapshot.docs[0].id;
      
      const updatedBeds = {
        ...beds,
        [wardType]: {
          ...beds[wardType],
          available: operation === 'decrease' 
            ? beds[wardType].available - 1 
            : beds[wardType].available + 1
        }
      };
      
      await updateDoc(doc(db, 'beds', bedDocId), updatedBeds);
      setBeds(updatedBeds);
    } catch (err) {
      console.error('Error updating bed count:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      toast.error('Please select an attending doctor');
      return;
    }

    if (!patientData.bedNumber) {
      toast.error('Please assign a bed number');
      return;
    }

    if (beds[patientData.wardType].available === 0) {
      toast.error('No beds available in selected ward');
      return;
    }

    try {
      const doctor = doctors.find(d => d.id === selectedDoctor);
      const patientWithDoctor = {
        ...patientData,
        assignedDoctor: {
          id: doctor.id,
          name: doctor.name,
          department: doctor.department,
          assignedDate: new Date().toISOString()
        }
      };

      await addDoc(collection(db, 'patients'), patientWithDoctor);
      await updateBedCount(patientData.wardType, 'decrease');

      toast.success('Patient admitted successfully!');
      
      // Reset form
      setPatientData({
        name: '',
        age: '',
        gender: 'Male',
        abhaId: '',
        contact: '',
        address: '',
        state: '',
        district: '',
        taluka: '',
        wardType: 'General',
        bedNumber: '',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'Admitted',
        emergencyContact: '',
        medicalHistory: '',
        currentMedications: '',
        allergies: '',
        assignedDoctor: null,
        photo: null
      });
      setSelectedDoctor('');
    } catch (err) {
      console.error('Error admitting patient:', err);
      toast.error('Failed to admit patient: ' + err.message);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }

      // Request camera access with specific constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          aspectRatio: { ideal: 1.7777777778 }
        }
      });

      // Check if we got the video track
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track available');
      }

      // Get the actual capabilities
      const capabilities = videoTrack.getCapabilities();
      console.log('Camera capabilities:', capabilities);

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
      setShowCamera(true);
      toast.success('Camera started successfully');
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Could not access camera. ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please grant camera permissions in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera device found.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += err.message;
      }
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) {
      toast.error('Camera not initialized');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG with 0.8 quality
      const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Validate the data URL
      if (!photoUrl || photoUrl === 'data:,') {
        throw new Error('Failed to capture photo');
      }

      setPatientData(prev => ({ ...prev, photo: photoUrl }));
      toast.success('Photo captured successfully');
      stopCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo: ' + error.message);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const img = new Image();
        img.onload = () => {
          // Validate image dimensions
          if (img.width < 100 || img.height < 100) {
            toast.error('Image dimensions too small. Minimum 100x100 pixels required.');
            return;
          }
          setPatientData(prev => ({ ...prev, photo: reader.result }));
          toast.success('Photo uploaded successfully');
        };
        img.onerror = () => {
          toast.error('Invalid image file');
        };
        img.src = reader.result;
      } catch (error) {
        console.error('Error processing uploaded photo:', error);
        toast.error('Error processing photo');
      }
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Add New Patient</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={patientData.name}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            ABHA ID
          </label>
          <input
            type="text"
            name="abhaId"
            value={patientData.abhaId}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Age
          </label>
          <input
            type="number"
            name="age"
            value={patientData.age}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Gender
          </label>
          <select
            name="gender"
            value={patientData.gender}
            onChange={handleInputChange}
            className="form-select w-full"
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Contact
          </label>
          <input
            type="tel"
            name="contact"
            value={patientData.contact}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Emergency Contact
          </label>
          <input
            type="tel"
            name="emergencyContact"
            value={patientData.emergencyContact}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Address
          </label>
          <textarea
            name="address"
            value={patientData.address}
            onChange={handleInputChange}
            className="form-textarea w-full"
            rows="2"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Ward Type
          </label>
          <select
            name="wardType"
            value={patientData.wardType}
            onChange={handleInputChange}
            className="form-select w-full"
            required
          >
            {Object.entries(beds).map(([ward, status]) => (
              <option key={ward} value={ward} disabled={status.available === 0}>
                {ward} ({status.available} beds available)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Bed Number
          </label>
          <input
            type="text"
            name="bedNumber"
            value={patientData.bedNumber}
            onChange={handleInputChange}
            className="form-input w-full"
            required
            placeholder="Enter bed number"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Attending Doctor
          </label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="form-select w-full"
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id} disabled={doctor.availability !== 'Available'}>
                Dr. {doctor.name} - {doctor.department}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Admission Date
          </label>
          <input
            type="date"
            name="admissionDate"
            value={patientData.admissionDate}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Medical History
          </label>
          <textarea
            name="medicalHistory"
            value={patientData.medicalHistory}
            onChange={handleInputChange}
            className="form-textarea w-full"
            rows="2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Current Medications
          </label>
          <textarea
            name="currentMedications"
            value={patientData.currentMedications}
            onChange={handleInputChange}
            className="form-textarea w-full"
            rows="2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Allergies
          </label>
          <textarea
            name="allergies"
            value={patientData.allergies}
            onChange={handleInputChange}
            className="form-textarea w-full"
            rows="2"
          />
        </div>

        {/* Photo Capture Section */}
        <div className="mb-6 bg-gray-50 p-6 rounded-lg">
          <label className="block text-gray-700 text-lg font-bold mb-4">
            Patient Photo
            <span className="text-sm text-gray-500 ml-2">(Required for insurance verification)</span>
          </label>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Photo
              </label>
            </div>
          </div>

          {showCamera && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-2xl mx-auto"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {patientData.photo && !showCamera && (
            <div className="mt-4">
              <div className="relative w-64 h-64 border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={patientData.photo}
                  alt="Patient"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPatientData(prev => ({ ...prev, photo: null }))}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">Photo captured successfully</p>
            </div>
          )}
        </div>

        {/* Location Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              State
            </label>
            <select
              name="state"
              value={patientData.state}
              onChange={handleInputChange}
              className="form-select w-full"
              required
            >
              <option value="">Select State</option>
              {states.map(state => (
                <option key={state.state_id} value={state.state_id}>
                  {state.state_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              District
            </label>
            <select
              name="district"
              value={patientData.district}
              onChange={handleInputChange}
              className="form-select w-full"
              required
              disabled={!patientData.state}
            >
              <option value="">Select District</option>
              {districts.map(district => (
                <option key={district.district_id} value={district.district_id}>
                  {district.district_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Taluka
            </label>
            <input
              type="text"
              name="taluka"
              value={patientData.taluka}
              onChange={handleInputChange}
              className="form-input w-full"
              placeholder="Enter Taluka"
              required
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Admit Patient
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddPatient; 