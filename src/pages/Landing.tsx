import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Stack, 
  MenuItem,
  Select,
  Collapse, 
  FormControlLabel, 
  Switch, 
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  GitHub as GitHubIcon, 
  Settings as SettingsIcon,
  Key as KeyIcon,
  Search as SearchIcon,
  AutoAwesome as AutoAwesomeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountTree as AccountTreeIcon,
  Speed as SpeedIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setOpenAiKey } from '../store/slices/api';
import { setNewAlert } from '../service/alert';
import { generateAndStoreGraph } from '../service/codebase';
import CustomPage from '../components/CustomPage';

const Landing: React.FC = () => {
  const [apiKey, setApiKeyInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Advanced settings state
  const [is3D, setIs3D] = useState(false);
  const [includeTests, setIncludeTests] = useState(false);
  const [fileExtensions, setFileExtensions] = useState('ts,tsx,js,jsx,py,java,cpp,h');

  // New state for GitHub integration
  const [uploadMode, setUploadMode] = useState<'upload' | 'github'>('upload');
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const downloadGithubRepo = async (repoUrl: string): Promise<File> => {
    // Normalize URL to remove .git or trailing slashes
    let cleanUrl = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');
    
    // Define potential download URLs
    const targets = [
        `${cleanUrl}/archive/refs/heads/main.zip`,
        `${cleanUrl}/archive/refs/heads/master.zip`
    ];

    let lastError;

    for (const targetUrl of targets) {
        // Try multiple proxies
        const proxies = [
             `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
             `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
        ];

        for (const proxyUrl of proxies) {
            try {
                console.log(`Attempting to fetch ${targetUrl} via proxy...`);
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    console.warn(`Failed to fetch ${targetUrl} via proxy: ${response.status}`);
                    continue; // Try next proxy
                }
                
                const blob = await response.blob();
                
                // Validate blob size - error pages are usually small HTML
                if (blob.size < 500) {
                     throw new Error("Response too small, likely an error page.");
                }

                return new File([blob], "repository.zip", { type: 'application/zip' });
            } catch (err) {
                console.warn(`Download failed for ${targetUrl}:`, err);
                lastError = err;
            }
        }
    }

    throw new Error('Failed to download repository. Please check if the repository is public and the URL is correct.');
  };

  const handleStartAnalysis = async () => {
    // 1. Validation
    if (!apiKey) {
      setNewAlert(dispatch, { msg: "Please enter your OpenAI API Key", alertType: "error" });
      return;
    }

    if (uploadMode === 'github' && !githubUrl) {
      setNewAlert(dispatch, { msg: "Please enter a valid GitHub repository URL", alertType: "error" });
      return;
    }

    if (uploadMode === 'upload' && !selectedFile) {
      setNewAlert(dispatch, { msg: "Please upload a ZIP file of your codebase", alertType: "error" });
      return;
    }

    setIsLoading(true);
    
    try {
        let fileToProcess = selectedFile;

        // 2. Download if GitHub
        if (uploadMode === 'github') {
            try {
                // Pass the base URL directly
                fileToProcess = await downloadGithubRepo(githubUrl);
                setFileName(fileToProcess.name);
                setSelectedFile(fileToProcess);
            } catch (error: any) {
                console.error(error);
                setNewAlert(dispatch, { msg: error.message || 'Failed to download GitHub repository, please use a zip file instead', alertType: "error" });
                setIsLoading(false);
                return;
            }
        }

        // 3. Update Redux State
        dispatch(setOpenAiKey(apiKey));

        // 4. Generate Graph & Store & Navigate
        if (fileToProcess) {
             await generateAndStoreGraph(fileToProcess, dispatch, navigate, apiKey);
             // generateAndStoreGraph handles dispatching setGraph, setName and navigating
             // It also handles errors for graph generation
        }

    } catch (error: any) {
        console.error(error);
        setNewAlert(dispatch, { msg: error.message || "An unexpected error occurred", alertType: "error" });
    } finally {
        setIsLoading(false);
    }
  };

  // Feature card component
  const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        bgcolor: alpha('#161b22', 0.6),
        border: '1px solid',
        borderColor: 'rgba(56, 139, 253, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: 4,
        transition: 'all 0.3s ease',
        background: 'linear-gradient(180deg, rgba(22, 27, 34, 0.6) 0%, rgba(22, 27, 34, 0.3) 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(56, 139, 253, 0.5), transparent)',
            opacity: 0.5
        },
        '&:hover': {
          transform: 'translateY(-5px)',
          borderColor: '#a371f7',
          boxShadow: '0 10px 30px -10px rgba(163, 113, 247, 0.3)',
          '& .icon-box': {
            transform: 'scale(1.1)',
            bgcolor: 'rgba(163, 113, 247, 0.2)'
          }
        }
      }}
    >
      <Box 
        className="icon-box"
        sx={{ 
            mb: 2, 
            display: 'inline-flex', 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: 'rgba(56, 139, 253, 0.1)', 
            color: '#a371f7',
            transition: 'all 0.3s'
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontWeight: 700 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: '#8b949e', lineHeight: 1.6 }}>{description}</Typography>
    </Paper>
  );

  return (
    <CustomPage>
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          background: '#0d1117',
          position: 'relative',
          overflowX: 'hidden',
          pt: 4,
          pb: 8
        }}
      >
        {/* Magical Background Effects */}
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          zIndex: 0, 
          pointerEvents: 'none',
          overflow: 'hidden'
        }}>
           {/* Top Center Glow */}
           <Box sx={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(88, 166, 255, 0.15) 0%, rgba(0,0,0,0) 60%)',
            filter: 'blur(80px)',
          }} />

          {/* Left Purple Orb */}
          <Box sx={{
            position: 'absolute',
            top: '10%',
            left: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(163, 113, 247, 0.12) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(100px)',
          }} />
          
          {/* Right Pink/Red Orb */}
          <Box sx={{
            position: 'absolute',
            top: '5%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(247, 120, 186, 0.1) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(100px)',
          }} />
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Hero Section */}
          <Box sx={{ mb: 6, textAlign: 'center', maxWidth: '900px' }}>
            <Box 
              sx={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                gap: 1,
                px: 2.5, 
                py: 0.75, 
                borderRadius: 10,
                border: '1px solid rgba(235, 240, 244, 0.1)',
                background: 'linear-gradient(90deg, rgba(88, 166, 255, 0.1) 0%, rgba(163, 113, 247, 0.1) 100%)',
                boxShadow: '0 0 20px rgba(0,0,0,0.2)',
                mb: 3,
                backdropFilter: 'blur(4px)'
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 16, color: '#e2d5fc' }} />
              <Typography variant="caption" sx={{ color: '#e2d5fc', fontWeight: 600, letterSpacing: '0.02em' }}>
                Re-imagining Code Visualization
              </Typography>
            </Box>
            
            <Typography 
              variant="h1" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 800, 
                fontSize: { xs: '2.5rem', md: '4.5rem' },
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                mb: 2,
                color: '#fff',
                textShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              Illuminate your <br/>
              <Box component="span" sx={{ 
                  background: 'linear-gradient(135deg, #fff 0%, #a5d6ff 50%, #d2a8ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(165, 214, 255, 0.3))'
              }}>
                Development Flow
              </Box>
            </Typography>
            
            <Typography variant="h6" sx={{ color: '#8b949e', fontWeight: 400, maxWidth: '640px', mx: 'auto', lineHeight: 1.6, fontSize: '1.25rem', mb: 5 }}>
              Turn your complex repository into an interactive, glowing galaxy of code.
              Understand structure, dependencies, and flow in seconds.
            </Typography>

            {/* Main Action Card */}
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: 4, 
                overflow: 'visible', 
                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)',
                bgcolor: '#161b22', 
                border: '1px solid rgba(255,255,255,0.08)',
                p: 0,
                maxWidth: '600px',
                mx: 'auto',
                position: 'relative'
              }}
            >
              {/* Card Glow Effect */}
              <Box sx={{
                  position: 'absolute',
                  top: '-2px', left: '-2px', right: '-2px', bottom: '-2px',
                  borderRadius: 4,
                  zIndex: -1,
                  background: 'linear-gradient(180deg, rgba(88, 166, 255, 0.5) 0%, rgba(163, 113, 247, 0.2) 50%, transparent 100%)',
                  opacity: 0.8,
                  filter: 'blur(4px)'
              }} />

              <Box sx={{ p: 4 }}>
                <Stack spacing={3}>
                  
                  {/* Input Method Selector */}
                  <FormControl fullWidth>
                    <InputLabel id="input-method-label" sx={{ color: '#8b949e' }}>Source</InputLabel>
                    <Select
                      labelId="input-method-label"
                      value={uploadMode}
                      label="Source"
                      onChange={(e) => setUploadMode(e.target.value as 'upload' | 'github')}
                      sx={{
                        color: '#fff',
                        mb: 3,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363d' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b949e' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#a371f7' },
                        '& .MuiSvgIcon-root': { color: '#8b949e' }
                      }}
                    >
                      <MenuItem value="upload">Upload Zip File</MenuItem>
                      <MenuItem value="github">GitHub Repository</MenuItem>
                    </Select>
                  </FormControl>

                  {/* File Upload Input */}
                  {uploadMode === 'upload' ? (
                  <Box 
                      sx={{ 
                        border: '2px dashed',
                        borderColor: 'rgba(56, 139, 253, 0.3)', // Visible but subtle border
                        borderRadius: 3, 
                        p: 4, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        bgcolor: '#0d1117', // Solid dark background as requested
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)', // Subtle shadow depth
                        position: 'relative',
                        '&:hover': {
                          borderColor: '#a371f7',
                          boxShadow: '0 0 20px rgba(163, 113, 247, 0.2), 0 0 40px rgba(163, 113, 247, 0.1) inset', // Glow on hover
                          bgcolor: '#12161c',
                          transform: 'translateY(-1px)'
                        }
                      }}
                      component="label"
                    >
                      <input 
                        type="file" 
                        hidden 
                        accept=".zip,.tar,.gz" 
                        onChange={handleFileUpload}
                        id="file-upload"
                      />
                      <CloudUploadIcon sx={{ fontSize: 32, color: '#8b949e', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {fileName ? fileName : "Upload codebase (.zip)"}
                      </Typography>
                      {fileName && (
                        <Chip 
                          label="Change" 
                          size="small" 
                          sx={{ mt: 1, bgcolor: '#21262d', color: '#a371f7', border: '1px solid #30363d' }} 
                        />
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ mb: 0 }}>
                       <TextField
                          fullWidth
                          placeholder="https://github.com/username/repo"
                          variant="outlined"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <GitHubIcon sx={{ color: '#8b949e' }} />
                              </InputAdornment>
                            ),
                            sx: {
                              bgcolor: '#0d1117',
                              borderRadius: 2,
                              '& fieldset': { borderColor: '#30363d' },
                              '&:hover fieldset': { borderColor: '#8b949e' },
                              '&.Mui-focused fieldset': { borderColor: '#a371f7' },
                              input: { color: '#fff' }
                            }
                          }}
                       />
                       <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#8b949e' }}>
                          Enter the repository URL. We'll fetch the main branch.
                       </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" sx={{ mb: 1, color: '#d0d7de', display: 'block', fontWeight: 600 }}>
                      OpenAI API Key <Typography component="span" sx={{ color: '#ff7b72' }}>*</Typography>
                    </Typography>
                    <TextField 
                      fullWidth 
                      placeholder="sk-..." 
                      type="password"
                      variant="outlined" 
                      value={apiKey}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <KeyIcon sx={{ color: '#8b949e' }} />
                          </InputAdornment>
                        ),
                        sx: { 
                          bgcolor: '#0d1117',
                          borderRadius: 2,
                          '& fieldset': { borderColor: '#30363d' },
                          '&:hover fieldset': { borderColor: '#8b949e' },
                          '&.Mui-focused fieldset': { borderColor: '#a371f7' },
                          input: { color: '#fff' }
                        }
                      }}
                    />
                  </Box>

                  <Box>
                    <Button 
                      variant="text" 
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      startIcon={<SettingsIcon />}
                      endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ color: '#8b949e', textTransform: 'none', '&:hover': { color: '#a371f7', bgcolor: 'transparent' } }}
                    >
                      Advanced Settings
                    </Button>
                    
                    <Collapse in={showAdvanced}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          mt: 1, 
                          borderRadius: 2, 
                          bgcolor: '#0d1117', 
                          borderColor: '#30363d'
                        }}
                      >
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={4}>
                             <FormControlLabel
                               control={
                                 <Switch 
                                   size="small"
                                   checked={is3D} 
                                   onChange={(e) => setIs3D(e.target.checked)} 
                                   sx={{
                                     '& .MuiSwitch-switchBase.Mui-checked': { color: '#a371f7' },
                                     '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#a371f7' }
                                   }}
                                 />
                               }
                               label={<Typography variant="body2" sx={{ color: '#fff' }}>Enable 3D</Typography>}
                             />
                             <FormControlLabel
                               control={
                                 <Switch 
                                   size="small"
                                   checked={includeTests} 
                                   onChange={(e) => setIncludeTests(e.target.checked)}
                                   sx={{
                                     '& .MuiSwitch-switchBase.Mui-checked': { color: '#a371f7' },
                                     '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#a371f7' }
                                   }} 
                                 />
                               }
                               label={<Typography variant="body2" sx={{ color: '#fff' }}>Include Tests</Typography>}
                             />
                          </Stack>
                           
                           <Box>
                            <Typography variant="caption" sx={{ mb: 1, color: '#d0d7de', display: 'block' }}>
                              File Extensions
                            </Typography>
                            <TextField 
                              fullWidth 
                              size="small"
                              value={fileExtensions}
                              onChange={(e) => setFileExtensions(e.target.value)}
                              InputProps={{
                                sx: { 
                                  color: '#fff',
                                  fontSize: '0.875rem',
                                  '& fieldset': { borderColor: '#30363d' },
                                  '&.Mui-focused fieldset': { borderColor: '#a371f7' },
                                }
                              }}
                            />
                          </Box>
                        </Stack>
                      </Paper>
                    </Collapse>
                  </Box>

                  <Button 
                    variant="contained" 
                    size="large" 
                    fullWidth
                    onClick={handleStartAnalysis}
                    disabled={!apiKey || isLoading}
                    sx={{ 
                      py: 1.5, 
                      borderRadius: 2, 
                      fontSize: '1rem', 
                      fontWeight: 700,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #7928ca 0%, #ff0080 100%)', // Warmer gradient
                      color: '#ffffff',
                      '&:hover': {
                        opacity: 0.9,
                        boxShadow: '0 0 20px rgba(121, 40, 202, 0.4)'
                      },
                      '&:disabled': {
                        background: '#30363d',
                        opacity: 0.5,
                        color: 'rgba(255,255,255,0.4)'
                      }
                    }}
                  >
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : "Analyze Codebase"}
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>

          {/* Features Section */}
          <Box sx={{ width: '100%', mt: 16 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography variant="h2" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
                  Why use Git Lumina?
                </Typography>
                <Typography variant="body1" sx={{ color: '#8b949e', maxWidth: '600px', mx: 'auto' }}>
                  Powerful tools to help you navigate and understand any codebase.
                </Typography>
            </Box>
            
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                gap: 4 
            }}>
              <Box>
                <FeatureCard 
                  icon={<AccountTreeIcon fontSize="large" />} 
                  title="Dependency Graph" 
                  description="Automatically map out the relationships between files, classes, and functions to understand downstream impacts."
                />
              </Box>
              <Box>
                <FeatureCard 
                  icon={<SpeedIcon fontSize="large" />} 
                  title="Instant Onboarding" 
                  description="Help new engineers understand the codebase in minutes instead of days with interactive visual navigation."
                />
              </Box>
              <Box>
                <FeatureCard 
                  icon={<CodeIcon fontSize="large" />} 
                  title="Structural Analysis" 
                  description="Identify spaghetti code, circular dependencies, and monolithic files at a glance."
                />
              </Box>
            </Box>
          </Box>


          {/* Footer */}
          <Box sx={{ mt: 12, textAlign: 'center', borderTop: '1px solid #30363d', width: '100%', pt: 4 }}>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#484f58' }}>
              © 2026 Git Lumina. Open source analysis.
            </Typography>
          </Box>
        </Container>
      </Box>
    </CustomPage>
  );
};

export default Landing;