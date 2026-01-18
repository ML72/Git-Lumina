import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Chip,
  Stack,
  Avatar,
  useTheme,
  alpha,
  Fab,
  Tooltip,
  Collapse
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as BotIcon, 
  Person as PersonIcon,
  Description as FileIcon, 
  Code as CodeIcon,
  Info as InfoIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CenterFocusStrong as ResetIcon
} from '@mui/icons-material';
import CustomPage from '../components/CustomPage';
import GraphDisplay, { GraphDisplayRef } from '../components/GraphDisplay';
import Webcam, { GestureState } from '../components/Webcam';
import useGestureControls, { GestureControlState } from '../hooks/useGestureControls';

// Mock Data
const MOCK_CHAT = [
  { id: 1, sender: 'user', text: 'How is the user authentication implemented?' },
  { id: 2, sender: 'system', text: 'User authentication is primarily handled in `src/auth/AuthProvider.tsx`. It uses a custom hook `useAuth` to manage session state and integrates with the backend API endpoints defined in `src/api/auth.ts`.' },
  { id: 3, sender: 'user', text: 'What is the structure of the Redux store?' },
  { id: 4, sender: 'system', text: 'The Redux store is configured in `src/store/index.ts`. It uses Redux Toolkit slices, which are organized in the `src/store/slices` directory. The main slices are `userSlice`, `notificationSlice`, and `repoSlice`.' },
];

const MOCK_INFO = {
  name: "project-repository",
  stats: {
    files: 142,
    components: 28,
    linesOfCode: 15420
  },
  layers: ['Presentation', 'Business Logic', 'Data Access']
};

