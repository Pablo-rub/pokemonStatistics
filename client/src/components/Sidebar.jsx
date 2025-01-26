import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemText, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Width of the sidebar (1/6 of the viewport width)
  const drawerWidth = '16.6667vw'; // 1/6 of 100vw

  // Width of the hover zone (e.g., 50px)
  const hoverZoneWidth = 50;

  const toggleDrawer = (open) => {
    setIsOpen(open);
  };

  const menuItems = [
    { text: 'Home', path: '/' },
    { text: 'Games', path: '/my-games' },
    { text: 'Saved Games', path: '/saved-games' },
    { text: 'Public Games', path: '/public-games' },
    { text: 'Rankings', path: '/rankings' },
    { text: 'Turn Assistant', path: '/turn-assistant' },
  ];

  const drawerList = () => (
    <Box
      sx={{ width: drawerWidth }}
      role="presentation"
      onMouseLeave={() => toggleDrawer(false)}
    >
      <List>
        {menuItems.map((item, index) => (
          <ListItem button key={index} component={Link} to={item.path}>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {/* Hover Zone */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${hoverZoneWidth}px`,
          height: '100vh',
          zIndex: 1300, // Ensure it's above other elements
          cursor: 'pointer',
        }}
        onMouseEnter={() => toggleDrawer(true)}
      ></Box>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={isOpen}
        variant="persistent"
        onClose={() => toggleDrawer(false)}
        PaperProps={{
          sx: { width: drawerWidth },
        }}
      >
        {drawerList()}
      </Drawer>
    </>
  );
};

export default Sidebar;