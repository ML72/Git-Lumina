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
      primary: {
        main: "#ae41e0",
      }
    },
    shape: {
      borderRadius: 5,
    }
  });

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', overflow: 'auto' }}>
        { children }
        <Alert />
      </Box>
    </ThemeProvider>
  )
}

export default CustomPage;