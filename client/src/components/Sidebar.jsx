import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemText, Box, ListItemIcon } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import InboxIcon from '@mui/icons-material/Inbox'; // Any icon you want

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  // Widths for mini vs. expanded
  const miniWidth = '60px';
  const expandedWidth = '16.6667vw';

  const menuItems = [
    { text: 'Home', path: '/' },
    { text: 'Games', path: '/my-games' },
    { text: 'Saved Games', path: '/saved-games' },
    { text: 'Public Games', path: '/public-games' },
    { text: 'Rankings', path: '/rankings' },
    { text: 'Turn Assistant', path: '/turn-assistant' },
  ];

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
          {menuItems.map((item, index) => (
            <ListItem
              button
              key={index}
              component={Link}
              to={item.path}
              sx={{
                height: 56,
                alignItems: 'center',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.secondary.contrastText,
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>
                <InboxIcon />
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