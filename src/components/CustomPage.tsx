import React, { ReactNode } from 'react';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Box from '@mui/material/Box';

import Alert from './Alert';

interface ComponentProps {
  children?: ReactNode;
}

const CustomPage: React.FC<ComponentProps> = ({ children = [] }: ComponentProps) => {
  
  const theme: any = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: "#79c0ff", // GitHub-like light blue action color
      },
      background: {
        default: "#0d1117",
        paper: "#161b22",
      },
      text: {
        primary: "#ffffff",
        secondary: "#d0d7de",
      }
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      h2: {
        fontWeight: 600,
        color: '#ffffff',
      },
      h6: {
        color: "#d0d7de",
      },
      body1: {
        color: "#ffffff"
      },
      body2: {
        color: "#d0d7de"
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
    },
    shape: {
      borderRadius: 6,
    }
  });

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', overflow: 'auto', bgcolor: 'background.default', color: 'text.primary' }}>
        { children }
        <Alert />
      </Box>
    </ThemeProvider>
  )
}

export default CustomPage;