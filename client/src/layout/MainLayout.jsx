import React from 'react';
import { Box, CssBaseline, useMediaQuery, useTheme } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar />
      <Box sx={{ 
        marginLeft: isMobile ? 0 : "10vw", 
        p: { xs: 2, sm: 3 },
        pt: isMobile ? 9 : 3
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
