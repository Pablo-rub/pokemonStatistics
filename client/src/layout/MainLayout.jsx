import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar />
      {/* Give pages enough left margin so they never overlap the sidebar */}
      <Box sx={{ marginLeft: "10vw", p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
