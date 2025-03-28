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

// Datos de muestra para mensajes
const sampleMessages = [
  {
    id: 1,
    author: {
      id: 'user1',
      name: 'PokeMaster',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PokeMaster'
    },
    content: 'Has anyone tried the new Miraidon build with Electric Seed and Electrify? It\'s been working really well for me in the current meta.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 2,
    author: {
      id: 'user2',
      name: 'DragonTrainer',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DragonTrainer'
    },
    content: 'I\'ve been experimenting with it, but found that it struggles against strong Ground types like Garchomp. What\'s your strategy for dealing with those matchups?',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    author: {
      id: 'user3',
      name: 'GhostGirl',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GhostGirl'
    },
    content: 'Try pairing it with a Grass type that can handle Ground moves. Ive had success using Miraidon with Tsareena to counter Ground types.',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutos atrás
  },
  {
    id: 4,
    author: {
      id: 'user1',
      name: 'PokeMaster',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PokeMaster'
    },
    content: 'Thats a good suggestion! Ive been using Rillaboom as my Grass counter, but Tsareenas Queenly Majesty could definitely help against priority moves too.',
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutos atrás
  },
  {
    id: 5,
    author: {
      id: 'user4',
      name: 'BattleTower99',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BattleTower99'
    },
    content: 'Have any of you tried running Volt Switch instead of Discharge? Im wondering if the mobility is worth the lower damage output.',
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
  }
];

// Mapa de títulos de temas con IDs formatados
const topicTitles = {
  'general-discussion': 'General Discussion',
  'game-strategies': 'Game Strategies',
  'tournament-news': 'Tournament News',
  'metagame-trends': 'Metagame Trends',
  'off-topic': 'Off-topic'
};

const ForumTopicPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState(sampleMessages);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  
  const topicTitle = topicTitles[topicId] || 'Forum Topic';

  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!currentUser) {
      setLoginDialogOpen(true);
      return;
    }
    
    if (!newMessage.trim()) return;
    
    // Agregar el nuevo mensaje (en una app real, esto enviaría los datos al backend)
    const message = {
      id: messages.length + 1,
      author: {
        id: currentUser?.uid || 'guest',
        name: currentUser?.displayName || 'Guest User',
        avatar: currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
      },
      content: newMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
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
  const isCurrentUser = (authorId) => {
    return authorId === currentUser?.uid;
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
          {topicTitle}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {/* Mensajes */}
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
            // Cambio clave: determinar si el mensaje es del usuario actual comparando con currentUser.uid
            // En desarrollo/pruebas, podemos usar un id conocido (como currentUser?.uid || 'user1')
            const isMine = message.author.id === (currentUser?.uid || 'user1');
            
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
                    src={message.author.avatar} 
                    alt={message.author.name}
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
                        {message.author.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: isMine ? 0 : 2, mr: isMine ? 2 : 0 }}
                      >
                        {formatTimestamp(message.timestamp)}
                      </Typography>
                    </Box>

                    {/* Burbuja de mensaje */}
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
                        backgroundColor: isMine ? '#24CC9F' : 'rgba(255, 255, 255, 0.1)' // Mantener el mismo color en hover
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
      
      {/* Entrada de nuevo mensaje o aviso de inicio de sesión */}
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
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
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
            color="primary"
            onClick={handleSendMessage}
            sx={{ 
              ml: 1,
              bgcolor: '#24CC9F',
              color: 'black',
              '&:hover': {
                bgcolor: '#1bab85'
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
      
      {/* Login Dialog */}
      <LoginDialog 
        open={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)}
        isSignUp={false}
      />
    </Box>
  );
};

export default ForumTopicPage;