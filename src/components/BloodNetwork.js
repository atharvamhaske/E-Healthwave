import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import 'react-toastify/dist/ReactToastify.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

const E_RAKTKOSH_API = {
  tkn: "td73316c87-5091-450d-a659-c7c10b44f524/1",
  lang: "en",
  usrid: "4006891151",
  mode: "web",
  pltfrm: "apisetu",
  did: null,
  deptid: "98",
  srvid: "722",
  source: "UMANG",
  deptLat: 17.6764029,
  deptLong: 75.911143,
  bbType: "",
  radius: "100000",
  usag: null
};

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 17.6764029,
  lng: 75.911143
};

function BloodNetwork() {
  const [donors, setDonors] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [selectedBloodType, setSelectedBloodType] = useState('');
  const [searchRadius, setSearchRadius] = useState(100);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapError, setMapError] = useState(null);
  const [map, setMap] = useState(null);
  const [markerIcons, setMarkerIcons] = useState(null);
  const [newDonor, setNewDonor] = useState({
    name: '',
    bloodType: '',
    phone: '',
    email: '',
    lastDonation: '',
    location: null
  });

  // Initialize marker icons when Google Maps is loaded
  useEffect(() => {
    if (window.google) {
      setMarkerIcons({
        user: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        },
        bloodBank: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        },
        donor: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
    }
  }, []);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter(location);
          fetchNearbyBloodBanks(location.lat, location.lng);
          fetchNearbyDonors(location.lat, location.lng);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
        }
      );
    }
  }, []);

  const handleRegisterDonor = async () => {
    try {
      if (!newDonor.name || !newDonor.bloodType || !newDonor.phone || !userLocation) {
        toast.error('Please complete all required fields');
        return;
      }

      const donorData = {
        ...newDonor,
        location: userLocation,
        registeredAt: new Date().toISOString(),
        status: 'Available'
      };

      await addDoc(collection(db, 'bloodDonors'), donorData);
      toast.success('Successfully registered as a blood donor!');
      setRegisterDialogOpen(false);
      setNewDonor({
        name: '',
        bloodType: '',
        phone: '',
        email: '',
        lastDonation: '',
        location: null
      });
      
      // Refresh donors list
    if (userLocation) {
        fetchNearbyDonors(userLocation.lat, userLocation.lng);
      }
    } catch (error) {
      console.error('Error registering donor:', error);
      toast.error('Failed to register as donor');
    }
  };

  const fetchNearbyBloodBanks = async (lat, lng) => {
    try {
      setLoading(true);
      const apiParams = {
        ...E_RAKTKOSH_API,
        deptLat: lat,
        deptLong: lng,
        radius: searchRadius * 1000 // Convert to meters
      };

      const response = await axios.post('https://api.eraktkosh.in/BLDAHIMS/bloodbank/nearestBloodBanks', apiParams);
      
      if (response.data && response.data.data) {
        const formattedBanks = response.data.data.map(bank => ({
          ...bank,
          position: {
            lat: parseFloat(bank.latitude),
            lng: parseFloat(bank.longitude)
          }
        }));
        setBloodBanks(formattedBanks);
      } else {
        setBloodBanks([]);
        toast.error('No blood banks found in your area');
      }
    } catch (error) {
      console.error('Error fetching blood banks:', error);
      setBloodBanks([]);
      toast.error('Failed to fetch blood banks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyDonors = async (lat, lng) => {
    try {
      const response = await axios.get('/api/blood-network/nearby-donors', {
        params: {
          lat,
          lng,
          radius: searchRadius,
          bloodType: selectedBloodType
        }
      });
      setDonors(response.data);
    } catch (error) {
      console.error('Error fetching donors:', error);
      toast.error('Failed to fetch nearby donors');
    }
  };

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const onMapLoad = (map) => {
    setMap(map);
    setMapError(null);
  };

  const onMapError = () => {
    setMapError(true);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Blood Donor Network</h1>

        {/* Search Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Blood Type</InputLabel>
                <Select
                  value={selectedBloodType}
                  onChange={(e) => {
                    setSelectedBloodType(e.target.value);
                    if (userLocation) {
                      fetchNearbyDonors(userLocation.lat, userLocation.lng);
                    }
                  }}
                  label="Blood Type"
                >
                  <MenuItem value="">All Blood Types</MenuItem>
                  {bloodTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Radius (km)"
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => {
                  if (userLocation) {
                    fetchNearbyBloodBanks(userLocation.lat, userLocation.lng);
                    fetchNearbyDonors(userLocation.lat, userLocation.lng);
                  }
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </div>

        {/* Map */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          {mapError ? (
            <div className="h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
              <Typography color="error">
                Failed to load map. Please check your internet connection and try again.
              </Typography>
      </div>
          ) : (
            <LoadScript 
              googleMapsApiKey="AIzaSyA_rZBLRRfPXUdJ_eGNiUHwj-JqZWN6_Ig"
              onError={onMapError}
            >
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={13}
                onLoad={onMapLoad}
              >
                {/* User Location Marker */}
                {userLocation && markerIcons && (
                  <Marker
                    position={userLocation}
                    icon={markerIcons.user}
                  />
                )}

                {/* Blood Bank Markers */}
                {bloodBanks.map((bank, index) => (
                  <Marker
                    key={`bank-${index}`}
                    position={bank.position}
                    icon={markerIcons?.bloodBank}
                    onClick={() => setSelectedMarker(bank)}
                  />
                ))}

                {/* Donor Markers */}
                {donors.map((donor, index) => (
            <Marker
                    key={`donor-${index}`}
                    position={donor.location}
                    icon={markerIcons?.donor}
                    onClick={() => setSelectedMarker(donor)}
                  />
                ))}

                {/* Info Window */}
                {selectedMarker && (
                  <InfoWindow
                    position={selectedMarker.position || selectedMarker.location}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2">
                        {selectedMarker.name || selectedMarker.bloodBankName}
                      </h3>
                      <p className="mb-1">Blood Type: {selectedMarker.bloodType}</p>
                      {selectedMarker.bloodGroups && (
                        <div className="mb-1">
                          <p className="font-semibold">Available Blood Types:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedMarker.bloodGroups.map((group, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {group.bloodGroup}: {group.units} units
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-gray-600">
                        Contact: {selectedMarker.phone || selectedMarker.contactNo}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          )}
        </div>

        {/* Blood Banks List */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Nearby Blood Banks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bloodBanks.map((bank, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {bank.bloodBankName}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {bank.address}
                  </Typography>
                  <Typography variant="body2">
                    Contact: {bank.contactNo}
                  </Typography>
                  <Typography variant="body2">
                    Email: {bank.email}
                  </Typography>
                  <div className="mt-2">
                    <Typography variant="body2" color="textSecondary">
                      Available Blood Types:
                    </Typography>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bank.bloodGroups?.map((group, idx) => (
                        <Chip
                          key={idx}
                          label={`${group.bloodGroup}: ${group.units} units`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Register as Donor Button */}
        <div className="text-center mb-6">
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => setRegisterDialogOpen(true)}
          >
            Register as Blood Donor
          </Button>
                </div>

        {/* Register Donor Dialog */}
        <Dialog open={registerDialogOpen} onClose={() => {
          setRegisterDialogOpen(false);
          setNewDonor({
            name: '',
            bloodType: '',
            phone: '',
            email: '',
            lastDonation: '',
            location: null
          });
        }} maxWidth="sm" fullWidth>
          <DialogTitle>Register as Blood Donor</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} className="mt-2">
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={newDonor.name}
                  onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Blood Type</InputLabel>
                  <Select
                    value={newDonor.bloodType}
                    onChange={(e) => setNewDonor({ ...newDonor, bloodType: e.target.value })}
                    label="Blood Type"
                  >
                    {bloodTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={newDonor.phone}
                  onChange={(e) => setNewDonor({ ...newDonor, phone: e.target.value })}
                  placeholder="Enter with country code (e.g., +91)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Last Donation Date"
                  type="date"
                  value={newDonor.lastDonation}
                  onChange={(e) => setNewDonor({ ...newDonor, lastDonation: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setRegisterDialogOpen(false);
              setNewDonor({
                name: '',
                bloodType: '',
                phone: '',
                email: '',
                lastDonation: '',
                location: null
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleRegisterDonor} variant="contained" color="primary">
              Register
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}

export default BloodNetwork;