const Results: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [webcamVisible, setWebcamVisible] = useState(true);
  const [cursors, setCursors] = useState<GestureControlState['cursors']>({
    left: null,
    right: null
  });
  const [gestureMode, setGestureMode] = useState<'idle' | 'one-hand-pan' | 'two-hand-zoom'>('idle');
  const [activeHandCount, setActiveHandCount] = useState(0);
  
  const graphDisplayRef = useRef<GraphDisplayRef>(null);
  const { processGesture } = useGestureControls();
  
  // Timer ref for auto-reset when no hands detected
  const noHandsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadHandsRef = useRef(false);
  
  // Auto-reset timeout duration (5 seconds)
  const AUTO_RESET_DELAY = 5000;
  
  // Handle gesture updates from webcam
  const handleGestureUpdate = useCallback((gestureState: GestureState) => {
    const controlState = processGesture(gestureState);
    
    // Update cursors for visualization
    setCursors(controlState.cursors);
    
    // Update mode for display
    setGestureMode(controlState.mode);
    setActiveHandCount(controlState.activeHandCount);
    
    // Check if any hands are currently detected (regardless of open/closed state)
    const handsDetected = gestureState.leftHand !== null || gestureState.rightHand !== null;
    
    if (handsDetected) {
      // Hands detected - clear any pending reset timer
      if (noHandsTimerRef.current) {
        clearTimeout(noHandsTimerRef.current);
        noHandsTimerRef.current = null;
      }
      hadHandsRef.current = true;
    } else if (hadHandsRef.current && !noHandsTimerRef.current) {
      // No hands detected and we previously had hands - start reset timer
      console.log('[Results] No hands detected - starting 5 second reset timer');
      noHandsTimerRef.current = setTimeout(() => {
        console.log('[Results] 5 seconds without hands - resetting view');
        if (graphDisplayRef.current) {
          graphDisplayRef.current.resetView();
        }
        noHandsTimerRef.current = null;
        hadHandsRef.current = false;
      }, AUTO_RESET_DELAY);
    }
    
    // Apply controls to graph
    if (graphDisplayRef.current) {
      graphDisplayRef.current.applyGestureControl(controlState);
    }
  }, [processGesture]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (noHandsTimerRef.current) {
        clearTimeout(noHandsTimerRef.current);
      }
    };
  }, []);
  
  // Reset graph view
  const handleResetView = useCallback(() => {
    if (graphDisplayRef.current) {
      graphDisplayRef.current.resetView();
    }
  }, []);

  return (
    <CustomPage>
      <Box sx={{ 
        display: 'flex', 
        height: '100vh', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Left Panel - Sidebar */}
        <Paper 
          elevation={3}
          sx={{ 
            width: 400, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            zIndex: 10,
            borderRadius: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper'
          }}
        >
          {/* Header Section */}
          <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {MOCK_INFO.name}
            </Typography>
            <Stack direction="row" spacing={1} mb={2}>
              <Chip label="TypeScript" size="small" color="primary" variant="outlined" />
              <Chip label="React" size="small" color="secondary" variant="outlined" />
              <Chip label="v1.0.2" size="small" variant="outlined" />
            </Stack>
            
            <Stack direction="row" spacing={3} sx={{ color: 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FileIcon fontSize="small" />
                <Typography variant="body2">{MOCK_INFO.stats.files} Files</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CodeIcon fontSize="small" />
                <Typography variant="body2">{(MOCK_INFO.stats.linesOfCode / 1000).toFixed(1)}k LOC</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Scrollable Content Area */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            
            {/* General Info */}
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon fontSize="small" color="primary" />
                Repository Insights
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This codebase follows a standard React architecture separated by feature slices. The component hierarchy is well-structured with clear separation between container and presentational components.
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>Detected Layers:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {MOCK_INFO.layers.map(layer => (
                  <Chip key={layer} label={layer} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }} />
                ))}
              </Box>
            </Box>

            <Divider />

            {/* Chat Section Header */}
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Cortex AI Assistant
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ask questions about the codebase structure and dependencies.
              </Typography>
            </Box>

            {/* Chat Messages */}
            <List sx={{ px: 2, pb: 2 }}>
              {MOCK_CHAT.map((msg) => (
                <ListItem key={msg.id} alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box sx={{ mr: 2, mt: 1 }}>
                    {msg.sender === 'system' ? (
                      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                        <BotIcon fontSize="small" />
                      </Avatar>
                    ) : (
                      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    )}
                  </Box>
                  <Paper sx={{ 
                    p: 2, 
                    bgcolor: msg.sender === 'system' ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 2,
                    maxWidth: '100%'
                  }}>
                    <ListItemText 
                      primary={msg.sender === 'user' ? 'You' : 'Cortex AI'}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', mb: 0.5, display: 'block' }}
                      secondary={msg.text}
                      secondaryTypographyProps={{ variant: 'body2', color: 'text.primary' }}
                    />
                  </Paper>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Chat Input Area - Fixed at bottom of sidebar */}
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about this repo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" color="primary">
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>

        {/* Right Panel - Graph Display */}
        <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
          <GraphDisplay 
            ref={graphDisplayRef}
            isGestureActive={webcamEnabled && activeHandCount > 0}
          />
          
          {/* Webcam Preview (Picture-in-Picture style) - Always visible in bottom right */}
          <Collapse in={webcamVisible}>
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: 100, 
                right: 20, 
                width: 320,
                height: 240,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: `2px solid ${webcamEnabled ? 'rgba(78, 205, 196, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                zIndex: 100,
                transition: 'border-color 0.3s ease'
              }}
            >
              <Webcam 
                onGestureUpdate={webcamEnabled ? handleGestureUpdate : () => {}}
                showVideo={true}
                showOverlay={true}
              />
              {/* Gesture control status indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: webcamEnabled ? 'rgba(78, 205, 196, 0.9)' : 'rgba(100, 100, 100, 0.9)',
                  color: '#fff',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
              >
                {webcamEnabled ? '● Controls Active' : '○ Controls Off'}
              </Box>
            </Box>
          </Collapse>
          
          {/* Floating Controls */}
          <Box sx={{ 
            position: 'absolute', 
            bottom: 20, 
            right: 20, 
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {/* Toggle webcam visibility */}
            <Tooltip title={webcamVisible ? "Hide webcam preview" : "Show webcam preview"} placement="left">
              <Fab 
                size="small" 
                color="default"
                onClick={() => setWebcamVisible(!webcamVisible)}
                sx={{ 
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                }}
              >
                {webcamVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </Fab>
            </Tooltip>
            
            {/* Reset view button */}
            <Tooltip title="Reset view" placement="left">
              <Fab 
                size="small" 
                color="default"
                onClick={handleResetView}
                sx={{ 
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                }}
              >
                <ResetIcon />
              </Fab>
            </Tooltip>
            
            {/* Toggle webcam on/off */}
            <Tooltip title={webcamEnabled ? "Disable gesture controls" : "Enable gesture controls"} placement="left">
              <Fab 
                color={webcamEnabled ? "primary" : "default"}
                onClick={() => setWebcamEnabled(!webcamEnabled)}
                sx={{ 
                  bgcolor: webcamEnabled ? theme.palette.primary.main : 'background.paper',
                  '&:hover': { 
                    bgcolor: webcamEnabled 
                      ? theme.palette.primary.dark 
                      : alpha(theme.palette.primary.main, 0.1) 
                  }
                }}
              >
                {webcamEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </Fab>
            </Tooltip>
          </Box>
          
          {/* Gesture Control Instructions (shown when webcam is visible and controls are enabled) */}
          {webcamVisible && webcamEnabled && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                zIndex: 100,
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                borderRadius: 2,
                p: 2,
                maxWidth: 280,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                🖐️ Gesture Controls
              </Typography>
              <Typography variant="caption" component="div" color="text.secondary">
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  <li><strong>Close one hand:</strong> Rotate/Pan the graph</li>
                  <li><strong>Close both hands:</strong> Pinch to zoom + pan</li>
                  <li><strong>Open hands:</strong> Release control</li>
                </Box>
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Your arm span calibrates sensitivity automatically.
              </Typography>
            </Box>
          )}
          
          {/* Active Mode Indicator - Large visual feedback */}
          {webcamEnabled && (
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1
              }}
            >
              {/* Mode Badge */}
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: gestureMode === 'idle' 
                    ? 'rgba(100, 100, 100, 0.9)' 
                    : gestureMode === 'one-hand-pan' 
                      ? 'rgba(255, 107, 107, 0.9)' 
                      : 'rgba(78, 205, 196, 0.9)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: gestureMode !== 'idle' ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                {gestureMode === 'idle' && '👐 HANDS OPEN'}
                {gestureMode === 'one-hand-pan' && '✊ PAN MODE'}
                {gestureMode === 'two-hand-zoom' && '🤏 ZOOM MODE'}
              </Box>
              
              {/* Hand count indicator */}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#fff', 
                  bgcolor: 'rgba(0,0,0,0.6)', 
                  px: 2, 
                  py: 0.5, 
                  borderRadius: 1 
                }}
              >
                Active hands: {activeHandCount} | 
                L: {cursors.left ? (cursors.left.isActive ? '✊ CLOSED' : '✋ OPEN') : '❌'} | 
                R: {cursors.right ? (cursors.right.isActive ? '✊ CLOSED' : '✋ OPEN') : '❌'}
              </Typography>
            </Box>
          )}
        </Box>

      </Box>
    </CustomPage>
  );
};

export default Results;
