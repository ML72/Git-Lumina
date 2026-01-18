import React, { useMemo, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import { GraphCanvas, GraphNode, GraphEdge, darkTheme, lightTheme, GraphCanvasRef } from 'reagraph';
import { selectGraph } from '../store/slices/graph';
import { GestureControlState } from '../hooks/useGestureControls';
import { CodebaseGraph } from '../types/CodebaseGraph';

export interface GraphDisplayRef {
    applyGestureControl: (control: GestureControlState) => void;
    resetView: () => void;
    setCameraMode: (mode: 'rotate' | 'orbit' | 'pan') => void;
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
    
    // Camera mode state - can be changed dynamically
    const [cameraMode, setCameraMode] = useState<'rotate' | 'orbit' | 'pan'>('rotate');
    
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
        resetView,
        setCameraMode
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
                cameraMode={cameraMode}
                layoutOverrides={{
                    nodeStrength: -1000,
                    linkDistance: 150
                }}
            />
        </Box>
    );
});

GraphDisplay.displayName = 'GraphDisplay';

export default GraphDisplay;
