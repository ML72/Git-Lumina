import React, { useMemo, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { Box, Typography, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, List, ListItem, ListItemText, Grid, Chip, alpha, Paper } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import NumbersIcon from '@mui/icons-material/Numbers';
import { useSelector } from 'react-redux';
import { GraphCanvas, GraphNode, GraphEdge, darkTheme, lightTheme, GraphCanvasRef } from 'reagraph';
import { selectGraph } from '../store/slices/graph';
import { GestureControlState } from '../hooks/useGestureControls';
import { CodebaseGraph } from '../types/CodebaseGraph';

export interface GraphDisplayRef {
    applyGestureControl: (control: GestureControlState) => void;
    resetView: () => void;
}

interface GraphDisplayProps {
    cursors?: GestureControlState['cursors'];
    isGestureActive?: boolean; // Pause animation when user is controlling with gestures
    graph?: CodebaseGraph | null; // Optional direct graph prop
}

const GraphDisplay = forwardRef<GraphDisplayRef, GraphDisplayProps>(({ cursors, isGestureActive = false, graph }, ref) => {
    const theme = useTheme();
    const reduxGraph = useSelector(selectGraph);
    const graphData = graph || reduxGraph; // Use prop if provided, otherwise use Redux
    const graphRef = useRef<GraphCanvasRef | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // State for modal
    const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Track accumulated camera state for gesture controls
    const cameraStateRef = useRef({
        panX: 0,
        panY: 0,
        zoom: 1
    });

    // Color palette for category mapping
    const categoryColors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Orange
        '#98D8C8', // Mint
        '#F06292', // Pink
        '#AED581', // Light Green
        '#FFD54F', // Yellow
        '#64B5F6', // Blue 
        '#BA68C8', // Purple
        '#F0F4C3', // Lime
        '#7986CB', // Indigo
        '#E57373', // Light Red
        '#4DB6AC', // Light Teal
        '#4FC3F7', // Light Blue
        '#FFB74D', // Light Orange
        '#A5D6A7', // Light Mint
        '#F48FB1'  // Light Pink
    ];

    const { nodes, edges } = useMemo(() => {
        if (!graphData) return { nodes: [], edges: [] };

        const myNodes: GraphNode[] = graphData.nodes.map((node: any, index: number) => ({
            id: index.toString(), // Using index as ID to match edge source/target
            label: node.filepath,
            fill: categoryColors[node.category % categoryColors.length] || '#CCCCCC',
            data: node, // Storing code data for potential click interaction
            size: 7 // Default size
        }));

        const myEdges: GraphEdge[] = graphData.edges.map((edge: any, index: number) => ({
            id: `edge-${index}`,
            source: edge[0].toString(),
            target: edge[1].toString(),
            size: edge[2] || 1 // Use weight for edge width (size)
        }));

        return { nodes: myNodes, edges: myEdges };
    }, [graphData]);

    // Track frame count for debug logging
    const frameCountRef = useRef(0);
    
    // Apply gesture-based camera controls
    const applyGestureControl = useCallback((control: GestureControlState) => {
        if (!graphRef.current) return;
        
        const { panDelta, rotateDelta, zoomDelta, isActive, activeHandCount, mode } = control;
        
        frameCountRef.current++;
        
        if (!isActive) return;
        
        // Get the camera controls from reagraph
        const controls = graphRef.current.getControls();
        if (!controls) {
            console.warn('[GraphDisplay] Controls not available');
            return;
        }
        
        // Debug log for different modes
        if (mode === 'two-hand-zoom') {
            console.log(`[GraphDisplay] TWO-HAND MODE - zoomDelta: ${zoomDelta.toFixed(4)}, panDelta: (${panDelta.x.toFixed(4)}, ${panDelta.y.toFixed(4)})`);
        } else if (mode === 'left-hand-rotate') {
            console.log(`[GraphDisplay] LEFT-HAND ROTATE - rotateDelta: (${rotateDelta.x.toFixed(4)}, ${rotateDelta.y.toFixed(4)})`);
        }
        
        // Temporarily enable controls to apply our programmatic changes
        const wasEnabled = controls.enabled;
        controls.enabled = true;
        
        // Apply rotation (left hand only)
        if (rotateDelta.x !== 0 || rotateDelta.y !== 0) {
            const rotateSpeed = 3; // Adjust for rotation sensitivity
            
            // Rotate the camera around the target
            // Hand moving right should rotate content right (negative azimuth)
            // Hand moving down should rotate content down (positive polar)
            controls.rotate(-rotateDelta.x * rotateSpeed, rotateDelta.y * rotateSpeed, false);
        }
        
        // Apply panning (truck) - moves camera left/right and up/down
        if (panDelta.x !== 0 || panDelta.y !== 0) {
            const panSpeed = 500; // Adjust for panning sensitivity
            
            // Truck moves the camera: positive x = right, positive y = up
            // Hand moving right should move content right (camera moves left)
            // Hand moving down should move content down (camera moves up)
            controls.truck(panDelta.x * panSpeed, -panDelta.y * panSpeed, false);
        }
        
        // Apply zoom using dolly
        if (zoomDelta !== 0) {
            const zoomSpeed = 500;
            
            console.log(`[GraphDisplay] APPLYING ZOOM: ${zoomDelta * zoomSpeed}`);
            
            // Positive zoomDelta means hands moving apart = zoom in (dolly forward)
            // Negative zoomDelta means hands moving together = zoom out (dolly backward)
            controls.dolly(zoomDelta * zoomSpeed, false);
        }
        
        // Apply the changes immediately without animation
        controls.update(0);
        
        // Restore enabled state (keep disabled to prevent mouse/touch interference)
        controls.enabled = wasEnabled;
    }, []);
    
    // Reset view to initial state
    const resetView = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.fitNodesInView();
        }
        cameraStateRef.current = {
            panX: 0,
            panY: 0,
            zoom: 1
        };
    }, []);
    
    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        applyGestureControl,
        resetView
    }), [applyGestureControl, resetView]);

    useEffect(() => {
        if (graphRef.current && nodes.length > 0) {
            // Slight delay to allow layout to stabilize before fitting
            setTimeout(() => {
                graphRef.current?.fitNodesInView();
            }, 1000);
        }
    }, [nodes]);
    
    // Track previous gesture active state to detect transitions
    const wasGestureActiveRef = useRef(false);
    // Store original settings to restore later
    const originalSettingsRef = useRef({ 
        azimuth: 1, 
        polar: 1,
        enabled: true 
    });
    
    // Pause/resume rotation based on gesture state - stops spinning when gestures are active
    useEffect(() => {
        if (!graphRef.current) return;
        
        const controls = graphRef.current.getControls();
        if (!controls) return;
        
        if (isGestureActive && !wasGestureActiveRef.current) {
            // Just became active - save current settings and disable everything
            console.log('[GraphDisplay] Gesture started - disabling all camera controls');
            originalSettingsRef.current = {
                azimuth: controls.azimuthRotateSpeed,
                polar: controls.polarRotateSpeed,
                enabled: controls.enabled
            };
            // Disable ALL camera controls including user input
            controls.enabled = false;
            controls.azimuthRotateSpeed = 0;
            controls.polarRotateSpeed = 0;
            controls.dampingFactor = 0;
            // Stop any ongoing movement immediately
            controls.update(0);
        } else if (!isGestureActive && wasGestureActiveRef.current) {
            // Just became inactive - restore settings
            console.log('[GraphDisplay] Gesture ended - re-enabling camera controls');
            controls.enabled = originalSettingsRef.current.enabled;
            controls.azimuthRotateSpeed = originalSettingsRef.current.azimuth;
            controls.polarRotateSpeed = originalSettingsRef.current.polar;
            controls.dampingFactor = 0.1;
        }
        wasGestureActiveRef.current = isGestureActive;
    }, [isGestureActive]);

    const handleNodeClick = (node: GraphNode) => {
        setSelectedNodeData(node.data);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedNodeData(null);
    };

    if (!graphData) {
        return (
            <Box 
                ref={containerRef}
                sx={{ 
                    width: '100%', 
                    height: '100%', 
                    bgcolor: '#1e2329', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                <Typography variant="h6" color="text.secondary">
                    Graph Visualization Loading... (No Data)
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
    }

    return (
        <Box 
            ref={containerRef}
            sx={{ 
                width: '100%', 
                height: '100%', 
                bgcolor: '#1e2329',
                position: 'relative'
            }}
        >
            <GraphCanvas
                ref={graphRef}
                nodes={nodes}
                edges={edges}
                layoutType="forceDirected3d"
                labelType="all"
                theme={theme.palette.mode === 'dark' ? darkTheme : lightTheme}
                draggable
                animated={!isGestureActive} // Pause animation when user is controlling with gestures
                cameraMode="rotate"
                onNodeClick={handleNodeClick}
                layoutOverrides={{
                    nodeStrength: -1000,
                    linkDistance: 150
                }}
            />

            <Dialog
                open={isModalOpen}
                onClose={handleCloseModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1e2329',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0))',
                        borderRadius: 3,
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
                    }
                }}
                BackdropProps={{
                    sx: {
                        backdropFilter: 'blur(4px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                    }
                }}
            >
                {selectedNodeData && (
                    <>
                        <DialogTitle sx={{ 
                            p: 3, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(categoryColors[selectedNodeData.category % categoryColors.length] || '#79c0ff', 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <DescriptionIcon sx={{ color: categoryColors[selectedNodeData.category % categoryColors.length] || '#79c0ff' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '0.5px' }}>
                                        {selectedNodeData.filepath}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                                        <Chip 
                                            label={graphData.categories[selectedNodeData.category]} 
                                            size="small" 
                                            sx={{ 
                                                height: 24,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                bgcolor: alpha(categoryColors[selectedNodeData.category % categoryColors.length] || '#fff', 0.1),
                                                color: categoryColors[selectedNodeData.category % categoryColors.length] || '#fff',
                                                border: `1px solid ${alpha(categoryColors[selectedNodeData.category % categoryColors.length] || '#fff', 0.2)}`
                                            }} 
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {selectedNodeData.id || 'N/A'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <IconButton 
                                onClick={handleCloseModal} 
                                sx={{ 
                                    color: 'rgba(255,255,255,0.5)', 
                                    '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } 
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        
                        <DialogContent sx={{ px: 3, pb: 0, pt: 0 }}>
                            <Grid container spacing={2} direction="column">
                                {/* Stats Cards */}
                                <Grid size={{ xs: 12 }} sx={{ mt: 3 }}>
                                    <Paper sx={{ 
                                        py: 2.5,
                                        px: 2.5, 
                                        bgcolor: 'rgba(255,255,255,0.03)', 
                                        borderRadius: 3,
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <NumbersIcon fontSize="small" sx={{ color: '#79c0ff' }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#79c0ff' }}>
                                                METRICS
                                            </Typography>
                                        </Box>
                                        
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>
                                                    Lines of Code
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                                                    {selectedNodeData.num_lines?.toLocaleString() || 0}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>
                                                    Characters
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                                                    {selectedNodeData.num_characters?.toLocaleString() || 0}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                                
                                {/* Dependencies Card */}
                                <Grid size={{ xs: 12 }} sx={{ mt: 3 }}>
                                    <Paper sx={{ 
                                        p: 2.5, 
                                        bgcolor: 'rgba(255,255,255,0.03)', 
                                        borderRadius: 3,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <AccountTreeIcon fontSize="small" sx={{ color: '#A5D6A7' }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#A5D6A7' }}>
                                                DEPENDENCIES
                                            </Typography>
                                            {selectedNodeData.fileDependencies?.length > 0 && (
                                                <Chip label={selectedNodeData.fileDependencies.length} size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.1)' }} />
                                            )}
                                        </Box>
                                        
                                        <Box sx={{ flex: 1 }}>
                                            {selectedNodeData.fileDependencies && selectedNodeData.fileDependencies.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    {selectedNodeData.fileDependencies.map((dep: string) => (
                                                        <Chip 
                                                            key={dep} 
                                                            label={dep} 
                                                            size="small" 
                                                            sx={{ 
                                                                bgcolor: 'rgba(255,255,255,0.05)', 
                                                                color: 'rgba(255,255,255,0.8)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                                            }} 
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                                    No explicit dependencies detected
                                                </Typography>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Functions Section */}
                                <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 0.5 }}>
                                        <CodeIcon fontSize="small" sx={{ color: '#FFD54F' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#FFD54F' }}>
                                            FUNCTIONS & METHODS
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                            ({selectedNodeData.functions ? Object.keys(selectedNodeData.functions).length : 0})
                                        </Typography>
                                    </Box>
                                    
                                    <Paper sx={{ 
                                        bgcolor: 'rgba(0,0,0,0.2)', 
                                        borderRadius: 3,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        overflow: 'hidden'
                                    }}>
                                        {selectedNodeData.functions && Object.keys(selectedNodeData.functions).length > 0 ? (
                                            <List disablePadding sx={{ p: 1 }}>
                                                {Object.entries(selectedNodeData.functions).map(([name, details]: [string, any], index: number) => (
                                                    <React.Fragment key={name}>
                                                        <ListItem sx={{ 
                                                            py: 1.5, 
                                                            px: 2, 
                                                            borderRadius: 2,
                                                            mb: 0.5,
                                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } 
                                                        }}>
                                                            <ListItemText 
                                                                primary={
                                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#ff7b72', fontWeight: 500 }}>
                                                                        {name}()
                                                                    </Typography>
                                                                } 
                                                                secondary={
                                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 2, mt: 0.5 }}>
                                                                        <span>Line {details.line_start}</span>
                                                                        <span>•</span>
                                                                        <span>{details.line_count} lines</span>
                                                                    </Typography>
                                                                }
                                                            />
                                                        </ListItem>
                                                    </React.Fragment>
                                                ))}
                                            </List>
                                        ) : (
                                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    No functions detected in this file
                                                </Typography>
                                            </Box>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, px: 3 }}>
                            <Button 
                                onClick={handleCloseModal} 
                                sx={{ 
                                    color: 'white', 
                                    textTransform: 'none', 
                                    fontWeight: 500,
                                    px: 3,
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                                }}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
});

GraphDisplay.displayName = 'GraphDisplay';

export default GraphDisplay;
