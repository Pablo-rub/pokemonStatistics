import { createTheme } from "@mui/material/styles";

//todo
//fondo de sign in negro
//box de google blanca

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
      secondary: "#000000", // Set the secondary text color to white
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
          backgroundColor: '#24CC9F',
          color: '#ffffff',
          "&:hover": {
            backgroundColor: '#1fb589',
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: "#1e3b54", // Darken secondary color on hover
          },
        },
        outlinedPrimary: {
          borderColor: '#E9A5A5',
          color: '#ffffff',
          "&:hover": {
            backgroundColor: 'rgba(233, 165, 165, 0.1)',
            borderColor: '#d49494',
          },
        }
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#221FC7",
          color: "#ffffff",
          "& .MuiListItemIcon-root": {
            color: "inherit",
            minWidth: 40,
          },
          "& .MuiListItem-root": {
            height: 56,
            alignItems: "center",
            whiteSpace: "nowrap",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#1A1896",
              color: "#ffffff",
            },
            "&.auth-item": {
              backgroundColor: "#221FC7", // Updated to match drawer background
              "&:hover": {
                backgroundColor: "#1A1896",
              }
            }
          },
          "& .MuiTypography-root": {
            color: "#ffffff"
          },
          "& .MuiListItemText-root": {
            margin: 0,
          }
        }
      }
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
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#C7ADBE",
          boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.15)', // Añade sombra sutil
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000',
          '& .MuiDialogTitle-root': {
            color: '#ffffff'
          },
          '& .MuiDialogContent-root': {
            color: '#ffffff'
          },
          '& .MuiTextField-root': {
            '& .MuiInputLabel-root': {
              color: '#ffffff',
              '&.Mui-focused': {
                color: '#ffffff'
              }
            },
            '& .MuiOutlinedInput-root': {
              color: '#ffffff',
              '& fieldset': {
                borderColor: '#ffffff'
              },
              '&:hover fieldset': {
                borderColor: '#ffffff'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#ffffff'
              }
            }
          },
          '& .MuiDivider-root': {
            '&::before, &::after': {
              borderColor: '#ffffff'
            }
          },
          '& .MuiTypography-root': {
            color: '#ffffff'
          }
        }
      }
    }
  },
});

export default theme;
