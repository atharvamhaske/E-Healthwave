import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { LocalHospital, Group, MonetizationOn } from '@mui/icons-material';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    patients: 0,
    doctors: 0,
    connectedHospitals: []
  });
  const [user] = useState(JSON.parse(localStorage.getItem('user')));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardResponse, hospitalsResponse] = await Promise.all([
          axios.get('/api/hospital/dashboard'),
          axios.get('/api/hospital/connections')
        ]);

        setDashboardData({
          patients: dashboardResponse.data.patients,
          doctors: dashboardResponse.data.doctors,
          connectedHospitals: hospitalsResponse.data.hospitals
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const handleConnect = async (hospitalId) => {
    try {
      await axios.post('/api/hospital/connect', { hospitalId });
      // Refresh the connected hospitals list
      const response = await axios.get('/api/hospital/connections');
      setDashboardData(prev => ({
        ...prev,
        connectedHospitals: response.data.hospitals
      }));
    } catch (error) {
      console.error('Error connecting to hospital:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Welcome Message */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography component="h1" variant="h4" color="primary" gutterBottom>
              Welcome, {user?.name}
            </Typography>
          </Paper>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Group sx={{ mr: 1 }} />
                <Typography variant="h6">Patients</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.patients}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocalHospital sx={{ mr: 1 }} />
                <Typography variant="h6">Doctors</Typography>
              </Box>
              <Typography variant="h4">{dashboardData.doctors}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MonetizationOn sx={{ mr: 1 }} />
                <Typography variant="h6">Connected Hospitals</Typography>
              </Box>
              <Typography variant="h4">
                {dashboardData.connectedHospitals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Connected Hospitals */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hospital Network
            </Typography>
            <List>
              {dashboardData.connectedHospitals.map((hospital) => (
                <React.Fragment key={hospital.id}>
                  <ListItem>
                    <ListItemText
                      primary={hospital.name}
                      secondary={hospital.location}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleConnect(hospital.id)}
                    >
                      {hospital.isConnected ? 'Connected' : 'Connect'}
                    </Button>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
