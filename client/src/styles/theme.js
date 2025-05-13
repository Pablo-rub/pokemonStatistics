import { createTheme } from "@mui/material/styles";

// ver si se puede pasar mas sx aqui

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
      primary: "#ffffff",
      secondary: "#000000",
    },
  },
  typography: {
    allVariants: {
      color: "#ffffff",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
        containedSuccess: {
          backgroundColor: '#24CC9F',
          color: '#000000',
          //hover 50% more darker than its color
          "&:hover": {
            backgroundColor: '#1b9e7a',
          },
        },
        containedCancel: {
          backgroundColor: '#E9A5A5',
          color: '#000000',
          //hover 50% more darker than its color
          "&:hover": {
            backgroundColor: '#c97b7b',
          },
        },
        containedSecondary: {
          backgroundColor: '#C7ADBE',
          color: '#000000',
          margin: 10,
          "&:hover": {
            backgroundColor: '#b39db1',
          },
        },
        outlined: {
          color: '#ffffff',
          borderColor: '#ffffff',
        },
        outlinedBlack: {
          color: '#000000',
          borderColor: '#000000',
          //hover
          "&:hover": {
            backgroundColor: '#a9a9a9',
          },
        },
        logout: {
          borderColor: 'black',
          color: 'black',
          '&:hover': {
            borderColor: 'black',
            backgroundColor: '#a9a9a9',
          }
        },
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
          borderRadius: 8,
        },
        replay: {
          backgroundColor: '#221FC7',
          padding: 10, 
          marginBottom: 10,
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 6,
            transform: 'scale(1.005)',
            transition: 'all 0.2s ease-in-out',
          },
        },
        profile: {
          padding: 3, 
          maxWidth: 800, 
          margin: '0 auto',
          backgroundColor: '#221FC7'
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        login: {
          backgroundColor: '#221FC7',
        },
        paper: {
          backgroundColor: '#221FC7', // Cambiado de '#000000' a '#221FC7'
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
    },
    MuiBox: {
      styleOverrides: {
        filter: {
          display: 'flex', 
          alignItems: 'center',
          gap: 2, 
          flexWrap: 'wrap',
          marginBottom: 2
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          margin: '0 10px',
          color: '#ffffff',
          '& .MuiSelect-icon': {
            color: '#ffffff'
          },
          '&.MuiSelect-select': {
            '&:focus': {
              backgroundColor: 'transparent'
            }
          },
          color: '#ffffff',
          backgroundColor: 'transparent',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffffff',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffffff',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffffff',
          },
          '& .MuiSvgIcon-root': {
            color: '#ffffff',
          },
        },
        replayFilter: {
          color: '#ffffff',
          '&.MuiSelect-select': {
            '&:focus': {
              backgroundColor: 'transparent'
            }
          }
        },
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          mb: 2,
          '& .MuiInputLabel-root': {
            color: '#ffffff', // Cambiado de '#000' a '#ffffff'
            '&.Mui-focused': {
              color: '#ffffff', // Cambiado de '#1976d2' a '#ffffff'
            },
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#ffffff', // Cambiado de '#000' a '#ffffff'
            },
            '&:hover fieldset': {
              borderColor: '#ffffff', // Cambiado de '#1976d2' a '#ffffff'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ffffff', // Cambiado de '#1976d2' a '#ffffff'
              borderWidth: '2px',
            },
          },
          '& .MuiInputBase-input': {
            color: '#ffffff',
            caretColor: '#ffffff',
          },
          '& .MuiIconButton-root': {
            color: '#ffffff',
          },
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          backgroundColor: 'background.paper',
          paddingLeft: '4px',
          paddingRight: '4px',
          '&.Mui-focused': {
            color: 'white', // O el color que prefieras
          },
        },
      },
    },
    Typography: {
      color: '#ffffff', // Añade esto para asegurar que todo el texto sea blanco
      '& .MuiDivider-root': {
        '&::before, &::after': {
          borderColor: '#ffffff'
        }
      },
      '& .MuiTypography-root': {
        color: '#ffffff'
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#221FC7', // Match your app's blue background
          '& .MuiMenuItem-root': {
            color: '#ffffff', // White text for menu items
            '&:hover': {
              backgroundColor: '#1A1896', // Darker blue on hover
            },
            '&.Mui-selected': {
              backgroundColor: '#1A1896', // Dark blue for selected item
              '&:hover': {
                backgroundColor: '#15137A', // Even darker on hover when selected
              }
            }
          },
          // Add a border to make the dropdown stand out
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          '& .MuiPaper-root': {
            backgroundColor: '#221FC7',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '& .MuiAutocomplete-option': {
              '&:hover': {
                backgroundColor: '#1A1896',
              },
              '&[aria-selected="true"]': {
                backgroundColor: '#1A1896',
                '&:hover': {
                  backgroundColor: '#15137A',
                }
              },
            },
            '& .MuiAutocomplete-listbox': {
              '& .MuiAutocomplete-option': {
                color: '#ffffff',
              }
            },
            '& .MuiAutocomplete-noOptions': {
              color: '#ffffff',
            },
            '& .MuiListSubheader-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            }
          },
        },
      }
    },
  },
});

export default theme;
