import React from "react";
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  useTheme, 
  useMediaQuery
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BarChartIcon from '@mui/icons-material/BarChart';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

// You'll need to import or create a background image
// const HERO_IMAGE = '/images/competitive-pokemon-battle.jpg'; 

function HomePage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const features = [
      {
        icon: <BarChartIcon sx={{ fontSize: 54, color: '#24CC9F' }} />,
        title: "Comprehensive Rankings",
        description: "Explore detailed usage statistics and rankings for every Pokémon in the competitive scene. Track changes in the metagame over time with our historical data visualization."
      },
      {
        icon: <AutoGraphIcon sx={{ fontSize: 54, color: '#24CC9F' }} />,
        title: "Deep Statistical Analysis",
        description: "Analyze win rates, common movesets, popular abilities, and team compositions. Get insights into the most successful strategies with our detailed breakdowns."
      },
      {
        icon: <OndemandVideoIcon sx={{ fontSize: 54, color: '#24CC9F' }} />,
        title: "Battle Replays",
        description: "Watch and save high-level competitive matches. Study strategies from top players and improve your own gameplay with our curated collection of battle replays."
      }
    ];

    return (
        <Box sx={{ minHeight: '100vh' }}>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    height: { xs: '60vh', md: '70vh' },
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#221FC7',
                    color: 'white',
                    // If you have a hero image:
                    // backgroundImage: `linear-gradient(rgba(34, 31, 199, 0.85), rgba(34, 31, 199, 0.95)), url(${HERO_IMAGE})`,
                    // backgroundSize: 'cover',
                    // backgroundPosition: 'center',
                    textAlign: 'center',
                    p: { xs: 2, sm: 4, md: 6 },
                    borderRadius: { xs: 0, md: '0 0 30px 30px' },
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
            >
                <Box sx={{ 
                    maxWidth: '800px',
                    animation: 'fadeIn 1.2s ease-out',
                    '@keyframes fadeIn': {
                        '0%': { opacity: 0, transform: 'translateY(20px)' },
                        '100%': { opacity: 1, transform: 'translateY(0)' }
                    }
                }}>
                    <Typography 
                        variant={isMobile ? "h4" : "h2"} 
                        component="h1" 
                        fontWeight="bold"
                        sx={{ mb: 3 }}
                    >
                        Pokémon Battle Statistics
                    </Typography>
                    
                    <Typography 
                        variant={isMobile ? "body1" : "h6"} 
                        sx={{ 
                            mb: 4, 
                            maxWidth: '800px', 
                            mx: 'auto',
                            opacity: 0.9
                        }}
                    >
                        Your comprehensive resource for competitive Pokémon analysis, 
                        featuring detailed usage statistics, win rates, and battle replays to 
                        help you build better teams and improve your gameplay.
                    </Typography>
                    
                    <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                        <Grid item>
                            <Button 
                                variant="contained" 
                                size="large"
                                endIcon={<KeyboardArrowRightIcon />}
                                onClick={() => navigate('/rankings')}
                                sx={{ 
                                    bgcolor: '#24CC9F',
                                    borderRadius: '50px',
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: '#1FA082',
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 6px 15px rgba(36, 204, 159, 0.4)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Explore Rankings
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button 
                                variant="outlined" 
                                size="large"
                                endIcon={<KeyboardArrowRightIcon />}
                                onClick={() => navigate('/public-games')} // Changed from '/replays' to '/public-games'
                                sx={{ 
                                    color: 'white',
                                    borderColor: 'white',
                                    borderRadius: '50px',
                                    px: 4,
                                    '&:hover': {
                                        borderColor: 'white',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                    }
                                }}
                            >
                                Watch Replays
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            {/* Main Features Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                <Typography 
                    variant="h4" 
                    component="h2" 
                    textAlign="center"
                    fontWeight="bold"
                    color="white"
                    sx={{ 
                        mb: { xs: 4, md: 6 },
                        position: 'relative',
                        display: 'inline-block',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        '&:after': {
                            content: '""',
                            position: 'absolute',
                            width: '60px',
                            height: '4px',
                            bgcolor: '#24CC9F',
                            bottom: '-15px',
                            left: '50%',
                            transform: 'translateX(-50%)'
                        }
                    }}
                >
                    Key Features
                </Typography>

                <Grid container spacing={4}>
                    {features.map((feature, index) => (
                        <Grid 
                            item 
                            xs={12} 
                            md={4} 
                            key={index}
                            sx={{
                                animation: `fadeInUp ${0.3 + index * 0.2}s ease-out`,
                                '@keyframes fadeInUp': {
                                    '0%': { opacity: 0, transform: 'translateY(40px)' },
                                    '100%': { opacity: 1, transform: 'translateY(0)' }
                                }
                            }}
                        >
                            <Card 
                                elevation={4}
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    bgcolor: '#221FC7',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-10px)',
                                        boxShadow: '0 12px 25px rgba(0,0,0,0.3)'
                                    }
                                }}
                            >
                                <CardContent sx={{ 
                                    flexGrow: 1, 
                                    p: 4, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    textAlign: 'center' 
                                }}>
                                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                                    <Typography 
                                        variant="h5" 
                                        component="h3" 
                                        fontWeight="bold"
                                        color="white"
                                        sx={{ mb: 2 }}
                                    >
                                        {feature.title}
                                    </Typography>
                                    <Typography color="white" sx={{ opacity: 0.8 }}>
                                        {feature.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Getting Started Section */}
            <Box 
                sx={{ 
                    bgcolor: 'rgba(36, 204, 159, 0.1)', 
                    py: { xs: 6, md: 10 },
                    px: 3,
                    borderTop: '1px solid rgba(36, 204, 159, 0.2)',
                    borderBottom: '1px solid rgba(36, 204, 159, 0.2)'
                }}
            >
                <Container maxWidth="md">
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography 
                                variant="h4" 
                                component="h2" 
                                fontWeight="bold" 
                                color="white"
                                sx={{ mb: 2 }}
                            >
                                Get Started Today
                            </Typography>
                            <Typography 
                                color="white" 
                                sx={{ mb: 4, opacity: 0.8 }}
                            >
                                Dive into the world of competitive Pokémon with our comprehensive statistics and analysis tools. Whether you're a seasoned player or just starting out, our platform offers valuable insights to help you build stronger teams and develop winning strategies.
                            </Typography>
                            <Button 
                                variant="contained" 
                                size="large"
                                endIcon={<KeyboardArrowRightIcon />}
                                onClick={() => navigate('/rankings')}
                                sx={{ 
                                    bgcolor: '#24CC9F',
                                    borderRadius: '50px',
                                    px: 4,
                                    '&:hover': {
                                        bgcolor: '#1FA082',
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 6px 15px rgba(36, 204, 159, 0.4)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Start Exploring
                            </Button>
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
                            {/* If you have an image for this section */}
                            {/* <Box 
                                component="img" 
                                src="/images/pokemon-dashboard.png" 
                                alt="Pokémon statistics dashboard" 
                                sx={{ 
                                    maxWidth: '100%', 
                                    borderRadius: 3,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                    border: '4px solid white'
                                }} 
                            /> */}
                            
                            {/* Alternatively, some decorative element */}
                            <Box sx={{ 
                                height: 300, 
                                borderRadius: 3,
                                background: 'linear-gradient(135deg, #221FC7 0%, #1A1896 100%)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    Pokémon Statistics
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Footer Section */}
            <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography color="white" sx={{ opacity: 0.7 }}>
                    Designed for Pokémon trainers and competitive players.
                </Typography>
                <Typography variant="caption" color="white" sx={{ display: 'block', mt: 1, opacity: 0.5 }}>
                    © {new Date().getFullYear()} Pokémon Statistics. All game-related content belongs to The Pokémon Company.
                </Typography>
            </Box>
        </Box>
    );
}

export default HomePage;
