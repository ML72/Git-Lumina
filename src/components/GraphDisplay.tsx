import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const GraphDisplay: React.FC = () => {
    const theme = useTheme();

    return (
        <Box 
            sx={{ 
                width: '100%', 
                height: '100%', 
                bgcolor: '#1e2329', // Slightly lighter than background.default (#0d1117) or paper (#161b22) to stand out, or just gray
                // For "entirely gray" as requested, I'll use a neutral gray that fits dark theme
                backgroundColor: '#2d333b', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Typography variant="h6" color="text.secondary">
                Graph Visualization Loading...
            </Typography>
            {/* Grid pattern overlay to make it look technical */}
            <Box 
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(#444cf7 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    opacity: 0.1,
                    pointerEvents: 'none'
                }}
            />
        </Box>
    );
};

export default GraphDisplay;
