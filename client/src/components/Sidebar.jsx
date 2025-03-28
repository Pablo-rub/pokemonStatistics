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
import HomeIcon from '@mui/icons-material/Home';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PublicIcon from '@mui/icons-material/Public';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AssistantIcon from '@mui/icons-material/Assistant';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ForumIcon from '@mui/icons-material/Forum'; // Añadir icono de foro
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from './LoginDialog';

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Widths for mini vs. expanded
  const miniWidth = '60px';
  const expandedWidth = '16.6667vw';

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

  const menuItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Saved Games', path: '/saved-games', icon: <BookmarkIcon /> },
    { text: 'Public Games', path: '/public-games', icon: <PublicIcon /> },
    { text: 'Rankings', path: '/rankings', icon: <LeaderboardIcon /> },
    { text: 'Turn Assistant', path: '/turn-assistant', icon: <AssistantIcon /> },
    { text: 'Forum', path: '/forum', icon: <ForumIcon /> }, // Añadir elemento de menú para el foro
  ];

  return (
    <>
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
          },
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <List sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* Auth Buttons */}
          {!currentUser ? (
            <>
              <ListItem
                onClick={() => handleAuth(false)}
                className="auth-item"
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon sx={{ minWidth: isExpanded ? 40 : 'auto' }}>
                  <LoginIcon />
                </ListItemIcon>
                {isExpanded && <ListItemText primary="Sign In" />}
              </ListItem>

              <ListItem
                onClick={() => handleAuth(true)}
                className="auth-item"
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon sx={{ minWidth: isExpanded ? 40 : 'auto' }}>
                  <PersonAddIcon />
                </ListItemIcon>
                {isExpanded && <ListItemText primary="Sign Up" />}
              </ListItem>
            </>
          ) : (
            <ListItem
              onClick={() => navigate('/profile')}
              className="auth-item"
              sx={{ cursor: 'pointer' }}
            >
              {isExpanded ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} />
                  <Typography noWrap>{currentUser.displayName}</Typography>
                </Box>
              ) : (
                <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} />
              )}
            </ListItem>
          )}

          {/* Menu Items */}
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              component={Link}
              to={item.path}
            >
              <ListItemIcon sx={{ minWidth: isExpanded ? 40 : 'auto' }}>
                {item.icon}
              </ListItemIcon>
              {isExpanded && <ListItemText primary={item.text} />}
            </ListItem>
          ))}
        </List>
      </Drawer>

      <LoginDialog 
        open={loginDialogOpen}
        onClose={() => {
          setLoginDialogOpen(false);
          setIsSignUp(false);
        }}
        isSignUp={isSignUp}
      />

      <Box sx={{
        marginLeft: isExpanded ? expandedWidth : miniWidth,
        transition: 'margin-left 0.3s',
        flexGrow: 1,
      }} />
    </>
  );
};

export default Sidebar;