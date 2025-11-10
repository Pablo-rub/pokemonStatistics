import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Divider, 
  Card, 
  CardContent, 
  Badge, 
  Skeleton,
  useMediaQuery,
  useTheme,
  Grid
} from '@mui/material';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ChatIcon from '@mui/icons-material/Chat';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SEO from '../components/SEO';

const ForumPage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/forum/topics');
        setTopics(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading forum topics');
        console.error('Error fetching topics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopics();
  }, []);
  
  return (
    <Box 
      component="main"
      role="main"
      aria-label="Forum topics"
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 }, 
        maxWidth: '1200px', 
        mx: 'auto',
        backgroundColor: '#221FC7',
        borderRadius: 2,
        color: '#ffffff',
        minHeight: '80vh'
      }}
    >
      <SEO 
        title="Community Forum"
        description="Join the Trainer Academy community. Discuss strategies, share replays, ask questions, and connect with other competitive Pokémon VGC players."
        keywords="pokemon forum, vgc community, pokemon discussion, competitive pokemon community, vgc strategies"
      />
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          id="forum-title"
          sx={{ fontWeight: 'bold', color: '#ffffff' }}
        >
          Forum Discussions
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton 
              key={item}
              variant="rectangular" 
              height={isMobile ? 100 : 120} 
              animation="wave" 
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}
            />
          ))}
        </Box>
      ) : error ? (
        <Typography 
          variant="body1" 
          color="error" 
          sx={{ p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: 1 }}
          role="alert"
        >
          {error}
        </Typography>
      ) : topics.length === 0 ? (
        <Typography 
          variant="body1" 
          sx={{ color: '#ffffff', textAlign: 'center', py: 5 }}
        >
          No topics have been created yet. Be the first to start a discussion!
        </Typography>
      ) : (
        <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
          {topics.map((topic, index) => (
            <Box 
              component="li" 
              key={topic.topic_id || index}
              sx={{ mb: 2 }}
            >
              <Card 
                component={Link} 
                to={`/forum/${topic.topic_id}`}
                sx={{ 
                  display: 'block', 
                  textDecoration: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)'
                  },
                  '&:focus': {
                    outline: '2px solid #24CC9F',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)'
                  }
                }}
                aria-labelledby={`topic-title-${topic.topic_id || index}`}
              >
                <CardContent sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' }, 
                  p: { xs: 2, sm: 3 },
                  gap: { xs: 2, sm: 0 }
                }}>
                  {/* Topic info section */}
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs="auto">
                      <Box sx={{ 
                        width: { xs: 40, sm: 45 }, 
                        height: { xs: 40, sm: 45 }, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        flexShrink: 0
                      }}>
                        <ChatIcon sx={{ color: '#221FC7' }} aria-hidden="true" />
                      </Box>
                    </Grid>
                    <Grid item xs>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        component="h2"
                        id={`topic-title-${topic.topic_id || index}`}
                        sx={{ 
                          color: '#ffffff',
                          fontWeight: 'medium',
                          wordBreak: 'break-word'
                        }}
                      >
                        {topic.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {topic.description}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {/* Stats section */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 2, sm: 3 },
                    mt: { xs: 1, sm: 0 },
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    alignSelf: { xs: 'flex-end', sm: 'center' }
                  }}>
                    {/* Posts count */}
                    <Box sx={{ 
                      textAlign: 'center',
                      minWidth: { xs: 'auto', sm: '60px' }
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        component="span"
                      >
                        Posts
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ color: '#ffffff' }}
                        component="span"
                        aria-label={`${topic.posts} posts`}
                      >
                        <Box component="span" sx={{ display: 'block' }}>
                          {topic.posts}
                        </Box>
                      </Typography>
                    </Box>
                    
                    {/* Last active */}
                    <Box sx={{ 
                      textAlign: 'center',
                      minWidth: { xs: 'auto', sm: '100px' }
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        component="span"
                      >
                        Last Active
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ color: '#ffffff' }}
                        component="span"
                        aria-label={`Last active ${topic.lastActive}`}
                      >
                        <Box component="span" sx={{ display: 'block' }}>
                          {topic.lastActive}
                        </Box>
                      </Typography>
                    </Box>
                    
                    {/* Hot indicator */}
                    <Badge 
                      badgeContent="Hot" 
                      color="error" 
                      sx={{ ml: 1 }} 
                      invisible={index !== 0}
                    >
                      <LocalFireDepartmentIcon 
                        sx={{ 
                          color: index === 0 ? '#FF5722' : 'transparent',
                          fontSize: { xs: 20, sm: 24 }
                        }} 
                        aria-hidden={index !== 0}
                        aria-label={index === 0 ? "Hot topic" : ""}
                      />
                    </Badge>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ForumPage;