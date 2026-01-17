import React, { useState } from 'react';
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
  alpha
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as BotIcon, 
  Person as PersonIcon,
  Description as FileIcon, 
  Code as CodeIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import CustomPage from '../components/CustomPage';
import GraphDisplay from '../components/GraphDisplay';
import WebcamStream from '../components/Webcam';

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
          <GraphDisplay />
          <WebcamStream />
          
          {/* Floating Controls Example (Like Google Maps) */}
          <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}>
            {/* We could add zoom buttons or layer toggles here later */}
          </Box>
        </Box>

      </Box>
    </CustomPage>
  );
};

export default Results;