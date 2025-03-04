import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography variant="h4">
          Please sign in to view your profile
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Paper sx={{ padding: 3, maxWidth: 600, margin: '0 auto' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 3,
          marginBottom: 3
        }}>
          <Avatar
            src={currentUser.photoURL}
            sx={{ width: 100, height: 100 }}
          />
          <Box>
            <Typography variant="h5" sx={{ color: 'black' }}>
              {currentUser.displayName}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {currentUser.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ marginY: 2 }} />

        <Typography variant="h6" sx={{ color: 'black', marginBottom: 1 }}>
          Account Information
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Account created: {new Date(currentUser.metadata.creationTime).toLocaleDateString()}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Last sign in: {new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProfilePage;