import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import { GraphCanvas, GraphNode, GraphEdge, darkTheme, lightTheme, GraphCanvasRef } from 'reagraph';
import { selectGraph } from '../store/slices/graph';

const GraphDisplay: React.FC = () => {
    const theme = useTheme();
    const graphData = useSelector(selectGraph);
    const graphRef = useRef<GraphCanvasRef | null>(null);

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

    useEffect(() => {
        if (graphRef.current && nodes.length > 0) {
            // Slight delay to allow layout to stabilize before fitting
            setTimeout(() => {
                graphRef.current?.fitNodesInView();
            }, 1000);
        }
    }, [nodes]);

    if (!graphData) {
        return (
            <Box 
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
                animated
                cameraMode="orbit"
                layoutOverrides={{
                    nodeStrength: -1000,
                    linkDistance: 150
                }}
            />
        </Box>
    );
};

export default GraphDisplay;
