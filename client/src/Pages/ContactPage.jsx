import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Link, 
  Divider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  useTheme,
  useMediaQuery
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import HelpIcon from '@mui/icons-material/Help';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';

const ContactPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const faqs = [
    {
      question: "How often is the data updated?",
      answer: "Our usage statistics and rankings are updated monthly, in line with the official Smogon/Pokémon Showdown data release cycles."
    },
    {
      question: "Why don't I see my battle in the replays section?",
      answer: "We only index public battles from the Pokémon Showdown server that meet certain criteria. Private battles or very recent games may not appear immediately."
    },
    {
      question: "How is the win rate calculated?",
      answer: "Win rates are calculated based on the total number of battles where a particular Pokémon, move, or item was used, divided by the number of victories in those matches."
    }
  ];

  return (
    <Box sx={{ 
      maxWidth: { xs: '100%', md: '1200px' }, 
      mx: 'auto', 
      p: { xs: 2, sm: 3 }
    }}>
      <Typography 
        variant={isMobile ? "h4" : "h3"} 
        sx={{ 
          mb: 4, 
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
        component="h1"
      >
        Contact & Help
      </Typography>
      
      <Paper sx={{ 
        p: { xs: 2, sm: 4 }, 
        mb: 4, 
        backgroundColor: '#221FC7', 
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
      }}>
        <Grid container spacing={{ xs: 4, md: 6 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              mb: 3,
              backgroundColor: 'rgba(255,255,255,0.05)',
              p: 3,
              borderRadius: 2,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-5px)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              }
            }}>
              <EmailIcon sx={{ mr: 2, fontSize: 36, color: '#24CC9F' }} aria-hidden="true" />
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }} component="h2">
                  Contact Us
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Have questions, suggestions, or spotted something we could improve? Don’t hesitate to reach out — we love hearing from you!
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255,255,255,0.75)' }}>
                  This application is under active development and may contain bugs or unexpected behavior. If you find any issues or something doesn't work as expected, please report it to support@traineracademy.xyz — every bug report helps us improve.
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 2,
                    color: '#24CC9F',
                    wordBreak: 'break-word'
                  }}
                  component="h2"
                >
                  support@traineracademy.xyz
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.05)',
              p: 3,
              borderRadius: 2,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-5px)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              }
            }}>
              <HelpIcon sx={{ mr: 2, fontSize: 36, color: '#24CC9F' }} aria-hidden="true" />
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }} component="h2">
                  Help Resources
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Check these resources for assistance with common questions:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                  <Box component="li" sx={{ mb: 1.5 }}>
                    <Link href="https://www.pokemon.com" target="_blank" rel="noopener" sx={{ color: '#24CC9F', '&:hover': { color: '#1aa37f' } }}>
                      Official Pokémon Site
                    </Link>
                  </Box>
                  <Box component="li" sx={{ mb: 1.5 }}>
                    <Link href="https://www.pokemon.com/us/play-pokemon/pokemon-events/" target="_blank" rel="noopener" sx={{ color: '#24CC9F', '&:hover': { color: '#1aa37f' } }}>
                      Pokémon Events / Tournament Finder
                    </Link>
                  </Box>
                  <Box component="li" sx={{ mb: 1.5 }}>
                    <Link href="https://pokemonshowdown.com" target="_blank" rel="noopener" sx={{ color: '#24CC9F', '&:hover': { color: '#1aa37f' } }}>
                      Pokémon Showdown (battle simulator)
                    </Link>
                  </Box>
                  <Box component="li" sx={{ mb: 1.5 }}>
                    <Link href="https://www.smogon.com" target="_blank" rel="noopener" sx={{ color: '#24CC9F', '&:hover': { color: '#1aa37f' } }}>
                      Smogon (competitive resources & usage)
                    </Link>
                  </Box>
                  <Box component="li" sx={{ mb: 1.5 }}>
                    <Link href="https://bulbapedia.bulbagarden.net" target="_blank" rel="noopener" sx={{ color: '#24CC9F', '&:hover': { color: '#1aa37f' } }}>
                      Bulbapedia (encyclopedia)
                    </Link>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                  <Link
                    href="https://x.com/_traineracademy"
                    aria-label="X (Trainer Academy)"
                    sx={{ color: 'white', display: 'flex', alignItems: 'center' }}
                  >
                    <CloseIcon fontSize="large" />
                  </Link>

                  <Link
                    href="https://buymeacoffee.com/traineracademy"
                    target="_blank"
                    rel="noopener"
                    aria-label="Buy Me a Coffee"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <img
                      src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                      alt="Buy Me a Coffee"
                      style={{ height: 36, border: 0, display: 'block' }}
                    />
                  </Link>

                  <Typography 
                    variant="body2" 
                    sx={{ 
                      ml: 1, 
                      color: 'rgba(255,255,255,0.85)', 
                      maxWidth: 260 
                    }}
                  >
                    If you'd like to support development, you can buy me a coffee — thank you! The button above links to our Buy Me a Coffee page.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 5, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'medium' }} component="h2">
          Frequently Asked Questions
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          {faqs.map((faq, index) => (
            <Accordion 
              key={index} 
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                color: 'white',
                mb: 1.5,
                '&:before': {
                  display: 'none',
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                aria-controls={`faq-content-${index}`}
                id={`faq-header-${index}`}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.08)' 
                  }
                }}
              >
                <Typography 
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  variant="body1"
                  fontWeight="medium"
                >
                  <LiveHelpIcon fontSize="small" sx={{ color: '#24CC9F' }} /> 
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Paper>
      
      <Typography 
        variant="body2" 
        sx={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.6)', 
          mt: 6,
          mb: 2,
          maxWidth: '700px',
          mx: 'auto'
        }}
      >
        Pokémon Statistics is a fan project. Pokémon and all related properties are © of Nintendo, Game Freak, and The Pokémon Company. 
        This site is not affiliated with or endorsed by Nintendo, Game Freak, or The Pokémon Company.
      </Typography>

      <Typography
        variant="body2"
        sx={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          mt: 2,
          mb: 6,
          maxWidth: '700px',
          mx: 'auto'
        }}
      >
        This project was born as a university final project and is maintained to serve the community. Its primary goal is to provide useful tools and statistics to help players. Development is voluntary — if the site stops meeting that goal, lacks community usefulness, or becomes impossible to maintain, it may no longer receive updates. We welcome feedback, contributions and suggestions to keep the project helpful for everyone.
      </Typography>
    </Box>
  );
};

export default ContactPage;