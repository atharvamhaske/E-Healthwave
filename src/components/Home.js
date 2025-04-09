import React, { useState, useEffect } from 'react';

function Home() {
  const hospitalName = localStorage.getItem('hospitalName');
  const hospitalId = localStorage.getItem('hospitalId');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [patients, setPatients] = useState(() => {
    const savedPatients = localStorage.getItem('patients');
    return savedPatients ? JSON.parse(savedPatients) : [];
  });
  const [newPatient, setNewPatient] = useState({
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
    diagnosis: '',
    allergies: '',
    currentMedications: '',
    bedType: '',
    bedNumber: '',
    wardNumber: '',
    insuranceProvider: '',
    insuranceId: '',
    status: 'Active'
  });

  const [availableBeds, setAvailableBeds] = useState({
    general: { total: 100, available: 45 },
    private: { total: 50, available: 20 },
    icu: { total: 20, available: 5 },
    emergency: { total: 10, available: 3 }
  });

  useEffect(() => {
    localStorage.setItem('patients', JSON.stringify(patients));
  }, [patients]);

  const generatePatientId = () => {
    const prefix = 'PAT';
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateAbhaAdhaar = (type, value) => {
    if (type === 'abha' && value.length !== 14) {
      return 'ABHA ID must be 14 digits';
    }
    if (type === 'adhaar' && value.length !== 12) {
      return 'Adhaar ID must be 12 digits';
    }
    return '';
  };

  const handleAddPatient = (e) => {
    e.preventDefault();
    
    // Validate ABHA/Adhaar
    const abhaError = validateAbhaAdhaar('abha', newPatient.abhaId);
    const adhaarError = validateAbhaAdhaar('adhaar', newPatient.adhaarId);
    
    if (abhaError || adhaarError) {
      alert(abhaError || adhaarError);
      return;
    }

    // Validate required fields
    const requiredFields = ['name', 'age', 'gender', 'bloodGroup', 'mobileNumber', 'emergencyContact', 
      'address', 'city', 'state', 'pincode', 'diagnosis', 'bedType', 'bedNumber', 'wardNumber'];
    
    const missingFields = requiredFields.filter(field => !newPatient[field]);
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Update bed availability
    if (newPatient.bedType) {
      const bedTypeKey = newPatient.bedType.toLowerCase();
      setAvailableBeds(prev => ({
        ...prev,
        [bedTypeKey]: {
          ...prev[bedTypeKey],
          available: prev[bedTypeKey].available - 1
        }
      }));
    }

    const patientWithId = {
      ...newPatient,
      patientId: generatePatientId(),
      admissionDate: new Date().toISOString(),
      status: 'Active'
    };

    setPatients(prev => [...prev, patientWithId]);
    localStorage.setItem('patients', JSON.stringify([...patients, patientWithId]));
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
      diagnosis: '',
      allergies: '',
      currentMedications: '',
      bedType: '',
      bedNumber: '',
      wardNumber: '',
      insuranceProvider: '',
      insuranceId: '',
      status: 'Active'
    });
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto px-4 py-8">
        <div className="container mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome, {hospitalName}!
            </h1>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-700">
                Hospital ID: <span className="font-semibold">{hospitalId}</span>
              </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Patients</h3>
                <p className="text-3xl font-bold text-blue-600">{patients.length}</p>
                <p className="text-sm text-gray-500 mt-1">Active patients under care</p>
              </div>

              {Object.entries(availableBeds).map(([type, data]) => (
                <div key={type} className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Beds
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    {data.available}/{data.total}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Available/Total</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowAddPatientModal(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                Add New Patient
              </button>
            </div>
          </div>
        </div>

        {showAddPatientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold">Add New Patient</h2>
                <button
                  onClick={() => setShowAddPatientModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                <form id="patientForm" onSubmit={handleAddPatient} className="space-y-4">
                  {/* Identification Section */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Patient Identification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ABHA ID *</label>
                        <input
                          type="text"
                          name="abhaId"
                          value={newPatient.abhaId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          maxLength="14"
                          placeholder="14-digit ABHA ID"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adhaar ID *</label>
                        <input
                          type="text"
                          name="adhaarId"
                          value={newPatient.adhaarId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          maxLength="12"
                          placeholder="12-digit Adhaar ID"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={newPatient.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                        <input
                          type="number"
                          name="age"
                          value={newPatient.age}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={newPatient.gender}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
                        <select
                          name="bloodGroup"
                          value={newPatient.bloodGroup}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          name="mobileNumber"
                          value={newPatient.mobileNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact *</label>
                        <input
                          type="tel"
                          name="emergencyContact"
                          value={newPatient.emergencyContact}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
          </div>
        </div>
      </div>

                  {/* Address Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Address Information</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                        <textarea
                          name="address"
                          value={newPatient.address}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                          <input
                            type="text"
                            name="city"
                            value={newPatient.city}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                          <input
                            type="text"
                            name="state"
                            value={newPatient.state}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                          <input
                            type="text"
                            name="pincode"
                            value={newPatient.pincode}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>
          </div>

                  {/* Medical Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Medical Information</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis/Symptoms *</label>
                        <textarea
                          name="diagnosis"
                          value={newPatient.diagnosis}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                          <input
                            type="text"
                            name="allergies"
                            value={newPatient.allergies}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                          <input
                            type="text"
                            name="currentMedications"
                            value={newPatient.currentMedications}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                </div>
                </div>
              </div>

                  {/* Bed Allocation */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Bed Allocation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type *</label>
                        <select
                          name="bedType"
                          value={newPatient.bedType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Bed Type</option>
                          <option value="General">General</option>
                          <option value="Private">Private</option>
                          <option value="ICU">ICU</option>
                          <option value="Emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number *</label>
                        <input
                          type="text"
                          name="bedNumber"
                          value={newPatient.bedNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ward Number *</label>
                        <input
                          type="text"
                          name="wardNumber"
                          value={newPatient.wardNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                </div>
                </div>
              </div>

                  {/* Insurance (Optional) */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-3">Insurance Details (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                        <input
                          type="text"
                          name="insuranceProvider"
                          value={newPatient.insuranceProvider}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Insurance ID</label>
                        <input
                          type="text"
                          name="insuranceId"
                          value={newPatient.insuranceId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                </div>
                </div>
                </form>
              </div>

              <div className="border-t p-4 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPatientModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="patientForm"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add Patient
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

export default Home; 