import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  ListItemIcon,
  Avatar,
  Typography 
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import GamesIcon from '@mui/icons-material/Games';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PublicIcon from '@mui/icons-material/Public';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AssistantIcon from '@mui/icons-material/Assistant';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';

//todo
// hover de sign in

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuth = async () => {
    if (currentUser) {
      try {
        await logout();
      } catch (error) {
        console.error("Error signing out:", error);
      }
    } else {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Error signing in:", error);
      }
    }
  };

  // Widths for mini vs. expanded
  const miniWidth = '60px';
  const expandedWidth = '16.6667vw';

  const menuItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Games', path: '/my-games', icon: <GamesIcon /> },
    { text: 'Saved Games', path: '/saved-games', icon: <BookmarkIcon /> },
    { text: 'Public Games', path: '/public-games', icon: <PublicIcon /> },
    { text: 'Rankings', path: '/rankings', icon: <LeaderboardIcon /> },
    { text: 'Turn Assistant', path: '/turn-assistant', icon: <AssistantIcon /> },
  ];

  const commonListItemStyles = {
    height: 56,
    alignItems: 'center',
    whiteSpace: 'nowrap',
    justifyContent: isExpanded ? 'flex-start' : 'center',
    '&:hover': {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
    },
  };

  return (
    <>
      {/* Drawer (always visible) */}
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
            width: isExpanded ? expandedWidth : miniWidth,
            transition: 'width 0.3s',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          },
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <List
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Auth Button/User Info */}
          <ListItem
            sx={commonListItemStyles}
            onClick={currentUser ? () => navigate('/profile') : handleAuth}
            style={{ cursor: 'pointer' }}
          >
            {currentUser ? (
              <>
                {isExpanded ? (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    width: '100%'
                  }}>
                    <Avatar 
                      src={currentUser.photoURL} 
                      sx={{ width: 32, height: 32 }}
                    />
                    <Typography noWrap>{currentUser.displayName}</Typography>
                  </Box>
                ) : (
                  <Avatar 
                    src={currentUser.photoURL}
                    sx={{ width: 32, height: 32 }}
                  />
                )}
              </>
            ) : (
              <>
                <ListItemIcon sx={{ color: 'inherit', minWidth: isExpanded ? 40 : 'auto' }}>
                  <LoginIcon />
                </ListItemIcon>
                {isExpanded && (
                  <ListItemText 
                    primary="Sign In"
                    sx={{ margin: 0 }}
                  />
                )}
              </>
            )}
          </ListItem>

          {/* Rest of menu items */}
          {menuItems.map((item, index) => (
            <ListItem
              key={item.text}
              component={Link}
              to={item.path}
              sx={commonListItemStyles}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: isExpanded ? 40 : 'auto' }}>
                {item.icon}
              </ListItemIcon>
              {isExpanded && <ListItemText primary={item.text} />}
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content offset (so content is not underneath the drawer) */}
      <Box
        sx={{
          marginLeft: isExpanded ? expandedWidth : miniWidth,
          transition: 'margin-left 0.3s',
          flexGrow: 1,
        }}
      >
        {/* Page content goes here */}
      </Box>
    </>
  );
};

export default Sidebar;