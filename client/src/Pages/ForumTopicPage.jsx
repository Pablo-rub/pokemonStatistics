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
  Alert
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from '../components/LoginDialog';
import axios from 'axios';

const ForumTopicPage = () => {
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
  
  // Fetch topic details and messages
  useEffect(() => {
    const fetchTopicDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/forum/topics/${topicId}`);
        setTopic(response.data.topic);
        setMessages(response.data.messages);
        setError(null);
      } catch (err) {
        console.error('Error fetching topic details:', err);
        setError('Failed to load topic. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopicDetails();
  }, [topicId]);
  
  // Scroll to bottom whenever messages change
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
      const response = await axios.post(`http://localhost:5000/api/forum/topics/${topicId}/messages`, {
        content: newMessage,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userAvatar: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`
      });
      
      // Add the new message to the list
      setMessages(prevMessages => [...prevMessages, response.data]);
      
      // Clear the input
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

  // Check if the message is from the current user
  const isCurrentUserMessage = (userId) => {
    return userId === currentUser?.uid;
  };

  return (
    <Box sx={{ 
      p: 3, 
      maxWidth: '1200px', 
      mx: 'auto',
      backgroundColor: '#221FC7',
      borderRadius: 2,
      color: 'white',
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2
      }}>
        <IconButton 
          onClick={() => navigate('/forum')}
          sx={{ color: 'white' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {topic?.title || 'Forum Topic'}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {loading ? (
        <Typography variant="body1" sx={{ color: 'white', textAlign: 'center' }}>
          Loading topic details...
        </Typography>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Box 
            sx={{ 
              flex: 1, 
              mb: 3, 
              overflow: 'auto',
              bgcolor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 1,
              p: 2
            }}
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
                        backgroundColor: "transparent" // Eliminar hover
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: isMine ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 1,
                      maxWidth: '70%'
                    }}>
                      <Avatar 
                        src={message.userAvatar} 
                        alt={message.userName}
                        sx={{ width: 36, height: 36 }}
                      />
                      <Box sx={{ 
                        maxWidth: 'calc(100% - 50px)'
                      }}>
                        {/* Nombre y timestamp */}
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
                            sx={{ fontWeight: 'bold', color: '#24CC9F' }}
                          >
                            {message.userName}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: isMine ? 0 : 2, mr: isMine ? 2 : 0 }}
                          >
                            {formatTimestamp(message.timestamp)}
                          </Typography>
                        </Box>

                        <Box sx={{ 
                          backgroundColor: isMine ? '#24CC9F' : 'rgba(255, 255, 255, 0.1)',
                          color: isMine ? 'black' : 'white',
                          padding: '8px 16px',
                          borderRadius: isMine 
                            ? '18px 18px 4px 18px' 
                            : '18px 18px 18px 4px',
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          "&:hover": {
                            backgroundColor: isMine ? '#24CC9F' : 'rgba(255, 255, 255, 0.1)'
                          }
                        }}>
                          <Typography variant="body1">
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
          
          {/* Entrada de mensaje o botón de login */}
          {currentUser ? (
            <Paper
              component="form"
              sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }}
              onSubmit={handleSendMessage}
            >
              <TextField
                fullWidth
                placeholder="Write your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                variant="standard"
                multiline
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  sx: { 
                    color: 'white',
                    p: 1,
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)'
                    }
                  }
                }}
              />
              <Button
                type="submit"
                color="primary"
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
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
                  width: 40,
                  height: 40,
                  borderRadius: '50%'
                }}
              >
                <SendIcon />
              </Button>
            </Paper>
          ) : (
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }}
            >
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                You need to sign in to participate in this discussion
              </Typography>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={() => setLoginDialogOpen(true)}
                sx={{ 
                  ml: 2,
                  bgcolor: '#24CC9F',
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#1bab85'
                  }
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
};

export default ForumTopicPage;