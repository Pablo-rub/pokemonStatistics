import React, { useState, useEffect, useCallback, useRef } from 'react';
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
//forgot password no va el enlace
//el movimiento no es fluido con respecto al cursor

export default function LoginDialog({ open, onClose, isSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [dialogPosition, setDialogPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const paperRef = useRef(null);

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
      onClose();
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
      setDialogPosition(null);
    }
  }, [open]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.MuiDialogTitle-root')) {
      // Usamos el ref del Paper para obtener sus dimensiones
      const rect = paperRef.current?.getBoundingClientRect();
      if (rect) {
        // Si no tenemos posición inicial, la establecemos según la posición actual
        if (!dialogPosition) {
          setDialogPosition({
            x: rect.left,
            y: rect.top
          });
        }
        setIsDragging(true);
        // Calculamos el offset según la posición del cursor dentro del Paper
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setDialogPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onMouseDown={handleMouseDown}
      PaperProps={{
        ref: paperRef,
        sx: {
          position: dialogPosition ? 'fixed' : 'static',
          left: dialogPosition?.x,
          top: dialogPosition?.y,
          cursor: isDragging ? 'grabbing' : 'grab',
          margin: dialogPosition ? 0 : 'auto',
          transition: 'none',
        }
      }}
    >
      <DialogTitle>
        {isSignUp ? 'Create Account' : 'Sign In'}
      </DialogTitle>
      <DialogContent>
        {/* Contenido del formulario, incluyendo campos, botones, etc. */}
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
        {!isSignUp && (
          <Button
            sx={{ mt: 1 }}
            onClick={() => setShowForgotPassword(true)}
            color="primary"
          >
            Forgot Password?
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}