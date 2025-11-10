import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  Typography, 
  Avatar,
  IconButton,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import PublicIcon from '@mui/icons-material/Public';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import InsightsIcon from '@mui/icons-material/Insights';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AssistantIcon from '@mui/icons-material/Assistant';
import ForumIcon from '@mui/icons-material/Forum';
import HelpIcon from '@mui/icons-material/Help';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CatchingPokemonIcon from '@mui/icons-material/CatchingPokemon';
import GroupsIcon from '@mui/icons-material/Groups';
import LoginDialog from './LoginDialog';

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Widths for mini vs. expanded
  const collapsedWidth = '60px';
  
  const expandedWidth = {
    xs: 'max(200px, 16.667vw)',
    sm: 'max(200px, 16.667vw)',
    md: 'max(200px, 16.667vw)',
    lg: 'max(200px, 16.667vw)',
    xl: 'max(200px, 16.667vw)',
  };

  const handleAuth = async (isSignUp = false) => {
    if (currentUser) {
      try {
        await logout();
      } catch (error) {
        console.error("Error signing out:", error);
      }
    } else {
      setIsSignUp(isSignUp);
      setLoginDialogOpen(true);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Public Games', path: '/public-games', icon: <PublicIcon /> },
    { text: 'Saved Games', path: '/saved-games', icon: <BookmarkIcon /> },
    { text: 'Battle Analytics', path: '/battle-analytics', icon: <LeaderboardIcon /> },
    { text: 'Rankings', path: '/rankings', icon: <InsightsIcon /> },
    { text: 'Turn Assistant', path: '/turn-assistant', icon: <AssistantIcon /> },
    { text: 'Team Builder', path: '/team-builder', icon: <GroupsIcon /> }, // NUEVO
    { text: 'Pokemon List', path: '/pokemon-list', icon: <CatchingPokemonIcon /> },
    { text: 'Forum', path: '/forum', icon: <ForumIcon /> },
    { text: 'Contact / Help', path: '/contact', icon: <HelpIcon /> },
  ];

  // Contenido del drawer compartido entre versión móvil y desktop
  const drawerContent = (
    <List sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {menuItems.map((item) => (
        <ListItem
          key={item.text}
          component={Link}
          to={item.path}
          aria-label={item.text}
          onClick={isMobile ? handleDrawerToggle : undefined}
          sx={{ 
            py: 1.5,
            color: '#ffffff',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: (!isMobile && isExpanded) || isMobile ? 40 : 'auto',
            color: '#ffffff' 
          }}>
            {item.icon}
          </ListItemIcon>
          {((!isMobile && isExpanded) || isMobile) && <ListItemText primary={item.text} />}
        </ListItem>
      ))}
      
      <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
      
      {!currentUser ? (
        <>
          <ListItem
            onClick={() => {
              handleAuth(false);
              if (isMobile) handleDrawerToggle();
            }}
            aria-label="Sign In"
            sx={{ cursor: 'pointer', color: '#ffffff' }}
          >
            <ListItemIcon sx={{ 
              minWidth: (!isMobile && isExpanded) || isMobile ? 40 : 'auto',
              color: '#ffffff'
            }}>
              <LoginIcon />
            </ListItemIcon>
            {((!isMobile && isExpanded) || isMobile) && <ListItemText primary="Sign In" />}
          </ListItem>

          <ListItem
            onClick={() => {
              handleAuth(true);
              if (isMobile) handleDrawerToggle();
            }}
            aria-label="Sign Up"
            sx={{ cursor: 'pointer', color: '#ffffff' }}
          >
            <ListItemIcon sx={{ 
              minWidth: (!isMobile && isExpanded) || isMobile ? 40 : 'auto',
              color: '#ffffff'
            }}>
              <PersonAddIcon />
            </ListItemIcon>
            {((!isMobile && isExpanded) || isMobile) && <ListItemText primary="Sign Up" />}
          </ListItem>
        </>
      ) : (
        <ListItem
          onClick={() => {
            navigate('/profile');
            if (isMobile) handleDrawerToggle();
          }}
          aria-label="View Profile"
          sx={{ cursor: 'pointer', color: '#ffffff' }}
        >
          {(!isMobile && isExpanded) || isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Avatar
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'User avatar'}
                sx={{ width: 32, height: 32 }}
              />
              <Typography noWrap>{currentUser.displayName}</Typography>
            </Box>
          ) : (
            <Avatar
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User avatar'} // ← added alt text
              sx={{ width: 32, height: 32 }}
            />
          )}
        </ListItem>
      )}
    </List>
  );

  return (
    <>
      {/* AppBar solo visible en móviles */}
      {isMobile && (
        <AppBar 
          position="fixed" 
          sx={{ 
            backgroundColor: '#221FC7',
            boxShadow: 'none',
            zIndex: (theme) => theme.zIndex.drawer + 1 
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Pokémon Statistics
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer para móviles - temporal */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor rendimiento en móviles
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: '70%', // Ancho del drawer en móviles
              maxWidth: '300px',
              boxSizing: 'border-box',
              backgroundColor: '#221FC7',
              color: '#ffffff',
            },
          }}
        >
          {/* Toolbar vacío para empujar el contenido debajo del AppBar */}
          <Toolbar />
          {drawerContent}
        </Drawer>
      ) : (
        // Drawer para escritorio - permanente con hover
        <Drawer
          variant="permanent"
          PaperProps={{
            sx: {
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              zIndex: 1300,
              overflowX: 'hidden',
              width: isExpanded ? expandedWidth : collapsedWidth,
              transition: 'width 0.3s',
              backgroundColor: '#221FC7',
              color: '#ffffff',
            },
          }}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {drawerContent}
        </Drawer>
      )}

      <LoginDialog 
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        isSignUp={isSignUp}
      />

      {/* Margen para el contenido principal */}
      <Box sx={{
        marginLeft: isMobile ? 0 : (isExpanded ? expandedWidth : collapsedWidth),
        marginTop: isMobile ? '64px' : 0, // Espacio para el AppBar en móviles
        transition: 'margin-left 0.3s',
        flexGrow: 1,
      }} />
    </>
  );
};

export default Sidebar;