import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  Collapse,
  ListItemIcon,
  ListItemButton,
  Switch
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
  CenterFocusStrong as ResetIcon,
  AccountTree as AccountTreeIcon,
  Folder as FolderIcon,
  PlayArrow as PlayArrowIcon,
  ExpandLess,
  ExpandMore,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import CustomPage from '../components/CustomPage';
import GraphDisplay, { GraphDisplayRef } from '../components/GraphDisplay';
import Webcam, { GestureState } from '../components/Webcam';
import useGestureControls, { GestureControlState } from '../hooks/useGestureControls';
import { selectGraph } from '../store/slices/graph';

const CATEGORY_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#F1948A', '#85C1E9', '#82E0AA'
];

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
  const location = useLocation();
  const graph = useSelector(selectGraph);
  const [query, setQuery] = useState('');
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [webcamVisible, setWebcamVisible] = useState(true);
  const [cursors, setCursors] = useState<GestureControlState['cursors']>({
    left: null,
    right: null
  });
  const [gestureMode, setGestureMode] = useState<'idle' | 'left-hand-rotate' | 'right-hand-pan' | 'two-hand-zoom'>('idle');
  const [activeHandCount, setActiveHandCount] = useState(0);
  
  const graphDisplayRef = useRef<GraphDisplayRef>(null);
  const { processGesture } = useGestureControls();
  const [chat, setChat] = useState(MOCK_CHAT);
  
  // Try to retrieve large graph from navigation state if available
  const largeGraph = location.state?.largeGraph;
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  // Timer ref for auto-reset when no hands detected
  const noHandsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadHandsRef = useRef(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const toggleCategory = (idx: number) => {
      setExpandedCategories(prev => ({
          ...prev,
          [idx]: !prev[idx]
      }));
  };
  
  // Auto-reset timeout duration (5 seconds)
  const AUTO_RESET_DELAY = 5000;
  
  // Section toggle state
  const [activeSection, setActiveSection] = useState<string>('insights');
  
  // Quest data and state
  const [quests, setQuests] = useState([
    { id: 1, title: 'Understand Entry Point', description: 'Find where the app starts', completed: false },
    { id: 2, title: 'Explore Components', description: 'Review the component structure', completed: false },
    { id: 3, title: 'Check State Management', description: 'Understand how data flows', completed: false },
  ]);
  const [activeQuestId, setActiveQuestId] = useState<number | null>(1);
  
  const toggleQuestCompletion = (questId: number) => {
    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, completed: !q.completed } : q
    ));
  };
  
  // Suggested questions for Cortex
  const SUGGESTED_QUESTIONS = [
    'How does auth work?',
    'Explain the data flow',
    'What are the main components?'
  ];
  
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
  
  // Handle webcam error
  const handleWebcamError = useCallback(() => {
    setWebcamEnabled(false);
  }, []);

  const handleSuggestedQuestion = (text: string) => {
      setChat(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
      // Simulate response for better UX
      setTimeout(() => {
          setChat(prev => [...prev, { id: Date.now() + 1, sender: 'system', text: `Analyzing ${text.toLowerCase()}... (Simulation)` }]);
      }, 800);
      setQuery('');
  };

  const handleSectionToggle = (section: 'insights' | 'quests' | 'cortex' | 'categories') => {
      if (activeSection === section) {
        setActiveSection('');
      } else {
        setActiveSection(section);
        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
        }
      }
  };

  // Resize Handlers
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
          const newWidth = mouseMoveEvent.clientX;
          if (newWidth > 260 && newWidth < 600) {
              setSidebarWidth(newWidth);
          }
      }
  }, [isResizing]);

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
            {/* Content Container - Hide if collapsed */}
            {isSidebarOpen ? (
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflowY: 'hidden',
                    minWidth: sidebarWidth, 
                    position: 'relative',
                    zIndex: 1,
                }}>
                    
                    {/* 2. Repository Insight Section */}
                    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Box 
                            sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                            onClick={() => handleSectionToggle('insights')}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PlayArrowIcon fontSize="small" sx={{ color: activeSection === 'insights' ? '#79c0ff' : 'rgba(255,255,255,0.5)' }} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: activeSection === 'insights' ? '#79c0ff' : 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                                    REPOSITORY INSIGHTS
                                </Typography>
                            </Box>
                            {activeSection === 'insights' ? <ExpandLess fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                        </Box>
                        
                        <Collapse in={activeSection === 'insights'}>
                            <Box sx={{ px: 2, pb: 2 }}>
                                <Typography variant="body2" paragraph sx={{ whiteSpace: 'normal', color: 'rgba(255,255,255,0.7)' }}>
                                    {graph?.nodes ? `${graph.nodes.length} files analyzed across ${graph.categories.length} categories.` : "Analyzing repository structure..."}
                                </Typography>
                                
                                <Typography variant="caption" fontWeight="bold" sx={{ mt: 1, display: 'block', color: 'rgba(255,255,255,0.5)' }}>
                                    TOP CATEGORIES
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    {graph?.categories.slice(0, 5).map((cat: string, i: number) => (
                                        <Chip 
                                            key={cat} 
                                            label={cat} 
                                            size="small" 
                                            variant="outlined" 
                                            sx={{ 
                                                fontWeight: 'bold', 
                                                borderColor: alpha(CATEGORY_COLORS[i % CATEGORY_COLORS.length], 0.4), 
                                                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], 
                                                bgcolor: alpha(CATEGORY_COLORS[i % CATEGORY_COLORS.length], 0.1) 
                                            }} 
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Collapse>
                    </Box>

                    {/* NEW: Categories Section */}
                    {graph && (
                    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Box 
                            sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                            onClick={() => handleSectionToggle('categories')}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountTreeIcon fontSize="small" sx={{ color: activeSection === 'categories' ? '#79c0ff' : 'rgba(255,255,255,0.5)' }} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: activeSection === 'categories' ? '#79c0ff' : 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                                    CODE ORGANIZATION
                                </Typography>
                            </Box>
                            {activeSection === 'categories' ? <ExpandLess fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                        </Box>
                        
                        <Collapse in={activeSection === 'categories'}>
                            <List disablePadding sx={{ pb: 1 }}>
                                {graph.categories.map((category: string, idx: number) => {
                                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                                    const fileCount = graph.nodes.filter((n: any) => n.category === idx).length;
                                    const isOpen = expandedCategories[idx];
                                    
                                    // Optimization: filter files only if open
                                    const files = isOpen ? graph.nodes.filter((n: any) => n.category === idx) : [];

                                    return (
                                        <React.Fragment key={category}>
                                            <ListItemButton 
                                                onClick={() => toggleCategory(idx)}
                                                sx={{ py: 1, px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                    <FolderIcon sx={{ color: color, fontSize: 20 }} />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={category} 
                                                    primaryTypographyProps={{ variant: 'body2', color: 'rgba(255,255,255,0.9)' }}
                                                    secondary={`${fileCount} files`}
                                                    secondaryTypographyProps={{ variant: 'caption', color: 'rgba(255,255,255,0.5)' }}
                                                />
                                                {isOpen ? <ExpandLess fontSize="small" sx={{ color: 'rgba(255,255,255,0.3)' }} /> : <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.3)' }} />}
                                            </ListItemButton>
                                            
                                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                <List disablePadding sx={{ bgcolor: 'rgba(0,0,0,0.1)', mb: 1 }}>
                                                    {files.map((node: any) => (
                                                        <ListItemButton key={node.filepath} sx={{ pl: 4, py: 0.5, minHeight: 0 }}>
                                                            <ListItemIcon sx={{ minWidth: 24 }}>
                                                                <FileIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }} />
                                                            </ListItemIcon>
                                                            <ListItemText 
                                                                primary={node.filepath} 
                                                                primaryTypographyProps={{ 
                                                                    variant: 'caption', 
                                                                    color: 'rgba(255,255,255,0.7)', 
                                                                    sx: { wordBreak: 'break-all' } 
                                                                }} 
                                                            />
                                                        </ListItemButton>
                                                    ))}
                                                </List>
                                            </Collapse>
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        </Collapse>
                    </Box>
                    )}

                    {/* 3. Quest / Onboarding Section */}
                    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Box 
                            sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                            onClick={() => handleSectionToggle('quests')}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SchoolIcon fontSize="small" sx={{ color: activeSection === 'quests' ? '#79c0ff' : 'rgba(255,255,255,0.5)' }} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: activeSection === 'quests' ? '#79c0ff' : 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                                    LEARNING QUESTS
                                </Typography>
                            </Box>
                            {activeSection === 'quests' ? <ExpandLess fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                        </Box>
                        
                        <Collapse in={activeSection === 'quests'}>
                            <Box sx={{ px: 2, pb: 2 }}>
                                <Typography variant="caption" paragraph sx={{ whiteSpace: 'normal', display: 'block', color: 'rgba(255,255,255,0.5)' }}>
                                    Follow the path to understand the architecture.
                                </Typography>
                                
                                <List disablePadding>
                                    {quests.map((quest) => (
                                        <ListItem 
                                            key={quest.id} 
                                            sx={{ 
                                                p: 1.5, 
                                                mb: 1,
                                                borderRadius: 2,
                                                background: quest.completed 
                                                    ? 'linear-gradient(90deg, rgba(46, 160, 67, 0.15) 0%, rgba(46, 160, 67, 0.05) 100%)'
                                                    : (activeQuestId === quest.id 
                                                        ? 'linear-gradient(90deg, rgba(88, 166, 255, 0.15) 0%, rgba(88, 166, 255, 0.05) 100%)' 
                                                        : 'transparent'),
                                                border: quest.completed 
                                                    ? '1px solid rgba(46, 160, 67, 0.3)'
                                                    : (activeQuestId === quest.id ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid transparent'),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': { 
                                                    transform: 'translateX(4px)',
                                                    bgcolor: 'rgba(255,255,255,0.05)' 
                                                }
                                            }}
                                            onClick={() => {
                                                toggleQuestCompletion(quest.id);
                                                setActiveQuestId(quest.id);
                                            }}
                                        >
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleQuestCompletion(quest.id);
                                                }}
                                                sx={{ mr: 1, p: 0.5 }}
                                            >
                                                {quest.completed ? 
                                                    <CheckCircleIcon sx={{ color: '#3fb950', fontSize: 20 }} /> : 
                                                    <UncheckedIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} /> 
                                                }
                                            </IconButton>
                                            <ListItemText 
                                                primary={quest.title}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: activeQuestId === quest.id ? 700 : 400, color: quest.completed ? 'rgba(255,255,255,0.9)' : (activeQuestId === quest.id ? '#79c0ff' : 'rgba(255,255,255,0.7)') }}
                                                secondary={quest.description}
                                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, display: 'block', color: 'rgba(255,255,255,0.5)' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        </Collapse>
                    </Box>

                    {/* 4. Cortex Interface - Expands to fill */}
                    <Box sx={{ 
                        flex: activeSection === 'cortex' ? 1 : 0, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        minHeight: 0, 
                        transition: 'flex 0.3s'
                    }}>
                        <Box 
                            sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: activeSection === 'cortex' ? '1px solid rgba(255,255,255,0.06)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                             onClick={() => handleSectionToggle('cortex')}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BotIcon fontSize="small" sx={{ color: activeSection === 'cortex' ? '#a371f7' : 'rgba(255,255,255,0.5)' }} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: activeSection === 'cortex' ? '#a371f7' : 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                                    CORTEX
                                </Typography>
                            </Box>
                             {activeSection === 'cortex' ? <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)', transform: 'rotate(180deg)' }} /> : <ExpandMore fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                        </Box>
                        
                        {activeSection === 'cortex' && (
                            <>
                                {/* Messages Area */}
                                <Box sx={{ 
                                    flex: 1, 
                                    overflowY: 'auto', 
                                    p: 2,
                                    '&::-webkit-scrollbar': { display: 'none' },
                                    scrollbarWidth: 'none'
                                }}>
                                    {chat.map((msg) => (
                                        <Box key={msg.id} sx={{ mb: 2, display: 'flex', gap: 1.5, flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: msg.sender === 'user' ? 'rgba(121, 192, 255, 0.2)' : 'rgba(163, 113, 247, 0.2)', border: msg.sender === 'user' ? '1px solid rgba(121, 192, 255, 0.3)' : '1px solid rgba(163, 113, 247, 0.3)' }}>
                                                {msg.sender === 'user' ? <SchoolIcon sx={{ fontSize: 18, color: '#79c0ff' }} /> : <BotIcon sx={{ fontSize: 18, color: '#a371f7' }} />}
                                            </Avatar>
                                            <Paper sx={{ 
                                                p: 2, 
                                                bgcolor: msg.sender === 'user' ? 'rgba(121, 192, 255, 0.08)' : 'rgba(22, 27, 34, 0.6)', 
                                                color: '#d0d7de',
                                                borderRadius: msg.sender === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', 
                                                maxWidth: '85%',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                border: msg.sender === 'user' ? '1px solid rgba(121, 192, 255, 0.2)' : '1px solid rgba(163, 113, 247, 0.1)',
                                                backdropFilter: 'blur(4px)'
                                            }}>
                                                <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{msg.text}</Typography>
                                            </Paper>
                                        </Box>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </Box>

                                {/* Suggested Questions */}
                                <Box sx={{ px: 2, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {SUGGESTED_QUESTIONS.map((q, i) => (
                                        <Chip 
                                            key={i} 
                                            label={q} 
                                            size="small" 
                                            onClick={() => handleSuggestedQuestion(q)}
                                            icon={<LightbulbIcon fontSize="small" style={{ color: '#fff' }} />}
                                            sx={{ 
                                                cursor: 'pointer', 
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                color: 'rgba(255,255,255,0.8)',
                                                fontWeight: 500,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                backdropFilter: 'blur(4px)',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }
                                            }}
                                        />
                                    ))}
                                </Box>

                                {/* Input Area */}
                                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Ask Cortex..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && query.trim()) {
                                                handleSuggestedQuestion(query);
                                            }
                                        }}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton 
                                                        edge="end" 
                                                        size="small" 
                                                        sx={{ color: '#79c0ff', '&:hover': { bgcolor: 'rgba(121, 192, 255, 0.1)' } }}
                                                        onClick={() => query.trim() && handleSuggestedQuestion(query)}
                                                    >
                                                        <SendIcon fontSize="small" />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                            sx: { 
                                                borderRadius: 4, 
                                                fontSize: '0.875rem',
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                color: '#fff',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2) !important' },
                                                '&.Mui-focused fieldset': { borderColor: '#79c0ff !important' },
                                                input: { '&::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 } }
                                            }
                                        }}
                                    />
                                </Box>
                            </>
                        )}
                    </Box>

                </Box>
            ) : (
                // Collapsed State Icons
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pt: 3 }}>
                    <Tooltip title="Repository Insights" placement="right">
                        <IconButton 
                            onClick={() => handleSectionToggle('insights')}
                            sx={{ color: '#79c0ff', '&:hover': { bgcolor: 'rgba(121, 192, 255, 0.1)' } }}
                        >
                            <PlayArrowIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Learning Quests" placement="right">
                        <IconButton 
                            onClick={() => handleSectionToggle('quests')}
                            sx={{ color: '#79c0ff', '&:hover': { bgcolor: 'rgba(121, 192, 255, 0.1)' } }}
                        >
                            <SchoolIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Cortex" placement="right">
                        <IconButton 
                            onClick={() => handleSectionToggle('cortex')}
                            sx={{ color: '#a371f7', '&:hover': { bgcolor: 'rgba(163, 113, 247, 0.1)' } }}
                        >
                            <BotIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
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
                bottom: 20, 
                right: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1,
                zIndex: 100,
              }}
            >
              {/* Controls and status indicator - Moved above camera */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(22, 27, 34, 0.8)',
                  backdropFilter: 'blur(4px)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#d0d7de' }}>
                    Motion Controls
                  </Typography>
                  <Switch
                    checked={webcamEnabled}
                    onChange={(e) => setWebcamEnabled(e.target.checked)}
                    size="small"
                    sx={{
                       '& .MuiSwitch-switchBase': {
                           color: '#fff',
                       },
                       '& .MuiSwitch-switchBase.Mui-checked': {
                           color: '#a371f7', // Purple
                       },
                       '& .MuiSwitch-track': {
                           backgroundColor: '#666',
                       },
                       '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'rgba(163, 113, 247, 0.5)', // Purple/translucent
                       }
                    }}
                  />
                  
                  <Box
                    sx={{
                      bgcolor: webcamEnabled ? 'rgba(78, 205, 196, 0.9)' : 'rgba(100, 100, 100, 0.9)',
                      color: '#fff',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      minWidth: 35,
                      textAlign: 'center'
                    }}
                  >
                    {webcamEnabled ? 'ON' : 'OFF'}
                  </Box>
              </Box>

              <Box 
                sx={{ 
                  width: 320,
                  height: 240,
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  border: `2px solid ${webcamEnabled ? 'rgba(78, 205, 196, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                  transition: 'border-color 0.3s ease',
                  bgcolor: '#000'
                }}
              >
                <Webcam 
                  onGestureUpdate={webcamEnabled ? handleGestureUpdate : () => {}}
                  showVideo={true}
                  showOverlay={true}
                  enabled={webcamEnabled}
                  onError={handleWebcamError}
                />
              </Box>
            </Box>
          </Collapse>
          
          
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
              <Typography
                component="div"
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: gestureMode === 'idle' 
                    ? 'rgba(100, 100, 100, 0.9)' 
                    : gestureMode === 'left-hand-rotate' 
                      ? 'rgba(255, 193, 7, 0.9)'  // Yellow for rotate
                      : gestureMode === 'right-hand-pan'
                        ? 'rgba(255, 107, 107, 0.9)'  // Red for pan
                        : 'rgba(78, 205, 196, 0.9)',  // Teal for zoom
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  fontFamily: theme.typography.fontFamily,
                  boxShadow: gestureMode !== 'idle' ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                {gestureMode === 'idle' && '👐 HANDS OPEN'}
                {gestureMode === 'left-hand-rotate' && '🔄 ROTATE MODE'}
                {gestureMode === 'right-hand-pan' && '✊ PAN MODE'}
                {gestureMode === 'two-hand-zoom' && '🤏 ZOOM MODE'}
              </Typography>
              
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

           <GraphDisplay graph={largeGraph} />
        </Box>

      </Box>
    </CustomPage>
  );
};

export default Results;
