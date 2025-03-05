import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import { getAuthErrorMessage } from '../utils/errorMessages';

//todo
//when changing password: Cannot read properties of undefined (reading 'credential'); no permitir que sea la misma contraseña, boton de cancelar
//boton mostrar contraseña
//boton eliminar cuenta
//color cambiar contraseña

const ProfilePage = () => {
  const { currentUser, logout, reauthenticateWithCredential, updatePassword, EmailAuthProvider } = useAuth();
  const navigate = useNavigate();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        oldPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setSuccess('Password updated successfully');
      setTimeout(() => {
        setPasswordDialogOpen(false);
        setSuccess('');
      }, 2000);
    } catch (error) {
      setError(getAuthErrorMessage(error));
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

        {currentUser?.providerData[0]?.providerId === 'password' && (
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setPasswordDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Change Password
          </Button>
        )}

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handlePasswordChange} sx={{ mt: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button 
                fullWidth 
                variant="contained" 
                type="submit"
                sx={{ mt: 2 }}
              >
                Update Password
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default ProfilePage;