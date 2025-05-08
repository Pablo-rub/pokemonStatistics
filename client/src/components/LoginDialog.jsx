import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Paper,
  Avatar,
  Container,
  CircularProgress,
  Link,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GoogleIcon from '@mui/icons-material/Google';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../contexts/AuthContext';
import useDraggable from '../hooks/useDraggable';
import PasswordStrengthBar from './PasswordStrengthBar';

export default function LoginDialog({ open, onClose, isSignUp: initialIsSignUp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();

  // Update internal state when prop changes
  useEffect(() => {
    setIsSignUp(initialIsSignUp);
  }, [initialIsSignUp]);

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

    // Validación básica del formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      return setError('Please, include both email and password.');
    } else if (!emailRegex.test(email)) {
      return setError('Please, enter a valid email address.');
    }

    if (isSignUp && !displayName) {
      return setError('Please, enter a display name.');
    }

    // verificar longitud mínima de contraseña en registro
    if (isSignUp && password.length < 8) {
      return setError('The password must be at least 8 characters long.');
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

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
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
          transition: 'none',
          borderRadius: 12,
          overflow: 'hidden',
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
      aria-labelledby="login-dialog-title"
    >
      <DialogTitle 
        id="login-dialog-title"
        sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 0
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Typography>
        <IconButton 
          onClick={handleClose} 
          aria-label="cerrar" 
          sx={{ 
            color: 'white',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'rotate(90deg)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: 3,
          // oculta los spans vacíos que generan falsos errores de contraste
          '& span.notranslate': {
            display: 'none',
          },
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              width: '100%' 
            }}
          >
            <Avatar sx={{ 
              m: 1, 
              bgcolor: '#24CC9F', 
              width: 56, 
              height: 56,
              mb: 3  
            }}>
              {isSignUp ? <PersonOutlineIcon sx={{ fontSize: 32 }} /> : <LockOutlinedIcon sx={{ fontSize: 32 }} />}
            </Avatar>

            {error && (
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  width: '100%', 
                  backgroundColor: 'rgba(255, 87, 34, 0.1)', 
                  border: '1px solid rgba(255, 87, 34, 0.5)',
                  borderRadius: 2
                }}
              >
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Paper>
            )}
            
            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              sx={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2.5,
                animationDelay: '0.1s',
                animation: 'fadeIn 0.5s ease-in-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {isSignUp && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="displayName"
                  label="Nombre de usuario"
                  name="displayName"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ color: 'white' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mt: 0,
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
                        borderRadius: 2,
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
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus={!isMobile}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="email-helper-text"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'white' }} />
                    </InputAdornment>
                  ),
                }}
                helperText=" "
                FormHelperTextProps={{
                  id: "email-helper-text",
                  style: { display: 'none' }
                }}
                sx={{
                  mt: 0,
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
                      borderRadius: 2,
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
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-helper-text"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'white' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "hide password" : "show password"}
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        sx={{ color: 'white' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText=" "
                FormHelperTextProps={{
                  id: "password-helper-text",
                  style: { display: 'none' }
                }}
                sx={{
                  mt: 0,
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
                      borderRadius: 2,
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
              
              {/* Mostrar la barra de fortaleza de contraseña durante registro */}
              {isSignUp && <PasswordStrengthBar password={password} />}
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ 
                  mt: 2, 
                  mb: 2,
                  py: 1.2,
                  backgroundColor: '#24CC9F',
                  color: '#000', // texto negro
                  borderRadius: 2,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 10px rgba(36, 204, 159, 0.4)',
                  transition: 'all 0.3s',
                  '&:hover': {
                    backgroundColor: '#1aa37f',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 15px rgba(36, 204, 159, 0.5)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  isSignUp ? 'Create account' : 'Sign in'
                )}
              </Button>

              <Divider sx={{ 
                my: 1, 
                color: 'white', 
                '&::before, &::after': { 
                  borderColor: 'rgba(255, 255, 255, 0.3)' 
                } 
              }}>o</Divider>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={loading}
                aria-label="Sign in with Google"
                sx={{ 
                  py: 1.2,
                  color: 'white', 
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 'medium',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google"'}
              </Button>

              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                          setEmail('');
                          setPassword('');
                          setDisplayName('');
                          setError('');
                          setIsSignUp(false);
                        }}
                        sx={{
                          color: '#24CC9F',
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Sign in
                      </Link>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                          setEmail('');
                          setPassword('');
                          setDisplayName('');
                          setError('');
                          setIsSignUp(true);
                        }}
                        sx={{
                          color: '#24CC9F',
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </DialogContent>
    </Dialog>
  );
}