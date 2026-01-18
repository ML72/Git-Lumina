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
    selectNode: (filepath: string) => void;
    focusNodes: (nodeIds: string[]) => void;
    setCameraMode: (mode: 'rotate' | 'orbit' | 'pan') => void;
    clickAtScreenPosition: (x: number, y: number) => void;
    clickAtNormalizedPosition: (normX: number, normY: number) => void;
    selectNodeAtPosition: (normX: number, normY: number) => boolean;
    getHoveredNode: (normX: number, normY: number) => string | null;
    closeModal: () => void;
}

interface GraphDisplayProps {
    isGestureActive?: boolean; // Pause animation when user is controlling with gestures
    graph?: CodebaseGraph | null; // Optional direct graph prop
    autoRotate?: boolean; // Initial auto-rotate state
}

const GraphDisplay = forwardRef<GraphDisplayRef, GraphDisplayProps>(({ isGestureActive = false, graph, autoRotate = true }, ref) => {
    const theme = useTheme();
    const reduxGraph = useSelector(selectGraph);
    const graphData = graph || reduxGraph; // Use prop if provided, otherwise use Redux
    const graphRef = useRef<GraphCanvasRef | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Camera mode state - can be changed dynamically
    const [cameraMode, setCameraMode] = useState<'rotate' | 'orbit' | 'pan'>(autoRotate ? 'orbit' : 'rotate');
    
    // State for modal
    const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State for highlighting nodes
    const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
    
    // Track accumulated camera state for gesture controls
    const cameraStateRef = useRef({
        panX: 0,
        panY: 0,
        zoom: 1
    });

    // Color palette for category mapping
    const categoryColors = useMemo(() => [
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
    ], []);

    const { baseNodes, baseEdges } = useMemo(() => {
        if (!graphData) return { baseNodes: [] as GraphNode[], baseEdges: [] as GraphEdge[] };

        // Calculate degrees (incoming + outgoing)
        const degrees = new Array(graphData.nodes.length).fill(0);
        graphData.edges.forEach((edge: any) => {
            const source = edge[0];
            const target = edge[1];
            if (degrees[source] !== undefined) degrees[source]++;
            if (degrees[target] !== undefined) degrees[target]++;
        });

        const myNodes: GraphNode[] = graphData.nodes.map((node: any, index: number) => {
            const nodeId = index.toString();
            
            const x = node.num_lines || 0;
            const y = degrees[index] || 0;
            
            // Formula: Size proportional to 1 + ln(x+1) + ln(y+1)
            // Using a multiplier to scale it to appropriate pixel size
            // Doubled the multiplier (3 -> 6) for larger hitboxes
            const rawSize = 1 + Math.log(x + 1) + Math.log(y + 1);
            const size = rawSize * 6; 

            return {
                id: nodeId, // Using index as ID to match edge source/target
                label: node.filepath,
                fill: categoryColors[node.category % categoryColors.length] || '#CCCCCC',
                data: node, // Storing code data for potential click interaction
                size: size
            };
        });

        const myEdges: GraphEdge[] = graphData.edges.map((edge: any, index: number) => ({
            id: `edge-${index}`,
            source: edge[0].toString(),
            target: edge[1].toString(),
            size: edge[2] || 1, // Use weight for edge width (size)
        }));

        return { baseNodes: myNodes, baseEdges: myEdges };
    }, [graphData, categoryColors]);

    const { nodes, edges } = useMemo(() => {
        const activeSet = new Set(activeNodeIds);
        const hasActive = activeSet.size > 0;

        const myNodes: GraphNode[] = baseNodes.map((node: any) => ({
            ...node,
            opacity: !hasActive || activeSet.has(node.id) ? 1 : 0.4
        }));

        const myEdges: GraphEdge[] = baseEdges.map((edge: any) => ({
            ...edge,
            opacity: hasActive ? 0.1 : 0.5
        }));

        return { nodes: myNodes, edges: myEdges };
    }, [baseNodes, baseEdges, activeNodeIds]);

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
        setActiveNodeIds([]);
        setSelectedNodeData(null);
        setIsModalOpen(false);
    }, []);

    const focusNodes = useCallback((nodeIdsOrFilepaths: string[]) => {
        if (graphRef.current && nodeIdsOrFilepaths.length > 0) {
            // Check if input looks like filepaths and map to internal IDs if needed
            // The nodes use index as ID, but label is filepath
            // Helper to clean paths for comparison (remove 'root/' prefix, ignore leading slashes)
            const cleanPath = (p: string) => p.replace(/^root[\/\\]/, '').replace(/^[\\\/]+/, '').toLowerCase();
            
            const targetIds = baseNodes
                .filter((n: GraphNode) => {
                    // Direct ID match
                    if (nodeIdsOrFilepaths.includes(n.id)) return true;
                    // Label/Filepath match
                    if (n.label) {
                        const nodePath = cleanPath(n.label);
                        return nodeIdsOrFilepaths.some(searchPath => {
                            const search = cleanPath(searchPath);
                            // Match if one ends with the other (handles relative paths)
                            return nodePath.endsWith(search) || search.endsWith(nodePath);
                        });
                    }
                    return false;
                })
                .map((n: GraphNode) => n.id);
                
            if (targetIds.length > 0) {
                console.log(`[GraphDisplay] Focusing on nodes: ${targetIds.join(', ')}`);
                setActiveNodeIds(targetIds); // Highlight the focused nodes
                // Default fit strategy
                graphRef.current.fitNodesInView(targetIds); 
            } else {
                setActiveNodeIds([]); // Clear highlighting if no match
                console.warn('[GraphDisplay] focusNodes: No matching nodes found for', nodeIdsOrFilepaths);
            }
        } else {
            // Empty input = clear selection
            setActiveNodeIds([]);
        }
    }, [baseNodes]);

    // Handle clicking empty space to reset
    const handleCanvasClick = useCallback(() => {
        // Clear active selection
        setActiveNodeIds([]);
    }, []);
    
    // Select node via ref
    const selectNode = useCallback((filepath: string) => {
        const node = baseNodes.find((n: GraphNode) => n.label === filepath);
        if (node) {
            setSelectedNodeData(node.data);
            setIsModalOpen(true);
        }
    }, [baseNodes]);
    
    // Click at a specific screen position (for gesture-based clicking)
    // Simply dispatches mouse events on the canvas to trigger reagraph's click handling
    const clickAtScreenPosition = useCallback((screenX: number, screenY: number) => {
        if (!containerRef.current) {
            console.warn('[GraphDisplay] Container not available');
            return;
        }
        
        const canvas = containerRef.current.querySelector('canvas');
        if (!canvas) {
            console.warn('[GraphDisplay] Canvas not found');
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        
        // Check if click is within canvas bounds
        if (screenX < rect.left || screenX > rect.right || screenY < rect.top || screenY > rect.bottom) {
            return;
        }
        
        // Dispatch mouse events on the canvas to trigger reagraph's internal click handling
        const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: screenX,
            clientY: screenY,
            button: 0,
            buttons: 1
        });
        
        const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: screenX,
            clientY: screenY,
            button: 0,
            buttons: 0
        });
        
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: screenX,
            clientY: screenY,
            button: 0
        });
        
        // Dispatch events on canvas with small delay between them
        canvas.dispatchEvent(mousedownEvent);
        setTimeout(() => {
            canvas.dispatchEvent(mouseupEvent);
            canvas.dispatchEvent(clickEvent);
        }, 50);
    }, []);
    
    // Click using normalized position (0-1 range, already mirrored for cursor display)
    // This method tries to find the nearest node using reagraph's internal graph data
    const clickAtNormalizedPosition = useCallback((normX: number, normY: number) => {
        if (!graphRef.current || !containerRef.current) {
            console.warn('[GraphDisplay] graphRef or container not available');
            return;
        }
        
        console.log(`[GraphDisplay] Click at normalized position (${normX.toFixed(3)}, ${normY.toFixed(3)})`);
        
        const graphRefAny = graphRef.current as any;
        
        // Try to get the internal graph with node positions
        const internalGraph = graphRefAny.getGraph?.();
        
        if (!internalGraph) {
            console.warn('[GraphDisplay] Internal graph not available');
            // Fallback to screen position click
            const rect = containerRef.current.getBoundingClientRect();
            clickAtScreenPosition(rect.left + normX * rect.width, rect.top + normY * rect.height);
            return;
        }
        
        // Get camera for projection
        const camera = graphRefAny.camera;
        const canvas = containerRef.current.querySelector('canvas');
        
        if (!camera || !canvas) {
            console.warn('[GraphDisplay] Camera or canvas not available');
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const clickScreenX = rect.left + normX * rect.width;
        const clickScreenY = rect.top + normY * rect.height;
        
        console.log(`[GraphDisplay] Looking for node near screen (${clickScreenX.toFixed(0)}, ${clickScreenY.toFixed(0)})`);
        
        // Try to find the nearest node by projecting 3D positions to screen
        let nearestNode: GraphNode | null = null;
        let nearestDist = Infinity;
        const threshold = 80; // pixels
        
        // Method: iterate through internal graph nodes and project to screen
        const graphNodes = internalGraph.nodes || [];
        
        for (const gNode of graphNodes) {
            // Check if node has position data
            if (gNode.x === undefined || gNode.y === undefined) continue;
            
            // Project 3D position to normalized device coordinates
            const pos = { x: gNode.x, y: gNode.y, z: gNode.z || 0 };
            
            // Manual projection: transform by camera matrices
            // This is a simplified version - may not be 100% accurate
            const vector = {
                x: pos.x,
                y: pos.y,
                z: pos.z
            };
            
            // Apply camera view-projection (simplified)
            if (camera.matrixWorldInverse && camera.projectionMatrix) {
                // Use Three.js-like projection if available
                const projected = projectPoint(vector, camera);
                if (projected) {
                    const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
                    const screenY = ((-projected.y + 1) / 2) * rect.height + rect.top;
                    
                    const dist = Math.hypot(screenX - clickScreenX, screenY - clickScreenY);
                    
                    if (dist < nearestDist && dist < threshold) {
                        const node = baseNodes.find((n: GraphNode) => n.id === gNode.id || n.id === String(gNode.id));
                        if (node) {
                            nearestDist = dist;
                            nearestNode = node;
                            console.log(`[GraphDisplay] Candidate node at ${dist.toFixed(0)}px: ${node.label}`);
                        }
                    }
                }
            }
        }
        
        if (nearestNode) {
            setSelectedNodeData(nearestNode.data);
            setIsModalOpen(true);
        } else {
            // Try dispatching a click event as fallback
            clickAtScreenPosition(clickScreenX, clickScreenY);
        }
    }, [baseNodes, clickAtScreenPosition]);
    
    // Helper function to project a 3D point to screen coordinates
    const projectPoint = (point: { x: number; y: number; z: number }, camera: any): { x: number; y: number; z: number } | null => {
        try {
            // Check if camera has the necessary matrices
            if (!camera.matrixWorldInverse || !camera.projectionMatrix) {
                return null;
            }
            
            // Create a simple vector and apply transformations
            let x = point.x, y = point.y, z = point.z;
            
            // Apply view matrix (matrixWorldInverse)
            const vm = camera.matrixWorldInverse.elements;
            const vx = vm[0]*x + vm[4]*y + vm[8]*z + vm[12];
            const vy = vm[1]*x + vm[5]*y + vm[9]*z + vm[13];
            const vz = vm[2]*x + vm[6]*y + vm[10]*z + vm[14];
            const vw = vm[3]*x + vm[7]*y + vm[11]*z + vm[15];
            
            // Apply projection matrix
            const pm = camera.projectionMatrix.elements;
            const px = pm[0]*vx + pm[4]*vy + pm[8]*vz + pm[12]*vw;
            const py = pm[1]*vx + pm[5]*vy + pm[9]*vz + pm[13]*vw;
            const pz = pm[2]*vx + pm[6]*vy + pm[10]*vz + pm[14]*vw;
            const pw = pm[3]*vx + pm[7]*vy + pm[11]*vz + pm[15]*vw;
            
            // Perspective divide
            if (Math.abs(pw) < 0.0001) return null;
            
            return {
                x: px / pw,
                y: py / pw,
                z: pz / pw
            };
        } catch (e) {
            console.warn('[GraphDisplay] Error projecting point:', e);
            return null;
        }
    };
    
    // Find nearest node to a normalized position and return its ID
    const getHoveredNode = useCallback((normX: number, normY: number): string | null => {
        if (!graphRef.current || !containerRef.current) {
            return null;
        }
        
        const graphRefAny = graphRef.current as any;
        const controls = graphRefAny.getControls?.();
        const canvas = containerRef.current.querySelector('canvas');
        
        if (!controls || !canvas) {
            return null;
        }
        
        // Get camera from controls - it's stored as 'camera' not 'object'
        const camera = controls.camera || controls.object;
        if (!camera) {
            return null;
        }
        
        // Try multiple ways to get the scene
        let scene = controls._scene || controls.scene;
        
        // Try from controls.__r3f
        if (!scene && controls.__r3f) {
            const r3f = controls.__r3f;
            scene = r3f.parent?.parent;
            if (!scene?.isScene) {
                scene = r3f.root?.getState?.()?.scene;
            }
        }
        
        // Try from canvas __r3f
        if (!scene) {
            const canvasAny = canvas as any;
            const r3fState = canvasAny.__r3f;
            if (r3fState?.fiber?.current?.scene) {
                scene = r3fState.fiber.current.scene;
            } else if (r3fState?.store?.getState) {
                const state = r3fState.store.getState();
                scene = state?.scene;
            }
        }
        
        // Try to get scene from camera's parent chain
        if (!scene && camera.parent) {
            let parent = camera.parent;
            while (parent && !parent.isScene) {
                parent = parent.parent;
            }
            if (parent?.isScene) {
                scene = parent;
            }
        }
        
        if (!scene) {
            return null;
        }
        
        const rect = canvas.getBoundingClientRect();
        const targetScreenX = normX * rect.width;
        const targetScreenY = normY * rect.height;
        
        // Find all node meshes in the scene
        const nodeMeshes: Array<{ id: string; position: { x: number; y: number; z: number } }> = [];
        
        scene.traverse((obj: any) => {
            if (obj.userData?.id !== undefined || obj.userData?.nodeId !== undefined) {
                nodeMeshes.push({
                    id: String(obj.userData.id ?? obj.userData.nodeId),
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
                });
            } else if (obj.name && obj.name.startsWith('node-')) {
                nodeMeshes.push({
                    id: obj.name.replace('node-', ''),
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
                });
            }
        });
        
        let nearestNodeId: string | null = null;
        let nearestDist = Infinity;
        const threshold = 150; // pixels
        
        for (const mesh of nodeMeshes) {
            const projected = projectPoint(mesh.position, camera);
            if (!projected || projected.z > 1) continue;
            
            const screenX = ((projected.x + 1) / 2) * rect.width;
            const screenY = ((-projected.y + 1) / 2) * rect.height;
            
            const dist = Math.hypot(screenX - targetScreenX, screenY - targetScreenY);
            
            if (dist < nearestDist && dist < threshold) {
                nearestDist = dist;
                nearestNodeId = mesh.id;
            }
        }
        
        return nearestNodeId;
    }, []);
    
    // Directly select a node at the given normalized position
    const selectNodeAtPosition = useCallback((normX: number, normY: number): boolean => {
        const nodeId = getHoveredNode(normX, normY);
        
        if (nodeId) {
            const node = baseNodes.find((n: GraphNode) => n.id === nodeId || n.id === String(nodeId));
            if (node) {
                setSelectedNodeData(node.data);
                setIsModalOpen(true);
                return true;
            }
        }
        
        return false;
    }, [baseNodes, getHoveredNode]);

    // Expose methods to parent
    // Close modal function to expose
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({
        applyGestureControl,
        resetView,
        selectNode,
        focusNodes,
        setCameraMode,
        clickAtScreenPosition,
        clickAtNormalizedPosition,
        selectNodeAtPosition,
        getHoveredNode,
        closeModal
    }), [applyGestureControl, resetView, selectNode, focusNodes, cameraMode, clickAtScreenPosition, clickAtNormalizedPosition, selectNodeAtPosition, getHoveredNode, closeModal]);

    useEffect(() => {
        if (graphRef.current && nodes.length > 0) {
            // Initial fit
            graphRef.current.fitNodesInView();
        }
        // Removing [nodes] dependency to prevent refitting on updates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
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
                // actives={activeNodeIds} // Removed to avoid color override
                layoutType="forceDirected3d"
                labelType="all"
                theme={{
                    ...theme.palette.mode === 'dark' ? darkTheme : lightTheme,
                    canvas: {
                         ...theme.palette.mode === 'dark' ? darkTheme.canvas : lightTheme.canvas,
                         fog: '#1e2329', // Match background
                    }
                }}
                draggable
                animated={!isGestureActive} // Pause animation when user is controlling with gestures
                cameraMode={cameraMode}
                onNodeClick={handleNodeClick}
                onCanvasClick={handleCanvasClick}
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
