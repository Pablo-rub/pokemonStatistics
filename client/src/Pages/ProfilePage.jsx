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
  Alert,
  IconButton,
  DialogActions,
  Card,
  CardContent,
  Container,
  useTheme,
  useMediaQuery
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
import { 
  Visibility, 
  VisibilityOff,
  DeleteForever,
  EditOutlined,
  Badge,
  VerifiedUser
} from '@mui/icons-material';

const ProfilePage = () => {
  const { currentUser, changePassword, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const isGoogleAccount = currentUser?.providerData[0]?.providerId === 'google.com';

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
      setError('New password must be at least 6 characters long');
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('Password updated successfully');
      setTimeout(() => {
        setPasswordDialogOpen(false);
        setSuccess('');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (error) {
      setError(getAuthErrorMessage(error));
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isGoogleAccount) {
        if (deleteConfirmText !== 'delete') {
          setError('Please type "delete" to confirm');
          return;
        }
        await deleteAccount();
      } else {
        if (!deletePassword) {
          setError('Please enter your password');
          return;
        }
        await deleteAccount(deletePassword);
      }
      navigate('/');
    } catch (error) {
      setError(getAuthErrorMessage(error));
    }
  };

  const resetPasswordDialog = () => {
    setPasswordDialogOpen(false);
    setError('');
    setSuccess('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const resetDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setError('');
    setDeletePassword('');
    setDeleteConfirmText('');
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            backgroundColor: '#221FC7', 
            color: 'white',
          }}
        >
          <Typography variant="h4" sx={{ mb: 2 }}>
            Please sign in to view your profile
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
            sx={{ 
              mt: 2, 
              backgroundColor: '#24CC9F',
              '&:hover': {
                backgroundColor: '#1FA082',
              }
            }}
          >
            Sign In
          </Button>
        </Paper>
      </Container>
    );
  }

  const userInfo = [
    {
      icon: <AccountCircleIcon fontSize="large" />,
      label: 'Display Name',
      value: currentUser.displayName || 'Not set'
    },
    {
      icon: <EmailIcon fontSize="large" />,
      label: 'Email',
      value: currentUser.email
    },
    {
      icon: <Badge fontSize="large" />,
      label: 'Provider',
      value: currentUser.providerData[0].providerId === 'password' 
             ? 'Email/Password' 
             : 'Google'
    },
    {
      icon: <VerifiedUser fontSize="large" />,
      label: 'Email Verified',
      value: currentUser.emailVerified ? 'Yes' : 'No'
    },
    {
      icon: <CalendarTodayIcon fontSize="large" />,
      label: 'Account Created',
      value: new Date(currentUser.metadata.creationTime).toLocaleString()
    },
    {
      icon: <AccessTimeIcon fontSize="large" />,
      label: 'Last Sign In',
      value: new Date(currentUser.metadata.lastSignInTime).toLocaleString()
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          color: 'white',
          fontWeight: 'bold',
          textAlign: { xs: 'center', md: 'left' },
          mb: 4
        }}
      >
        Your Profile
      </Typography>

      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#221FC7',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Hero section with avatar and name */}
        <Box 
          sx={{ 
            p: { xs: 3, md: 5 },
            backgroundColor: '#1A1896',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 3
          }}
        >
          <Avatar
            src={currentUser.photoURL}
            alt={currentUser.displayName || 'User'}
            sx={{ 
              width: { xs: 100, md: 140 }, 
              height: { xs: 100, md: 140 },
              border: '4px solid #24CC9F',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              }
            }}
          />
          
          <Box sx={{ 
            flexGrow: 1,
            textAlign: { xs: 'center', md: 'left' }
          }}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: 'white', 
                fontWeight: 'bold',
                mb: 1
              }}
            >
              {currentUser.displayName || 'User'}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#24CC9F',
                mb: 2
              }}
            >
              {currentUser.email}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                mb: 2
              }}
            >
              User ID: {currentUser.uid}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ 
              color: 'white', 
              borderColor: 'white',
              '&:hover': {
                borderColor: '#24CC9F',
                backgroundColor: 'rgba(36, 204, 159, 0.1)',
              }
            }}
          >
            Logout
          </Button>
        </Box>

        {/* User information cards */}
        <Box sx={{ p: { xs: 3, md: 5 } }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'white', 
              mb: 3,
              borderBottom: '2px solid #24CC9F',
              pb: 1,
              display: 'inline-block'
            }}
          >
            Account Information
          </Typography>
          
          <Grid container spacing={3}>
            {userInfo.map((info, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    height: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-5px)'
                    }
                  }}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }}>
                    <Box 
                      sx={{ 
                        color: '#24CC9F',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(36, 204, 159, 0.1)',
                        mb: 2
                      }}
                    >
                      {info.icon}
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        mb: 0.5
                      }}
                    >
                      {info.label}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'medium',
                        wordBreak: 'break-word'
                      }}
                    >
                      {info.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Actions section */}
          <Box 
            sx={{ 
              mt: 5, 
              pt: 3,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'center',
              gap: 2
            }}
          >
            {currentUser?.providerData[0]?.providerId === 'password' && (
              <Button
                variant="contained"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ 
                  backgroundColor: '#24CC9F',
                  '&:hover': {
                    backgroundColor: '#1FA082',
                  }
                }}
              >
                Change Password
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<DeleteForever />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ 
                color: '#FF6B6B', 
                borderColor: '#FF6B6B',
                '&:hover': {
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderColor: '#FF5252',
                }
              }}
            >
              Delete Account
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Password Change Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={resetPasswordDialog}
        PaperProps={{
          sx: {
            backgroundColor: '#221FC7',
            color: 'white',
            borderRadius: 2,
            maxWidth: 'sm',
            width: '100%'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <LockIcon sx={{ color: '#24CC9F' }} />
          <Typography variant="h6">Change Password</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box component="form" onSubmit={handlePasswordChange} sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField
              fullWidth
              label="Current Password"
              type={showOldPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    edge="end"
                    sx={{ color: 'white' }}
                  >
                    {showOldPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />
            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    sx={{ color: 'white' }}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{ color: 'white' }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={resetPasswordDialog} 
            sx={{ 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            sx={{ 
              backgroundColor: '#24CC9F',
              '&:hover': {
                backgroundColor: '#1FA082',
              }
            }}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={resetDeleteDialog}
        PaperProps={{
          sx: {
            backgroundColor: '#221FC7',
            color: 'white',
            borderRadius: 2,
            maxWidth: 'sm',
            width: '100%'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: '#FF6B6B'
        }}>
          <DeleteForever />
          <Typography variant="h6">Delete Account</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Typography sx={{ mb: 2, color: '#FF6B6B', fontWeight: 'bold' }}>
            Warning: This action cannot be undone.
          </Typography>
          <Typography sx={{ mb: 3, color: 'white' }}>
            All your saved replays and account data will be permanently deleted. Are you absolutely sure you want to proceed?
          </Typography>
          {isGoogleAccount ? (
            <TextField
              fullWidth
              label="Type 'delete' to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              margin="normal"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />
          ) : (
            <TextField
              fullWidth
              label="Confirm Password"
              type={showDeletePassword ? 'text' : 'password'}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    edge="end"
                    sx={{ color: 'white' }}
                  >
                    {showDeletePassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={resetDeleteDialog}
            sx={{ 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            variant="contained"
            color="error"
            startIcon={<DeleteForever />}
            sx={{
              backgroundColor: '#FF6B6B',
              '&:hover': {
                backgroundColor: '#FF5252',
              }
            }}
          >
            Delete My Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;