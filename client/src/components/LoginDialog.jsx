import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  Alert
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';
import { getAuthErrorMessage } from '../utils/errorMessages';
import PasswordStrengthBar from 'react-password-strength-bar';

//todo
//accesibilidad sign in and sign up

export default function LoginDialog({ open, onClose, isSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (error) {
      setError(getAuthErrorMessage(error));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose(); // Close dialog after successful Google sign in
    } catch (error) {
      setError(error.message);
    }
  };

  const textFieldStyle = {
    '& .MuiInputLabel-root': {
      color: '#000000',
      '&.Mui-focused': {
        color: '#000000',
      },
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#000000',
      },
      '&:hover fieldset': {
        borderColor: '#000000',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#000000',
      },
    },
    '& .MuiInputBase-input': {
      color: '#000000',
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#C7ADBE'
        }
      }}
    >
      <DialogTitle sx={{ color: '#000000' }}>
        {isSignUp ? 'Create Account' : 'Sign In'}
      </DialogTitle>
      <DialogContent>
        {(
          <Box component="form" onSubmit={handleEmailAuth} sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {isSignUp && (
              <>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  margin="normal"
                  required
                  sx={textFieldStyle}
                />
              </>
            )}
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              sx={textFieldStyle}
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              sx={textFieldStyle}
            />

            {isSignUp && password.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <PasswordStrengthBar
                  password={password}
                  minLength={6}
                  scoreWords={['Too weak', 'Weak', 'Okay', 'Good', 'Strong']}
                  shortScoreWord={'Too short'}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 2 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  bgcolor: '#24CC9F',
                  color: '#000000',
                  '&:hover': {
                    bgcolor: '#1fb589',
                  }
                }}
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
              <Button
                onClick={onClose}
                fullWidth
                variant="contained"
                sx={{ 
                  bgcolor: '#E9A5A5',
                  color: '#000000',
                  '&:hover': {
                    bgcolor: '#d49494',
                  }
                }}
              >
                Cancel
              </Button>
            </Box>
            
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                OR
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn} // Use the new handler
              sx={{ 
                mb: 2,
                borderColor: '#000000',
                color: '#000000',
                '&:hover': {
                  borderColor: '#000000',
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              Continue with Google
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}