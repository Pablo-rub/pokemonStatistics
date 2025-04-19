import { Paper, Typography, Box, Grid, useTheme, useMediaQuery, IconButton } from "@mui/material";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PokemonSprite from "./PokemonSprite";
import { useAuth, useSavedReplays } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ReplayCard = ({ game, showAnalyze = false }) => {
  const { currentUser, savedReplaysIds, save, unsave } = useAuth();
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMdScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLgScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();

  const spriteSize = {
    xs: 60,
    sm: 70,
    md: 80,
    lg: 90
  };

  const getSpriteSizeForScreen = () => {
    if (isLgScreen) return spriteSize.lg;
    if (isMdScreen) return spriteSize.md;
    if (isXsScreen) return spriteSize.xs;
    return spriteSize.sm;
  };

  const isSaved = savedReplaysIds.includes(game.replay_id);

  const toggleSave = async e => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      if (isSaved) await unsave(game.replay_id);
      else await save(game.replay_id);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (timestamp) => {
    try {
      const dateStr = typeof timestamp === 'object' && timestamp.value 
        ? timestamp.value 
        : timestamp;

      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", timestamp);
        return "Unknown";
      }

      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown";
    }
  };

  const handleAnalyze = e => {
    e.stopPropagation();
    navigate(`/analyze-battle/${game.replay_id}`);
  };

  return (
    <Paper 
      onClick={(e) => {
        if (!e.target.closest('.MuiIconButton-root')) {
          window.open(`https://replay.pokemonshowdown.com/${game.replay_id}`, '_blank');
        }
      }}
      variant="replay"
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.12)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          transform: 'translateY(-2px)',
        }
      }}
    >
      <Grid
        container
        spacing={2}
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: { 
            xs: '0.5rem 1rem', 
            sm: '0.75rem 2rem', 
            md: '1rem 3rem' 
          },
          borderRadius: 2,
          minHeight: { 
            xs: '130px', 
            sm: '120px', 
            md: '110px', 
            lg: '100px' 
          },
        }}
      >
        <Grid item xs={12} sm={12} md={3} lg={3} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center'
          }}
        >
          <Typography 
            variant={isXsScreen ? "h6" : "subtitle1"} 
            color="white" 
            textAlign="center" 
            sx={{ 
              width: '100%', 
              mb: 0.5,
              fontSize: {
                xs: '1.1rem',
                sm: '1.15rem', 
                md: '1.2rem', 
                lg: '1.25rem'
              }
            }}
          >
            {game.player1} vs {game.player2}
          </Typography>
          
          <Typography 
            variant="subtitle2" 
            color="white" 
            textAlign="center" 
            sx={{ 
              width: '100%', 
              mb: 0.5,
              fontSize: {
                xs: '0.9rem',
                sm: '0.95rem',
                md: '1rem',
                lg: '1.05rem'
              }
            }}
          >
            Rating: {game.rating ? game.rating : "Unknown"}
          </Typography>
          
          <Typography 
            variant="subtitle2" 
            color="white" 
            textAlign="center" 
            sx={{ 
              width: '100%',
              fontSize: {
                xs: '0.9rem',
                sm: '0.95rem',
                md: '1rem',
                lg: '1.05rem'
              }
            }}
          >
            {game.date ? formatDate(game.date) : "Unknown"}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={12} md={8} lg={8}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 2, sm: 3, md: 5, lg: 6 },
            width: '100%'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: { xs: 1, sm: 1.5, md: 2 },
              mb: { xs: 1, sm: 0 }
            }}>
              {game.teams?.p1?.map((pokemon, index) => (
                <Box 
                  key={`p1-${index}`} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    transform: { 
                      xs: 'scale(1.1)', 
                      sm: 'scale(1.15)', 
                      md: 'scale(1.2)', 
                      lg: 'scale(1.25)' 
                    }
                  }}
                >
                  <PokemonSprite 
                    pokemon={pokemon} 
                    size={getSpriteSizeForScreen()}
                  />
                </Box>
              ))}
            </Box>

            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: { xs: 1, sm: 1.5, md: 2 }
            }}>
              {game.teams?.p2?.map((pokemon, index) => (
                <Box 
                  key={`p2-${index}`} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    transform: { 
                      xs: 'scale(1.1)', 
                      sm: 'scale(1.15)', 
                      md: 'scale(1.2)', 
                      lg: 'scale(1.25)' 
                    }
                  }}
                >
                  <PokemonSprite 
                    pokemon={pokemon} 
                    size={getSpriteSizeForScreen()}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={12} md={1} lg={1} 
          sx={{ 
            display: 'flex', 
            justifyContent: { xs: 'center', md: 'flex-end' },
            alignItems: 'center'
          }}
        >
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {showAnalyze && (
                <IconButton
                  onClick={handleAnalyze}
                  sx={{ mr: 1, color: 'white' }}
                  title="Analizar"
                >
                  <AnalyticsIcon sx={{ fontSize: { xs: 28, sm: 30, md: 32, lg: 34 } }} />
                </IconButton>
              )}
              <IconButton
                onClick={toggleSave}
                sx={{
                  color: isSaved
                    ? theme.palette.error.main
                    : 'white'
                }}
              >
                {isSaved
                  ? <FavoriteIcon sx={{ fontSize: { xs: 28, sm: 30, md: 32, lg: 34 } }} />
                  : <FavoriteBorderIcon sx={{ fontSize: { xs: 28, sm: 30, md: 32, lg: 34 } }} />
                }
              </IconButton>
            </Box>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ReplayCard;