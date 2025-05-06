import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Divider,
  Button,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import { Link } from 'react-router-dom';
import ChatIcon from '@mui/icons-material/Chat';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ArticleIcon from '@mui/icons-material/Article';
import axios from 'axios';

const ForumPage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/forum/topics');
        setTopics(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError('Failed to load topics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopics();
  }, []);
  
  return (
    <Box sx={{ 
      p: 3, 
      maxWidth: '1200px', 
      mx: 'auto',
      backgroundColor: '#221FC7',
      borderRadius: 2,
      color: 'white',
      minHeight: '80vh'
    }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
          Forum
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {loading ? (
        <Typography variant="body1" sx={{ color: 'white' }}>
          Loading topics...
        </Typography>
      ) : error ? (
        <Typography variant="body1" sx={{ color: 'red' }}>
          {error}
        </Typography>
      ) : (
        topics.map((topic, index) => (
          <Card 
            key={index} 
            component={Link} 
            to={`/forum/${topic.topic_id}`}
            sx={{ 
              mb: 2, 
              display: 'block', 
              textDecoration: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)'
              }
            }}
          >
            <CardContent sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center', 
              p: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <Box sx={{ 
                  width: 45, 
                  height: 45, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }}>
                  <ChatIcon sx={{ color: '#221FC7' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {topic.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {topic.description}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Posts
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {topic.posts}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Last Active
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {topic.lastActive}
                  </Typography>
                </Box>
                
                <Badge badgeContent="Hot" color="error" sx={{ ml: 1 }} invisible={index !== 0}>
                  <LocalFireDepartmentIcon sx={{ color: index === 0 ? '#FF5722' : 'transparent' }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default ForumPage;