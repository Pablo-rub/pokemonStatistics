import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Button, 
  useTheme, 
  useMediaQuery, 
  Card, 
  CardContent,
  Paper,
  alpha,
  Fade
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import ExploreIcon from '@mui/icons-material/Explore';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';

export default function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const features = [
    {
      icon: <BarChartIcon sx={{ fontSize: { xs: 40, md: 54 }, color: '#24CC9F' }} />,
      title: "Comprehensive Rankings",
      description:
        "Explore detailed usage statistics and rankings for every Pokémon in the competitive scene. Track changes in the metagame over time with our historical data visualization."
    },
    {
      icon: <AutoGraphIcon sx={{ fontSize: { xs: 40, md: 54 }, color: '#24CC9F' }} />,
      title: "Deep Statistical Analysis",
      description:
        "Analyze win rates, common movesets, popular abilities, and team compositions. Get insights into the most successful strategies with our detailed breakdowns."
    },
    {
      icon: <OndemandVideoIcon sx={{ fontSize: { xs: 40, md: 54 }, color: '#24CC9F' }} />,
      title: "Battle Replays",
      description:
        "Watch and save high-level competitive matches. Study strategies from top players and improve your own gameplay with our curated collection of battle replays."
    }
  ];

  const quickLinks = [
    { 
      icon: <ExploreIcon />, 
      title: "Public Games", 
      description: "Browse and watch recent competitive matches",
      path: "/public-games" 
    },
    { 
      icon: <BarChartIcon />, 
      title: "Rankings", 
      description: "See which Pokémon are dominating the meta",
      path: "/rankings" 
    },
    { 
      icon: <ForumIcon />, 
      title: "Forum", 
      description: "Join the community discussion",
      path: "/forum" 
    }
  ];

  return (
    <>
      {/* Banner region */}
      <Box component="header" role="banner">
        {/* Hero Section */}
        <Box
          sx={{
            position: 'relative',
            height: { xs: '70vh', sm: '75vh', md: '85vh' },
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingX: { xs: 2, sm: 4, md: 6 }
          }}
        >
          <Container maxWidth="md">
            <Fade in={true} timeout={1000}>
              <Box
                sx={{
                  bgcolor: alpha('#000000', 0.6),
                  color: '#ffffff',
                  p: { xs: 3, sm: 4, md: 5 },
                  textAlign: 'center',
                  borderRadius: 2,
                  backdropFilter: 'blur(5px)',
                }}
              >
                <Typography 
                  variant={isMobile ? 'h4' : isTablet ? 'h3' : 'h2'} 
                  component="h1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Competitive Statistics
                </Typography>
                <Typography 
                  variant={'body1'}
                  component="p"
                  sx={{ mb: { xs: 3, md: 4 }, maxWidth: '700px', mx: 'auto' }}
                >
                  Dive into usage stats, battle replays, and deep analytics to improve your competitive gameplay.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size={isMobile ? 'medium' : 'large'}
                    startIcon={<ExploreIcon />}
                    onClick={() => navigate('/public-games')}
                    sx={{ 
                      py: { xs: 1, md: 1.5 },
                      px: { xs: 3, md: 4 },
                      fontWeight: 'bold'
                    }}
                  >
                    Explore Games
                  </Button>
                  <Button
                    variant="outlined"
                    size={isMobile ? 'medium' : 'large'}
                    color="secondary"
                    onClick={() => navigate('/rankings')}
                    sx={{ 
                      py: { xs: 1, md: 1.5 },
                      px: { xs: 3, md: 4 },
                      borderColor: '#ffffff',
                      color: '#ffffff',
                      '&:hover': {
                        borderColor: '#ffffff',
                        backgroundColor: alpha('#ffffff', 0.1)
                      }
                    }}
                  >
                    View Rankings
                  </Button>
                </Box>
              </Box>
            </Fade>
          </Container>
        </Box>
      </Box>

      {/* Main content region */}
      <Box component="main" role="main" aria-labelledby="home-title">
        <Typography
          id="home-title"
          component="h1"
          variant="h3"
          sx={{ position: 'absolute', width: 1, height: 1, clip: 'rect(0,0,0,0)' }}
        >
          Pokémon Statistics
        </Typography>

        {/* Key Features Section */}
        <Box 
          component="section" 
          aria-labelledby="features-heading"
          sx={{ 
            py: { xs: 5, md: 8 }, 
            px: { xs: 2, sm: 4, md: 6 },
            backgroundColor: '#221FC7'
          }}
        >
          <Container maxWidth="lg">
            <Typography 
              id="features-heading"
              variant={isMobile ? 'h5' : 'h4'} 
              component="h2"
              align="center" 
              gutterBottom
              sx={{ color: '#ffffff', fontWeight: 'bold', mb: 4 }}
            >
              Key Features
            </Typography>
            
            <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
              {features.map((feature, idx) => (
                <Grid key={idx} item xs={12} sm={6} md={4}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      backgroundColor: alpha('#ffffff', 0.1), 
                      color: '#ffffff',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.2)'
                      },
                      borderRadius: 2
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                      <Box sx={{ mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography 
                        variant="h6" 
                        component="h3"
                        sx={{ mb: 1.5, fontWeight: 'bold' }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Quick Links Section */}
        <Box 
          component="section" 
          aria-labelledby="quick-links-heading"
          sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 4, md: 6 } }}
        >
          <Container maxWidth="lg">
            <Typography 
              id="quick-links-heading"
              variant={isMobile ? 'h5' : 'h4'} 
              component="h2"
              align="center" 
              gutterBottom
              sx={{ mb: 4, color: '#ffffff', fontWeight: 'bold' }}
            >
              Getting Started
            </Typography>
            
            <Grid container spacing={3}>
              {quickLinks.map((link, idx) => (
                <Grid key={idx} item xs={12} sm={4}>
                  <Paper 
                    elevation={3}
                    sx={{ 
                      p: 3, 
                      height: '100%',
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, background-color 0.2s',
                      backgroundColor: '#221FC7',
                      color: '#ffffff',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        backgroundColor: '#24CC9F'
                      }
                    }}
                    onClick={() => navigate(link.path)}
                    component="article"
                    aria-label={`Navigate to ${link.title}`}
                  >
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: '50%', 
                        backgroundColor: alpha('#ffffff', 0.1),
                        mb: 2
                      }}
                    >
                      {link.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {link.title}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      {link.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>

      {/* Footer region */}
      <Box component="footer" role="contentinfo" sx={{ py: 2, textAlign: 'center' }}>
        © 2025 Pokémon Statistics
      </Box>
    </>
  );
}
