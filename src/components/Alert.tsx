import React, { Fragment } from 'react';
import { Alert as MUIAlert, Stack, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectAlertState } from '../store/slices/ui';

interface ComponentProps {

}

const Alert: React.FC<ComponentProps> = (props: ComponentProps) => {
  const alerts = useSelector(selectAlertState);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Fragment>
      <Stack 
        spacing={2} 
        sx={isMobile 
          ? { 
              position: 'fixed', 
              bottom: 0, 
              left: 0, 
              right: 0,
              zIndex: 2000,
              p: 2
            }
          : { 
              position: 'fixed', 
              bottom: 32, 
              right: 32,
              zIndex: 2000,
              maxWidth: 400,
              alignItems: 'flex-end'
            }
        }
      >
        {
          alerts.map((alert: any, index: number) => (
            <MUIAlert 
                key={alert.id || index}
                severity={alert.alertType} 
                sx={{ 
                  width: 'auto',
                  minWidth: '300px',
                  boxShadow: 3
                 }}
                 elevation={6}
                 variant="filled"
            >
              {alert.msg}
            </MUIAlert>
          ))
        }
      </Stack>
    </Fragment>
  )
}

export default Alert;