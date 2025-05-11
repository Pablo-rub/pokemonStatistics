import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Divider, 
  Paper, 
  Button, 
  TextField, 
  Avatar, 
  List,
  ListItem,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from '../components/LoginDialog';
import axios from 'axios';

export default function ForumTopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  useEffect(() => {
    axios.get(`/api/forum/topics/${topicId}`)
      .then(res => {
        setTopic(res.data.topic);
        setMessages(res.data.messages);
        setError(null);
      })
      .catch(() => setError('Failed to load topic. Please try again later.'))
      .finally(() => setLoading(false));
  }, [topicId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!currentUser) {
      setLoginDialogOpen(true);
      return;
    }
    
    if (!newMessage.trim() || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      const response = await axios.post(`/api/forum/topics/${topicId}/messages`, {
        content: newMessage,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userAvatar: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`
      });
      
      setMessages(prevMessages => [...prevMessages, response.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCurrentUserMessage = (userId) => {
    return userId === currentUser?.uid;
  };

  return (
    <Box
      component="main"
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        maxWidth: '1200px', 
        mx: 'auto',
        backgroundColor: '#221FC7',
        borderRadius: 2,
        color: 'white',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2
      }}>
        <IconButton 
          onClick={() => navigate('/forum')}
          aria-label="Back to forum"
          sx={{ color: 'white' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ 
          fontWeight: 'bold',
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
        }}>
          {topic?.title || 'Forum Topic'}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {loading ? (
        <Typography variant="body1" sx={{ color: 'white', textAlign: 'center' }}>
          Loading topic details...
        </Typography>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <>
          <Box 
            sx={{ 
              flex: 1, 
              mb: 3, 
              overflow: 'auto',
              bgcolor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 1,
              p: { xs: 1, sm: 2 }
            }}
            role="log"
            aria-label="Forum messages"
            aria-live="polite"
          >
            <List sx={{ width: '100%' }}>
              {messages.map((message) => {
                const isMine = isCurrentUserMessage(message.userId);
                
                return (
                  <ListItem 
                    key={message.id} 
                    disableGutters
                    disablePadding
                    sx={{ 
                      mb: 2,
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      padding: 0,
                      "&:hover": { 
                        backgroundColor: "transparent"
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: isMine ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 1,
                      maxWidth: { xs: '90%', sm: '80%', md: '70%' }
                    }}>
                      <Avatar 
                        src={message.userAvatar} 
                        alt={`${message.userName}'s avatar`} 
                        sx={{ 
                          width: { xs: 32, sm: 36 }, 
                          height: { xs: 32, sm: 36 },
                          display: { xs: isMine ? 'none' : 'block', sm: 'block' }
                        }}
                      />
                      <Box sx={{ 
                        maxWidth: 'calc(100% - 50px)'
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: isMine ? 'row-reverse' : 'row',
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          mb: 0.5,
                          px: 1
                        }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: '#24CC9F',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                          >
                            {message.userName}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              ml: isMine ? 0 : 2, 
                              mr: isMine ? 2 : 0,
                              fontSize: { xs: '0.65rem', sm: '0.7rem' }
                            }}
                          >
                            {formatTimestamp(message.timestamp)}
                          </Typography>
                        </Box>

                        <Box sx={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          color: isMine ? '#000000' : '#ffffff',
                          padding: { xs: '6px 12px', sm: '8px 16px' },
                          borderRadius: isMine 
                            ? '18px 18px 4px 18px' 
                            : '18px 18px 18px 4px',
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          "&:hover": {
                            backgroundColor: isMine ? '#24CC9F' : 'rgba(255, 255, 255, 0.15)'
                          }
                        }}>
                          <Typography 
                            variant="body1"
                            sx={{ 
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              lineHeight: 1.5
                            }}
                          >
                            {message.content}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </ListItem>
                );
              })}
              <div ref={messagesEndRef} />
            </List>
          </Box>
          
          {currentUser ? (
            <Paper
              component="form"
              sx={{
                p: { xs: 1, sm: 1.5 },
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }}
              onSubmit={handleSendMessage}
              elevation={2}
            >
              <TextField
                fullWidth
                id="message-input"
                aria-label="Message content"
                placeholder="Write your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                variant="standard"
                multiline
                maxRows={4}
                inputProps={{
                  'aria-label': 'Message content',
                  'aria-description': 'Type your message here'
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: { 
                    color: 'white',
                    p: 1,
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }
                }}
              />
              <Button
                type="submit"
                color="primary"
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                aria-label="Send message"
                sx={{ 
                  ml: 1,
                  bgcolor: '#24CC9F',
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#1bab85'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(36, 204, 159, 0.5)',
                    color: 'rgba(0, 0, 0, 0.5)'
                  },
                  minWidth: 'unset',
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  borderRadius: '50%'
                }}
              >
                <SendIcon fontSize={isMobile ? "small" : "medium"} />
              </Button>
            </Paper>
          ) : (
            <Paper
              sx={{
                p: { xs: 1.5, sm: 2 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'space-between' },
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                gap: { xs: 1.5, sm: 2 }
              }}
              elevation={2}
            >
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: { xs: 'center', sm: 'left' },
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                You need to sign in to participate in this discussion
              </Typography>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={() => setLoginDialogOpen(true)}
                aria-label="Sign in to participate"
                sx={{ 
                  bgcolor: '#24CC9F',
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#1bab85'
                  },
                  minWidth: { xs: '100%', sm: 'auto' }
                }}
              >
                Sign In
              </Button>
            </Paper>
          )}
        </>
      )}
      
      <LoginDialog 
        open={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)}
        isSignUp={false}
      />
    </Box>
  );
}