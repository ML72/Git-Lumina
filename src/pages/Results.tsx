import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Avatar,
  useTheme,
  alpha,
  Button,
  Tooltip,
  Collapse,
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as BotIcon, 
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PlayArrow as PlayArrowIcon,
  School as SchoolIcon,
  Map as MapIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  HelpOutline as HelpIcon,
  ExpandLess,
  ExpandMore,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import CustomPage from '../components/CustomPage';
import GraphDisplay from '../components/GraphDisplay';

// Mock Data for the Socratic Guide
const MOCK_CHAT = [
  { id: 1, sender: 'system', text: 'Welcome to the Git Lumina explorer! I am your guide. Shall we start by looking at the entry point of the application?' },
];

const SUGGESTED_QUESTIONS = [
    "How does authentication work?", 
    "Where is the API client?",
    "Explain the project structure"
];

const Results: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState(MOCK_CHAT);
  
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
  
  // Sections State - Accordion Logic
  const [activeSection, setActiveSection] = useState<'insights' | 'quests' | 'cortex' | null>('insights');
  
  // State for Quests
  const [activeQuestId, setActiveQuestId] = useState<number>(1); 
  const [quests, setQuests] = useState([
    { id: 1, title: 'The Entry Point', description: 'Find where the app starts execution.', completed: false },
    { id: 2, title: 'Data Flow', description: 'Trace how data moves through the app.', completed: false },
    { id: 3, title: 'Authentication', description: 'Discover how users log in.', completed: false },
  ]);

  const toggleQuestCompletion = (id: number) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, completed: !q.completed } : q));
  };

  const handleSuggestedQuestion = (text: string) => {
      setChat(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
      // Simulate response for better UX
      setTimeout(() => {
          setChat(prev => [...prev, { id: Date.now() + 1, sender: 'system', text: `Analyzing ${text.toLowerCase()}... (Simulation)` }]);
      }, 800);
      setQuery('');
  };

  const handleSectionToggle = (section: 'insights' | 'quests' | 'cortex') => {
      if (activeSection === section) {
        setActiveSection(null);
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
      if (isResizing) {
          window.addEventListener("mousemove", resize);
          window.addEventListener("mouseup", stopResizing);
      }
      return () => {
          window.removeEventListener("mousemove", resize);
          window.removeEventListener("mouseup", stopResizing);
      };
  }, [isResizing, resize, stopResizing]);

  const currentWidth = isSidebarOpen ? sidebarWidth : 64;

  return (
    <CustomPage>
      <Box sx={{ 
        display: 'flex', 
        height: '100vh', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Left Panel - Tour Guide Sidebar */}
        <Paper 
          elevation={0}
          sx={{ 
            width: currentWidth, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            zIndex: 10,
            borderRadius: 0,
            borderRight: '1px solid rgba(255,255,255,0.08)',
            bgcolor: 'rgba(13, 17, 23, 0.85)',
            backdropFilter: 'blur(12px)',
            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            position: 'relative',
            boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
          }}
        >
            {/* Ambient Background Glows */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <Box sx={{
                    position: 'absolute',
                    top: '-10%',
                    left: '-20%',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(88, 166, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
                    filter: 'blur(60px)',
                    opacity: 0.8
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: '20%',
                    right: '-10%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(163, 113, 247, 0.06) 0%, rgba(0,0,0,0) 70%)',
                    filter: 'blur(60px)',
                    opacity: 0.8
                }} />
            </Box>

            {/* Resizer Handle */}
            <Box
                onMouseDown={startResizing}
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 4,
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 20,
                    opacity: 0,
                    '&:hover': { opacity: 1, bgcolor: 'primary.main', boxShadow: '0 0 10px #79c0ff' },
                    active: { opacity: 1, bgcolor: 'primary.main' }
                }}
            />

            {/* 1. Header & Toggle */}
            <Box sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isSidebarOpen ? 'space-between' : 'center',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                minHeight: 80, 
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
            }}>
                {isSidebarOpen ? (
                   <Box sx={{ overflow: 'hidden', mr: 1, minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ 
                                p: 0.5, 
                                borderRadius: 1, 
                                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.2), rgba(163, 113, 247, 0.2))',
                                display: 'flex' 
                            }}>
                                <MapIcon sx={{ color: '#79c0ff' }} />
                            </Box>
                            <Typography variant="h6" fontWeight="800" noWrap sx={{ 
                                background: 'linear-gradient(90deg, #fff, #d0d7de)', 
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px'
                            }}>
                                Git Lumina
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             <Typography variant="body2" fontWeight="bold" sx={{ color: '#79c0ff', fontSize: '0.9rem', letterSpacing: 0.5 }}>
                                facebook/react
                             </Typography>
                             <Chip 
                                label="TypeScript" 
                                size="small" 
                                sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem', 
                                    bgcolor: 'rgba(121, 192, 255, 0.15)', 
                                    color: '#79c0ff',
                                    fontWeight: 'bold',
                                    border: '1px solid rgba(121, 192, 255, 0.3)'
                                }} 
                            />
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(208, 215, 222, 0.6)' }}>
                            154 Files • 12k LoC • v18.2.0
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <MapIcon color="primary" fontSize="large" />
                    </Box>
                )}
                
                {isSidebarOpen && (
                    <IconButton 
                        onClick={() => setIsSidebarOpen(false)} 
                        size="small" 
                        sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                )}
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
                                    This looks like a standard React project with Vite. The component hierarchy is well-structured with clear separation between container and presentational components.
                                </Typography>
                                
                                <Typography variant="caption" fontWeight="bold" sx={{ mt: 1, display: 'block', color: 'rgba(255,255,255,0.5)' }}>
                                    DETECTED LAYERS
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip label="Presentation" size="small" variant="outlined" sx={{ fontWeight: 'bold', borderColor: 'rgba(121, 192, 255, 0.4)', color: '#79c0ff', bgcolor: 'rgba(121, 192, 255, 0.1)' }} />
                                    <Chip label="Business Logic" size="small" variant="outlined" sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} />
                                    <Chip label="Data Access" size="small" variant="outlined" sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} />
                                </Box>
                            </Box>
                        </Collapse>
                    </Box>

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

        {/* Right Panel - Graph Display & Search Overlay */}
        <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
            {/* Natural Language Search Overlay */}
            <Box sx={{ 
                position: 'absolute', 
                top: 24, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 100,
                width: '100%',
                maxWidth: 500
            }}>
                <Paper
                    elevation={4}
                    sx={{
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'rgba(22, 27, 34, 0.8)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <IconButton sx={{ p: '10px', color: '#79c0ff' }} aria-label="menu">
                        <SearchIcon />
                    </IconButton>
                    <TextField 
                        variant="standard"
                        placeholder="Find functions, files, or patterns..." 
                        InputProps={{ disableUnderline: true }}
                        sx={{ 
                            ml: 1, 
                            flex: 1, 
                            input: { color: 'white', '&::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 } } 
                        }}
                    />
                    <Chip 
                        label="⌘ K" 
                        size="small" 
                        sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.1)', color: '#8b949e', height: 20, fontSize: '0.625rem' }} 
                    />
                </Paper>
            </Box>

           <GraphDisplay />
        </Box>

      </Box>
    </CustomPage>
  );
};

export default Results;