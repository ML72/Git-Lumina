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
      <Stack spacing={3} sx={{ maxWidth: "100%" }}>
        {
          alerts.map((alert: any, index: number) => (
            <Snackbar
              open={true}
              key={alert.id || index}
              transitionDuration={300}
              sx={isMobile 
                ? { 
                    position: 'fixed !important', 
                    bottom: '0 !important', 
                    left: '0 !important', 
                    right: '0 !important',
                    transform: 'none !important' 
                  }
                : { 
                    position: 'fixed !important', 
                    bottom: '24px !important', 
                    right: '24px !important',
                    left: 'auto !important'
                  }
              }
              anchorOrigin={{ 
                vertical: 'bottom', 
                horizontal: isMobile ? 'center' : 'right' 
              }}
            >
              <MUIAlert 
                severity={alert.alertType} 
                sx={{ 
                  width: '100%',
                  ...(isMobile && {
                    width: '100vw',
                    borderRadius: 0,
                    boxSizing: 'border-box'
                  })
                 }}
                 elevation={6}
                 variant="filled"
              >
                {alert.msg}
              </MUIAlert>
            </Snackbar>
          ))
        }
      </Stack>
    </Fragment>
  )
}

export default Alert;