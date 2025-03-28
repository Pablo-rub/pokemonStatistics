import React from 'react';
import { 
  Box, 
  Typography, 
  Divider, 
  Paper,
  Button,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import { Link } from 'react-router-dom';
import ChatIcon from '@mui/icons-material/Chat';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ArticleIcon from '@mui/icons-material/Article';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CelebrationIcon from '@mui/icons-material/Celebration';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExploreIcon from '@mui/icons-material/Explore';

const defaultTopics = [
  { 
    title: 'General Discussion', 
    description: 'Talk about anything Pokémon-related.', 
    icon: <ChatIcon sx={{ color: '#221FC7' }} />,
    posts: 134,
    lastActive: '10 minutes ago'
  },
  { 
    title: 'Game Strategies', 
    description: 'Share your best battle tactics and strategies.', 
    icon: <SportsEsportsIcon sx={{ color: '#FF9800' }} />,
    posts: 87,
    lastActive: '2 hours ago'
  },
  { 
    title: 'Tournament News', 
    description: 'Latest news and updates on competitions.', 
    icon: <CelebrationIcon sx={{ color: '#E91E63' }} />,
    posts: 42,
    lastActive: 'Yesterday'
  },
  { 
    title: 'Metagame Trends', 
    description: 'Discuss the latest metagame developments.', 
    icon: <TrendingUpIcon sx={{ color: '#24CC9F' }} />,
    posts: 98,
    lastActive: '3 hours ago'
  },
  { 
    title: 'Off-topic', 
    description: 'Random chats and non-Pokémon topics.', 
    icon: <ExploreIcon sx={{ color: '#9C27B0' }} />,
    posts: 65,
    lastActive: '1 day ago'
  }
];

const ForumPage = () => {
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
        <Button 
          variant="contained" 
          color="success"
          startIcon={<ArticleIcon />}
          sx={{ backgroundColor: '#24CC9F', color: 'black' }}
        >
          New Topic
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {defaultTopics.map((topic, index) => (
        <Card 
          key={index} 
          component={Link} 
          to={`/forum/${topic.title.replace(/\s+/g, '-').toLowerCase()}`}
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
                {topic.icon}
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
      ))}
    </Box>
  );
};

export default ForumPage;