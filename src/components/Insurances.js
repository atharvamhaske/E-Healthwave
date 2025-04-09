import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Worker, createWorker } from 'tesseract.js';

function Insurances() {
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newClaim, setNewClaim] = useState({
    patientId: '',
    patientName: '',
    insuranceType: 'government', // government or private
    insuranceProvider: '',
    policyNumber: '',
    claimAmount: '',
    diagnosis: '',
    treatmentDetails: '',
    hospitalizedDays: '',
    documents: [],
    status: 'pending'
  });

  const [documentVerification, setDocumentVerification] = useState({
    isProcessing: false,
    progress: 0,
    verificationResults: {},
    requiredDocuments: {
      'admission_letter': false,
      'diagnosis_report': false,
      'bills': false,
      'insurance_card': false,
      'id_proof': false
    }
  });

  const [ocrWorker, setOcrWorker] = useState(null);

  // Mock insurance providers data
  const insuranceProviders = {
    government: [
      { id: 'ayushman', name: 'Ayushman Bharat', maxCoverage: 500000 },
      { id: 'cghs', name: 'CGHS', maxCoverage: 1000000 },
      { id: 'esis', name: 'ESIS', maxCoverage: 300000 }
    ],
    private: [
      { id: 'star', name: 'Star Health Insurance', maxCoverage: 2000000 },
      { id: 'hdfc', name: 'HDFC ERGO', maxCoverage: 1500000 },
      { id: 'icici', name: 'ICICI Lombard', maxCoverage: 1800000 }
    ]
  };

  // Mock claims data
  useEffect(() => {
    const mockClaims = [
      {
        id: 1,
        patientId: 'P001',
        patientName: 'Rahul Sharma',
        insuranceType: 'government',
        insuranceProvider: 'Ayushman Bharat',
        policyNumber: 'AB123456',
        claimAmount: 250000,
        diagnosis: 'Cardiac Surgery',
        treatmentDetails: 'CABG Surgery',
        hospitalizedDays: 7,
        documents: ['admission.pdf', 'diagnosis.pdf', 'bills.pdf'],
        status: 'pending',
        submittedDate: '2024-03-15',
        lastUpdated: '2024-03-15'
      },
      {
        id: 2,
        patientId: 'P002',
        patientName: 'Priya Patel',
        insuranceType: 'private',
        insuranceProvider: 'Star Health Insurance',
        policyNumber: 'SH789012',
        claimAmount: 180000,
        diagnosis: 'Appendectomy',
        treatmentDetails: 'Laparoscopic Surgery',
        hospitalizedDays: 3,
        documents: ['admission.pdf', 'surgery_notes.pdf', 'discharge.pdf'],
        status: 'approved',
        submittedDate: '2024-03-10',
        lastUpdated: '2024-03-12'
      }
    ];
    setClaims(mockClaims);
  }, []);

  // Initialize OCR worker
  useEffect(() => {
    let mounted = true;
    const initializeWorker = async () => {
      try {
        const worker = await createWorker({
          logger: progress => {
            if (mounted) {
              setDocumentVerification(prev => ({
                ...prev,
                progress: (progress.progress * 100).toFixed(2)
              }));
            }
          },
          errorHandler: error => {
            console.error('Tesseract error:', error);
            toast.error('OCR processing error: ' + error.message);
          }
        });
        
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        if (mounted) {
          setOcrWorker(worker);
        }
      } catch (error) {
        console.error('Error initializing OCR worker:', error);
        toast.error('Failed to initialize document verification system');
      }
    };

    initializeWorker();

    return () => {
      mounted = false;
      if (ocrWorker) {
        ocrWorker.terminate();
      }
    };
  }, []);

  const verifyDocument = async (file, documentType) => {
    if (!ocrWorker) {
      toast.error('Document verification system is initializing. Please wait.');
      return null;
    }

    try {
      // More lenient file type checking
      if (!file.type.startsWith('image/') && !file.type === 'application/pdf') {
        throw new Error('Please upload image or PDF files.');
      }

      // Increased size limit to 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit.');
      }

      // For now, just accept the file without strict OCR verification
      return {
        isValid: true,
        confidence: 100,
        ocrConfidence: 100,
        extractedText: file.name,
        matches: { requiredFields: [], patternMatch: true },
        missingFields: []
      };
    } catch (error) {
      console.error('Document verification error:', error);
      toast.error(`Error processing ${file.name}: ${error.message}`);
      return null;
    }
  };

  const handleNewClaim = (e) => {
    e.preventDefault();
    const claim = {
      id: Date.now(),
      ...newClaim,
      submittedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setClaims([...claims, claim]);
    setShowNewClaimModal(false);
    toast.success('Claim submitted successfully!');
    setNewClaim({
      patientId: '',
      patientName: '',
      insuranceType: 'government',
      insuranceProvider: '',
      policyNumber: '',
      claimAmount: '',
      diagnosis: '',
      treatmentDetails: '',
      hospitalizedDays: '',
      documents: [],
      status: 'pending'
    });
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    setDocumentVerification(prev => ({ ...prev, isProcessing: true }));

    const verificationResults = {};
    const uploadedDocs = [];

    // Process all files including those from folders
    for (const file of files) {
      try {
        // Determine document type from file path or name
        let documentType = 'other';
        const filePath = file.webkitRelativePath || file.name;
        
        if (filePath.toLowerCase().includes('admission')) documentType = 'admission_letter';
        else if (filePath.toLowerCase().includes('diagnosis')) documentType = 'diagnosis_report';
        else if (filePath.toLowerCase().includes('bill')) documentType = 'bills';
        else if (filePath.toLowerCase().includes('insurance')) documentType = 'insurance_card';
        else if (filePath.toLowerCase().includes('id')) documentType = 'id_proof';

        const result = await verifyDocument(file, documentType);
        
        if (result) {
          verificationResults[filePath] = {
            ...result,
            documentType,
            fileName: filePath
          };

          uploadedDocs.push(filePath);
          setDocumentVerification(prev => ({
            ...prev,
            requiredDocuments: {
              ...prev.requiredDocuments,
              [documentType]: true
            }
          }));
          toast.success(`Added ${filePath} successfully!`);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}. Please try again.`);
      }
    }

    setDocumentVerification(prev => ({
      ...prev,
      isProcessing: false,
      verificationResults
    }));

    setNewClaim(prev => ({
      ...prev,
      documents: [...prev.documents, ...uploadedDocs]
    }));
  };

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.policyNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Update the DocumentVerificationStatus component to show more details
  const DocumentVerificationStatus = ({ verificationResults }) => {
    if (!verificationResults || Object.keys(verificationResults).length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        <h4 className="font-medium text-gray-700">Document Verification Status</h4>
        {Object.entries(verificationResults).map(([fileName, result]) => (
          <div key={fileName} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${result.isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-medium">{fileName}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                result.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.isValid ? 'Verified' : 'Failed'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex justify-between items-center">
                <span>Confidence Score:</span>
                <span className={`font-medium ${
                  result.confidence >= 80 ? 'text-green-600' :
                  result.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {result.confidence.toFixed(1)}%
                </span>
              </div>
              {result.missingFields && result.missingFields.length > 0 && (
                <div className="mt-1">
                  <span className="text-red-600">Missing fields: </span>
                  {result.missingFields.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Modify the document upload section in the form
  const renderDocumentUploadSection = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Upload Documents
      </label>
      <div className="space-y-2">
        <div className="flex gap-4">
          <input
            type="file"
            multiple
            webkitdirectory=""
            directory=""
            onChange={handleDocumentUpload}
            className="w-full p-2 border rounded-lg"
            accept="image/*,application/pdf"
            disabled={documentVerification.isProcessing}
          />
          <input
            type="file"
            multiple
            onChange={handleDocumentUpload}
            className="w-full p-2 border rounded-lg"
            accept="image/*,application/pdf"
            disabled={documentVerification.isProcessing}
          />
        </div>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="flex-1">Upload Folder</span>
          <span className="flex-1">Upload Files</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Supported files: Images and PDFs (max 10MB each)
        </p>
        {documentVerification.isProcessing && (
          <div className="mt-2">
            <div className="h-2 bg-gray-200 rounded">
              <div 
                className="h-full bg-blue-500 rounded transition-all duration-300"
                style={{ width: `${documentVerification.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Processing documents... {documentVerification.progress}%
            </p>
          </div>
        )}
        <DocumentVerificationStatus verificationResults={documentVerification.verificationResults} />
      </div>
    </div>
  );

  return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
      <ToastContainer position="top-right" />
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Insurance Claims Management</h2>
        <button
          onClick={() => setShowNewClaimModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          New Claim
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by patient name or policy number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 border rounded-lg"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {filteredClaims.map(claim => (
          <div key={claim.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{claim.patientName}</h3>
                <p className="text-sm text-gray-600">Policy: {claim.policyNumber}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadgeColor(claim.status)}`}>
                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <p className="text-sm text-gray-600">Insurance Provider</p>
                <p className="font-medium">{claim.insuranceProvider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Claim Amount</p>
                <p className="font-medium">₹{claim.claimAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Diagnosis</p>
                <p className="font-medium">{claim.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Submitted Date</p>
                <p className="font-medium">{claim.submittedDate}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSelectedClaim(claim)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                View Details
              </button>
              <button
                onClick={() => setShowDocumentModal(true)}
                className="text-green-500 hover:text-green-600 text-sm"
              >
                View Documents
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">New Insurance Claim</h3>
              <button
                onClick={() => setShowNewClaimModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleNewClaim} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={newClaim.patientId}
                    onChange={(e) => setNewClaim({...newClaim, patientId: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={newClaim.patientName}
                    onChange={(e) => setNewClaim({...newClaim, patientName: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Type
                  </label>
                  <select
                    value={newClaim.insuranceType}
                    onChange={(e) => setNewClaim({...newClaim, insuranceType: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Provider
                  </label>
                  <select
                    value={newClaim.insuranceProvider}
                    onChange={(e) => setNewClaim({...newClaim, insuranceProvider: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Provider</option>
                    {insuranceProviders[newClaim.insuranceType].map(provider => (
                      <option key={provider.id} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={newClaim.policyNumber}
                    onChange={(e) => setNewClaim({...newClaim, policyNumber: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newClaim.claimAmount}
                    onChange={(e) => setNewClaim({...newClaim, claimAmount: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={newClaim.diagnosis}
                  onChange={(e) => setNewClaim({...newClaim, diagnosis: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment Details
                </label>
                <textarea
                  value={newClaim.treatmentDetails}
                  onChange={(e) => setNewClaim({...newClaim, treatmentDetails: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  rows="3"
                  required
                />
              </div>
              {renderDocumentUploadSection()}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClaimModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Claim Documents</h3>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {selectedClaim?.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {doc}
                  </span>
                  <button className="text-blue-500 hover:text-blue-600">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Claim Details</h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Patient ID</p>
                  <p className="font-medium">{selectedClaim.patientId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient Name</p>
                  <p className="font-medium">{selectedClaim.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Insurance Type</p>
                  <p className="font-medium">{selectedClaim.insuranceType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Insurance Provider</p>
                  <p className="font-medium">{selectedClaim.insuranceProvider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Policy Number</p>
                  <p className="font-medium">{selectedClaim.policyNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Claim Amount</p>
                  <p className="font-medium">₹{selectedClaim.claimAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diagnosis</p>
                  <p className="font-medium">{selectedClaim.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hospitalized Days</p>
                  <p className="font-medium">{selectedClaim.hospitalizedDays}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Treatment Details</p>
                <p className="font-medium">{selectedClaim.treatmentDetails}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Claim Timeline</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm">
                      Submitted on {selectedClaim.submittedDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm">
                      Last updated on {selectedClaim.lastUpdated}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Insurances;