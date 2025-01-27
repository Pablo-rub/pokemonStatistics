import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#221FC7"
    },
    secondary: {
      main: "#1A1896"
    },
    error: {
      main: "#E9A5A5",
    },
    warning: {
      main: "#e7a977",
    },
    success: {
      main: "#24CC9F",
    },
    background: {
      default: "#2B2828"
    },
    text: {
      primary: "#ffffff", // Set the primary text color to white
      secondary: "#ffffff", // Set the secondary text color to white
    },
  },
  typography: {
    allVariants: {
      color: "#ffffff", // Set the default text color to white
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none", // Disable uppercase transformation
          borderRadius: 8, // Rounded corners
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#36554a", // Darken primary color on hover
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: "#1e3b54", // Darken secondary color on hover
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#52796f", // Example: change drawer background color
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: "#ffffff", // Example: change text color
          "&.Mui-selected": {
            backgroundColor: "#84a29d", // Highlight selected items
            "&:hover": {
              backgroundColor: "#6d8e89", // Darken on hover when selected
            },
          },
          "&:hover": {
            backgroundColor: "#6d8e89", // Light grey on hover
          },
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          marginBottom: "16px",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          "&.breadcrumb-link": {
            textDecoration: "none",
            color: "#355c7d",
            fontWeight: 500,
            "&:hover": {
              color: "#52796f",
            },
          },
          "&.breadcrumb-active": {
            color: "#52796f",
            fontWeight: 500,
          },
        },
      },
    },
  },
});

export default theme;
