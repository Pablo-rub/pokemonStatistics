import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
  Button,
  Grid,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!currentUser) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography variant="h4">
          Please sign in to view your profile
        </Typography>
      </Box>
    );
  }

  const userInfo = [
    {
      icon: <AccountCircleIcon />,
      label: 'Display Name',
      value: currentUser.displayName
    },
    {
      icon: <EmailIcon />,
      label: 'Email',
      value: currentUser.email
    },
    {
      icon: <CalendarTodayIcon />,
      label: 'Account Created',
      value: new Date(currentUser.metadata.creationTime).toLocaleString()
    },
    {
      icon: <AccessTimeIcon />,
      label: 'Last Sign In',
      value: new Date(currentUser.metadata.lastSignInTime).toLocaleString()
    }
  ];

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Paper sx={{ 
        padding: 3, 
        maxWidth: 800, 
        margin: '0 auto',
        backgroundColor: '#C7ADBE'
      }}>
        {/* Profile Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 3,
          marginBottom: 3
        }}>
          <Avatar
            src={currentUser.photoURL}
            sx={{ 
              width: 120, 
              height: 120,
              border: '4px solid white'
            }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ color: 'black', fontWeight: 'bold' }}>
              {currentUser.displayName}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {currentUser.email}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ 
              borderColor: 'black',
              color: 'black',
              '&:hover': {
                borderColor: 'black',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            Logout
          </Button>
        </Box>

        <Divider sx={{ marginY: 3 }} />

        {/* User Information Grid */}
        <Grid container spacing={3}>
          {userInfo.map((info, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                padding: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 1
              }}>
                <Box sx={{ color: 'black' }}>
                  {info.icon}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {info.label}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'black' }}>
                    {info.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Additional Information Section */}
        <Box sx={{ marginTop: 3 }}>
          <Typography variant="h6" sx={{ color: 'black', marginBottom: 2 }}>
            Account Details
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            User ID: {currentUser.uid}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Email Verified: {currentUser.emailVerified ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Provider: {currentUser.providerData[0].providerId}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProfilePage;