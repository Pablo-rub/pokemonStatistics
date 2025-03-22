import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { useAuth } from '../contexts/AuthContext';
import useDraggable from '../hooks/useDraggable';

export default function LoginDialog({ open, onClose, isSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, signInWithGoogle } = useAuth();

  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();

  // Handle closing dialog
  const handleClose = () => {
    resetPosition();
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('Please enter both email and password.');
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      handleClose();
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      handleClose();
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        ref,
        style: {
          ...style,
          backgroundColor: '#221FC7',
          transition: 'none'
        },
        onMouseDown: handleMouseDown,
        sx: {
          '& .MuiDialogTitle-root': {
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            padding: '16px 24px',
            color: 'white'
          }
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              color: 'white',
              '& .MuiInputLabel-root': {
                color: 'white',
              },
              '& .MuiInputBase-input': {
                color: 'white',
              }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              color: 'white',
              '& .MuiInputLabel-root': {
                color: 'white',
              },
              '& .MuiInputBase-input': {
                color: 'white',
              }
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="containedSuccess"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          <Divider sx={{ my: 2, color: 'white', '&::before, &::after': { borderColor: 'white' } }}>or</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ mt: 1, mb: 2, color: 'white', borderColor: 'white' }}
            disabled={loading}
          >
            {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: 'white' }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}