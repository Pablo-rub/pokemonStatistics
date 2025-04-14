import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';
import useDraggable from '../hooks/useDraggable';
import PasswordStrengthBar from './PasswordStrengthBar'; // Importar el componente

export default function LoginDialog({ open, onClose, isSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // Añadir para registro
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();

  // Handle closing dialog
  const handleClose = () => {
    resetPosition();
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('Please enter both email and password.');
    }

    if (isSignUp && !displayName) {
      return setError('Please enter a display name.');
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
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
          
          {isSignUp && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label="Display Name"
              name="displayName"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiInputLabel-root': {
                  color: 'white',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'white',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#24CC9F',
                  },
                },
              }}
            />
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
                '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
                  transition: 'background-color 5000s ease-in-out 0s',
                  WebkitTextFillColor: 'white !important',
                  WebkitBoxShadow: '0 0 0px 1000px #221FC7 inset !important',
                },
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'white',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#24CC9F',
                },
              },
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
                '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
                  transition: 'background-color 5000s ease-in-out 0s',
                  WebkitTextFillColor: 'white !important',
                  WebkitBoxShadow: '0 0 0px 1000px #221FC7 inset !important',
                },
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'white',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#24CC9F',
                },
              },
            }}
          />
          
          {/* Mostrar la barra de fortaleza solo durante el registro */}
          {isSignUp && <PasswordStrengthBar password={password} />}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3, 
              mb: 2,
              backgroundColor: '#24CC9F',
              '&:hover': {
                backgroundColor: '#1aa37f',
              },
            }}
            disabled={loading}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          <Divider sx={{ 
            my: 2, 
            color: 'white', 
            '&::before, &::after': { 
              borderColor: 'rgba(255, 255, 255, 0.3)' 
            } 
          }}>or</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ 
              mt: 1, 
              mb: 2, 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.5)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
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