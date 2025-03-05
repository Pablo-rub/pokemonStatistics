import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';

function FinishSignIn() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isSignInWithEmailLink, completeEmailSignIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const emailFromStorage = window.localStorage.getItem('emailForSignIn');
    if (emailFromStorage) {
      setEmail(emailFromStorage);
      handleSignIn(emailFromStorage);
    } else {
      setLoading(false);
    }
  }, []);

  const handleSignIn = async (emailToUse) => {
    if (!isSignInWithEmailLink(window.location.href)) {
      setError('Invalid sign in link');
      setLoading(false);
      return;
    }

    try {
      await completeEmailSignIn(emailToUse, window.location.href);
      navigate('/');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    handleSignIn(email);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Complete Sign In
      </Typography>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          type="email"
        />
        <Button
          fullWidth
          variant="contained"
          type="submit"
          sx={{ mt: 2 }}
        >
          Complete Sign In
        </Button>
      </form>
    </Box>
  );
}

export default FinishSignIn;