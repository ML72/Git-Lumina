import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
// @ts-ignore
import schema from '../schema.json';

const GraphDisplay: React.FC = () => {
  const fgRef = useRef<any>();
  const [isClient, setIsClient] = useState(false);
  
  // State for the visible graph
  const [graphData, setGraphData] = useState<{nodes: any[], links: any[]}>({ nodes: [], links: [] });
  // Track expanded nodes to prevent duplicate expansion logic
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
    
    // Initialize with just the Root Node
    // @ts-ignore
    const rootIndex = schema.nodes.findIndex((n: any) => n.category === 0); // Repository
    if (rootIndex > -1) {
        // @ts-ignore
        const rootNode = schema.nodes[rootIndex];
        setGraphData({
            nodes: [{
                id: String(rootIndex),
                name: "Git-Lumina", // Hardcoded for impact or use rootNode.filepath
                group: 0,
                val: 50,
                color: '#58a6ff',
                description: rootNode.description,
                x: 0, y: 0, z: 0 // Center start
            }],
            links: []
        });
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (!node) return;
    const nodeIdString = String(node.id);

    // Zoom to node (Focus)
    const distance = node.val * 4 + 50; 
    if (fgRef.current) {
        const hyp = Math.hypot(node.x, node.y, node.z);
        // Avoid division by zero if node is at (0,0,0)
        if (hyp < 0.1) {
           fgRef.current.cameraPosition(
               { x: node.x, y: node.y, z: node.z + distance + 100 }, 
               { x: node.x, y: node.y, z: node.z },
               1000
           );
        } else {
           const distRatio = 1 + distance / hyp;
           fgRef.current.cameraPosition(
               { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
               { x: node.x, y: node.y, z: node.z },
               1000
           );
        }
    }
    
    // Check if we should expand
    if (expandedNodes.has(nodeIdString)) return; // Already expanded

    // Find children in schema
    // @ts-ignore
    const edges = schema.edges;
    // @ts-ignore
    const allNodes = schema.nodes;

    const childEdges = edges.filter((e: any) => String(e[0]) === nodeIdString);
    if (childEdges.length === 0) return; // Leaf node

    const newNodes: any[] = [];
    const newLinks: any[] = [];

    // Calculate spawn position (random sphere around parent)
    childEdges.forEach((edge: any) => {
        const targetIndex = edge[1];
        const targetIdString = String(targetIndex);
        
        // Prevent duplicate nodes if graph loops (though tree shouldn't)
        // We check if it's already in the CURRENT graphData
        // (State update runs after this, so we check the set passed in prev usually, but here checking existing helps)
        
        const rawNode = allNodes[targetIndex];
        const isDir = rawNode.category === 1;

        newNodes.push({
            id: targetIdString,
            name: rawNode.filepath.split('/').pop(),
            group: rawNode.category,
            val: isDir ? 30 : 5, // Size
            color: isDir ? '#bc8cff' : '#238636',
            description: rawNode.description,
            // Initial position: Start AT parent to explode out
            x: node.x + (Math.random() - 0.5) * 10,
            y: node.y + (Math.random() - 0.5) * 10,
            z: node.z + (Math.random() - 0.5) * 10
        });

        newLinks.push({
            source: nodeIdString,
            target: targetIdString
        });
    });

    if (newNodes.length > 0) {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.add(nodeIdString);
            return next;
        });
        
        setGraphData(prev => ({
            nodes: [...prev.nodes, ...newNodes],
            links: [...prev.links, ...newLinks]
        }));
    }

  }, [expandedNodes]);


  // Text Sprite
  const createTextSprite = (text: string, size: number, color: string = '#ffffff') => {
      const fontface = 'Inter, -apple-system, system-ui';
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return new THREE.Sprite();

      const fontSize = 48; 
      context.font = `Bold ${fontSize}px ${fontface}`;
      const metrics = context.measureText(text);
      
      canvas.width = metrics.width + 20;
      canvas.height = fontSize + 20;

      context.shadowColor = "rgba(0,0,0,0.8)";
      context.shadowBlur = 4;
      context.fillStyle = color;
      context.font = `Bold ${fontSize}px ${fontface}`;
      context.fillText(text, 10, fontSize);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      const aspect = canvas.width / canvas.height;
      sprite.scale.set(size * aspect, size, 1);
      
      return sprite;
  };

  if (!isClient) return null;

  return (
    <Box sx={{ width: '100%', height: '600px', position: 'relative' }}>
        <Paper 
            elevation={3}
            sx={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden', 
                bgcolor: '#010409', 
                borderRadius: 2,
                border: '1px solid #30363d'
            }}
        >
             <Typography variant="caption" sx={{ position: 'absolute', opacity: 0.7, p:2, color:'white', zIndex:10 }}>
                Click nodes to expand the codebase tree.
            </Typography>

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                
                // --- PHYSICS ---
                // No DAG mode - Free floating explosion
                d3VelocityDecay={0.1} // Low friction for movement
                d3AlphaDecay={0.01} // Very slow cooling to keep it alive
                
                // Repulsion (Charge) - Stronger
                d3Force={'charge', (d3: any) => {
                     // @ts-ignore
                     d3.charge(-200);
                }} 

                // --- PARTICLES ---
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={1}
                
                enableNodeDrag={true}

                // --- RENDERING ---
                nodeLabel="description"
                nodeColor="color"
                nodeThreeObject={(node: any) => {
                   const group = new THREE.Group();
                   const isContainer = node.group <= 1; // Repo or Dir

                   let mesh;
                   if (isContainer) {
                       // Transparent Sphere "Environment"
                       const geo = new THREE.SphereGeometry(node.val, 32, 32);
                       const mat = new THREE.MeshPhongMaterial({ 
                           color: node.color,
                           transparent: true, 
                           opacity: 0.15, 
                           depthWrite: false, 
                           side: THREE.FrontSide,
                           shininess: 100 // Glossy
                       });
                       const matInner = new THREE.MeshPhongMaterial({ 
                           color: node.color,
                           transparent: true, 
                           opacity: 0.3, 
                           depthWrite: false, 
                           side: THREE.BackSide,
                           shininess: 100
                       });
                       mesh = new THREE.Mesh(geo, mat);
                       group.add(mesh);
                       group.add(new THREE.Mesh(geo, matInner));
                   } else {
                       // File
                       const geo = new THREE.SphereGeometry(node.val, 16, 16);
                       const mat = new THREE.MeshPhysicalMaterial({ 
                           color: node.color,
                           clearcoat: 1.0,
                           clearcoatRoughness: 0.1,
                           metalness: 0.1
                        });
                       mesh = new THREE.Mesh(geo, mat);
                       group.add(mesh);
                   }

                   // Label
                   const labelSize = isContainer ? node.val * 0.4 : 6;
                   const labelSprite = createTextSprite(node.name, labelSize, isContainer ? '#ffffff' : '#e6edf3');
                   
                   if (isContainer) {
                       labelSprite.center.set(0.5, 0.5); 
                   } else {
                       labelSprite.position.y = -node.val - 4;
                   }
                   group.add(labelSprite);

                   return group;
                }}

                linkColor={() => '#484f58'}
                linkWidth={0.5}
                linkOpacity={0.6}
                
                backgroundColor="#0d1117"
                showNavInfo={false}
                onNodeClick={handleNodeClick}
            />
        </Paper>
    </Box>
  );
};
export default GraphDisplay;
