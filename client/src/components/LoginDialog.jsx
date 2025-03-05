import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';
import { getAuthErrorMessage } from '../utils/errorMessages';
import PasswordStrengthBar from 'react-password-strength-bar';
import { Visibility, VisibilityOff } from '@mui/icons-material';

//todo
//poder mover la ventana
//recuperar contraseña
//que no se ponga blanco al hacer hover sobre una sugerencia

export default function LoginDialog({ open, onClose, isSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setShowPassword(false);
  };

  useEffect(() => {
    if (!open) {
      resetFields();
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      variant="login"
    >
      <DialogTitle>
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
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
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
                variant="containedSuccess"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
              <Button
                onClick={onClose}
                fullWidth
                variant="containedCancel"
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
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}