import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { Hands, Results as HandResults, NormalizedLandmarkList, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Pose, Results as PoseResults } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { setNewAlert } from '../service/alert';

// Hand landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

// Pose landmark indices for wingspan calculation
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

export interface HandData {
    position: { x: number; y: number };
    isOpen: boolean;
    handedness: 'Left' | 'Right';
    landmarks: NormalizedLandmarkList;
}

export interface GestureState {
    leftHand: HandData | null;
    rightHand: HandData | null;
    wingspan: number; // Normalized wingspan (0-1 range based on camera frame)
    sensitivityScale: number; // Inverse of wingspan for sensitivity adjustment
}

interface WebcamProps {
    onGestureUpdate: (state: GestureState) => void;
    showVideo?: boolean;
    showOverlay?: boolean;
    enabled?: boolean;
    onError?: () => void;
}

// Calculate if hand is open or closed based on finger positions
const isHandOpen = (landmarks: NormalizedLandmarkList): boolean => {
    // Get wrist position as reference
    const wrist = landmarks[WRIST];
    
    // Get fingertip and MCP (knuckle) positions
    const fingerTips = [
        landmarks[INDEX_TIP],
        landmarks[MIDDLE_TIP],
        landmarks[RING_TIP],
        landmarks[PINKY_TIP]
    ];
    
    const fingerMCPs = [
        landmarks[INDEX_MCP],
        landmarks[MIDDLE_MCP],
        landmarks[RING_MCP],
        landmarks[PINKY_MCP]
    ];
    
    // Check if thumb is extended
    const thumbTip = landmarks[THUMB_TIP];
    const thumbMcp = landmarks[2]; // Thumb MCP
    const thumbExtended = Math.hypot(
        thumbTip.x - wrist.x,
        thumbTip.y - wrist.y
    ) > Math.hypot(
        thumbMcp.x - wrist.x,
        thumbMcp.y - wrist.y
    ) * 1.2;
    
    // Count extended fingers (fingertip is farther from wrist than MCP)
    let extendedFingers = 0;
    for (let i = 0; i < 4; i++) {
        const tipDist = Math.hypot(
            fingerTips[i].x - wrist.x,
            fingerTips[i].y - wrist.y
        );
        const mcpDist = Math.hypot(
            fingerMCPs[i].x - wrist.x,
            fingerMCPs[i].y - wrist.y
        );
        
        if (tipDist > mcpDist * 1.1) {
            extendedFingers++;
        }
    }
    
    // Hand is considered open if thumb + at least 3 other fingers are extended
    return thumbExtended && extendedFingers >= 3;
};

// Calculate the center position of the hand (palm center)
const getHandCenter = (landmarks: NormalizedLandmarkList): { x: number; y: number } => {
    // Use average of wrist and MCP joints for palm center
    const points = [
        landmarks[WRIST],
        landmarks[INDEX_MCP],
        landmarks[MIDDLE_MCP],
        landmarks[RING_MCP],
        landmarks[PINKY_MCP]
    ];
    
    const center = points.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    
    return {
        x: center.x / points.length,
        y: center.y / points.length
    };
};

// Calculate wingspan from pose landmarks
const calculateWingspan = (poseLandmarks: any): number => {
    if (!poseLandmarks) return 0.5; // Default value
    
    const leftShoulder = poseLandmarks[LEFT_SHOULDER];
    const rightShoulder = poseLandmarks[RIGHT_SHOULDER];
    const leftElbow = poseLandmarks[LEFT_ELBOW];
    const rightElbow = poseLandmarks[RIGHT_ELBOW];
    const leftWrist = poseLandmarks[LEFT_WRIST];
    const rightWrist = poseLandmarks[RIGHT_WRIST];
    
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) {
        return 0.5;
    }
    
    // Calculate arm lengths
    const leftUpperArm = Math.hypot(
        leftElbow.x - leftShoulder.x,
        leftElbow.y - leftShoulder.y
    );
    const leftForearm = Math.hypot(
        leftWrist.x - leftElbow.x,
        leftWrist.y - leftElbow.y
    );
    const rightUpperArm = Math.hypot(
        rightElbow.x - rightShoulder.x,
        rightElbow.y - rightShoulder.y
    );
    const rightForearm = Math.hypot(
        rightWrist.x - rightElbow.x,
        rightWrist.y - rightElbow.y
    );
    
    // Shoulder width
    const shoulderWidth = Math.hypot(
        rightShoulder.x - leftShoulder.x,
        rightShoulder.y - leftShoulder.y
    );
    
    // Total wingspan = left arm + shoulder width + right arm
    const wingspan = leftUpperArm + leftForearm + shoulderWidth + rightUpperArm + rightForearm;
    
    return wingspan;
};

// Debug state interface
interface DebugState {
    status: string;
    handsDetected: number;
    leftHand: { x: number; y: number; open: boolean } | null;
    rightHand: { x: number; y: number; open: boolean } | null;
    frameCount: number;
    lastError: string | null;
    mediapipeLoaded: boolean;
    cameraStarted: boolean;
}

const Webcam: React.FC<WebcamProps> = ({
    onGestureUpdate,
    showVideo = true,
    showOverlay = true,
    enabled = true,
    onError
}) => {
    const dispatch = useDispatch();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handsRef = useRef<Hands | null>(null);
    const poseRef = useRef<Pose | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    
    const [isInitialized, setIsInitialized] = useState(false);
    const [debugState, setDebugState] = useState<DebugState>({
        status: 'Initializing...',
        handsDetected: 0,
        leftHand: null,
        rightHand: null,
        frameCount: 0,
        lastError: null,
        mediapipeLoaded: false,
        cameraStarted: false
    });
    
    const frameCountRef = useRef(0);
    const gestureStateRef = useRef<GestureState>({
        leftHand: null,
        rightHand: null,
        wingspan: 0.5,
        sensitivityScale: 2
    });

    // Process hand detection results
    const onHandResults = useCallback((results: HandResults) => {
        frameCountRef.current++;
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        
        if (!canvas || !ctx) {
            console.error('[Webcam] Canvas or context not available');
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        if (results.image) {
            ctx.save();
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        
        let leftHand: HandData | null = null;
        let rightHand: HandData | null = null;
        
        const handsDetected = results.multiHandLandmarks?.length || 0;
        
        // Debug: Log every 30 frames
        if (frameCountRef.current % 30 === 0) {
            console.log(`[Webcam] Frame ${frameCountRef.current}: Detected ${handsDetected} hands`);
        }
        
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // MediaPipe reports handedness from camera's perspective (mirrored)
                // So "Left" from MediaPipe is actually the user's right hand
                const actualHandedness = handedness.label === 'Left' ? 'Right' : 'Left';
                
                const handData: HandData = {
                    position: getHandCenter(landmarks),
                    isOpen: isHandOpen(landmarks),
                    handedness: actualHandedness as 'Left' | 'Right',
                    landmarks: landmarks
                };
                
                console.log(`[Webcam] Hand ${i}: ${actualHandedness}, Open: ${handData.isOpen}, Pos: (${handData.position.x.toFixed(2)}, ${handData.position.y.toFixed(2)})`);
                
                if (actualHandedness === 'Left') {
                    leftHand = handData;
                } else {
                    rightHand = handData;
                }
                
                // Draw landmarks on canvas
                if (ctx) {
                    // Draw hand connections with thick lines
                    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                        color: handData.isOpen ? '#00FF00' : '#FF0000',
                        lineWidth: 4
                    });
                    
                    // Draw landmarks with large circles
                    drawLandmarks(ctx, landmarks, {
                        color: actualHandedness === 'Left' ? '#FF6B6B' : '#4ECDC4',
                        lineWidth: 2,
                        radius: 6
                    });
                    
                    // Draw large cursor position
                    const cursorX = handData.position.x * canvas.width;
                    const cursorY = handData.position.y * canvas.height;
                    
                    // Outer ring
                    ctx.beginPath();
                    ctx.arc(cursorX, cursorY, 25, 0, 2 * Math.PI);
                    ctx.fillStyle = handData.isOpen ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)';
                    ctx.fill();
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    
                    // Inner dot
                    ctx.beginPath();
                    ctx.arc(cursorX, cursorY, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = handData.isOpen ? '#00FF00' : '#FF0000';
                    ctx.fill();
                    
                    // Label with background
                    const label = `${actualHandedness} - ${handData.isOpen ? 'OPEN' : 'CLOSED'}`;
                    ctx.font = 'bold 18px Arial';
                    const textWidth = ctx.measureText(label).width;
                    
                    // Background box
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(cursorX - textWidth/2 - 5, cursorY - 50, textWidth + 10, 25);
                    
                    // Text
                    ctx.fillStyle = handData.isOpen ? '#00FF00' : '#FF0000';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, cursorX, cursorY - 32);
                    ctx.textAlign = 'left';
                }
            }
        }
        
        // Draw debug info panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 250, 140);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#00FF00';
        ctx.fillText('DEBUG INFO', 10, 20);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Frame: ${frameCountRef.current}`, 10, 40);
        ctx.fillText(`Hands Detected: ${handsDetected}`, 10, 55);
        ctx.fillText(`Left: ${leftHand ? `(${leftHand.position.x.toFixed(2)}, ${leftHand.position.y.toFixed(2)}) ${leftHand.isOpen ? 'OPEN' : 'CLOSED'}` : 'Not detected'}`, 10, 70);
        ctx.fillText(`Right: ${rightHand ? `(${rightHand.position.x.toFixed(2)}, ${rightHand.position.y.toFixed(2)}) ${rightHand.isOpen ? 'OPEN' : 'CLOSED'}` : 'Not detected'}`, 10, 85);
        ctx.fillText(`Wingspan: ${gestureStateRef.current.wingspan.toFixed(3)}`, 10, 100);
        ctx.fillText(`Sensitivity: ${gestureStateRef.current.sensitivityScale.toFixed(2)}x`, 10, 115);
        ctx.fillStyle = handsDetected > 0 ? '#00FF00' : '#FF6B6B';
        ctx.fillText(`Status: ${handsDetected > 0 ? 'TRACKING' : 'SEARCHING...'}`, 10, 130);
        
        // Update debug state
        setDebugState(prev => ({
            ...prev,
            handsDetected,
            leftHand: leftHand ? { x: leftHand.position.x, y: leftHand.position.y, open: leftHand.isOpen } : null,
            rightHand: rightHand ? { x: rightHand.position.x, y: rightHand.position.y, open: rightHand.isOpen } : null,
            frameCount: frameCountRef.current,
            status: handsDetected > 0 ? 'Tracking hands' : 'Searching for hands...'
        }));
        
        // Update gesture state
        gestureStateRef.current = {
            leftHand,
            rightHand,
            wingspan: gestureStateRef.current.wingspan,
            sensitivityScale: gestureStateRef.current.sensitivityScale
        };
        
        onGestureUpdate(gestureStateRef.current);
    }, [onGestureUpdate]);
    
    // Process pose detection results
    const onPoseResults = useCallback((results: PoseResults) => {
        if (results.poseLandmarks) {
            const newWingspan = calculateWingspan(results.poseLandmarks);
            
            if (newWingspan > 0.1) { // Only update if we have a valid measurement
                // Calculate sensitivity scale (inverse of wingspan)
                // Normalize so that a "typical" wingspan of ~0.6 gives a scale of 1
                const sensitivityScale = 0.6 / Math.max(newWingspan, 0.1);
                
                gestureStateRef.current = {
                    ...gestureStateRef.current,
                    wingspan: newWingspan,
                    sensitivityScale
                };
            }
            
            // Draw pose on canvas if overlay is enabled
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    // Draw pose connections for arms only
                    const armConnections = [
                        [LEFT_SHOULDER, LEFT_ELBOW],
                        [LEFT_ELBOW, LEFT_WRIST],
                        [RIGHT_SHOULDER, RIGHT_ELBOW],
                        [RIGHT_ELBOW, RIGHT_WRIST],
                        [LEFT_SHOULDER, RIGHT_SHOULDER]
                    ];
                    
                    ctx.strokeStyle = '#FFFF00';
                    ctx.lineWidth = 3;
                    
                    armConnections.forEach(([start, end]) => {
                        const startLandmark = results.poseLandmarks[start];
                        const endLandmark = results.poseLandmarks[end];
                        
                        if (startLandmark && endLandmark) {
                            ctx.beginPath();
                            ctx.moveTo(
                                startLandmark.x * canvasRef.current!.width,
                                startLandmark.y * canvasRef.current!.height
                            );
                            ctx.lineTo(
                                endLandmark.x * canvasRef.current!.width,
                                endLandmark.y * canvasRef.current!.height
                            );
                            ctx.stroke();
                            
                            // Draw joint circles
                            ctx.beginPath();
                            ctx.arc(
                                startLandmark.x * canvasRef.current!.width,
                                startLandmark.y * canvasRef.current!.height,
                                5, 0, 2 * Math.PI
                            );
                            ctx.fillStyle = '#FFFF00';
                            ctx.fill();
                        }
                    });
                }
            }
        }
    }, []);

    // Initialize MediaPipe
    useEffect(() => {
        if (!enabled) {
            setDebugState(prev => ({ ...prev, status: 'Camera disabled', cameraStarted: false }));
            setIsInitialized(false);
            return;
        }

        const initMediaPipe = async () => {
            console.log('[Webcam] Starting MediaPipe initialization...');
            
            if (!videoRef.current || !canvasRef.current) {
                console.error('[Webcam] Video or canvas ref not available');
                setDebugState(prev => ({ ...prev, lastError: 'Video/canvas ref not available' }));
                return;
            }
            
            try {
                // Initialize Hands
                console.log('[Webcam] Loading MediaPipe Hands...');
                setDebugState(prev => ({ ...prev, status: 'Loading MediaPipe Hands...' }));
                
                const hands = new Hands({
                    locateFile: (file) => {
                        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                        console.log(`[Webcam] Loading: ${url}`);
                        return url;
                    }
                });
                
                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.5, // Lowered for better detection
                    minTrackingConfidence: 0.5
                });
                
                hands.onResults(onHandResults);
                handsRef.current = hands;
                console.log('[Webcam] MediaPipe Hands initialized');
                
                // Initialize Pose
                console.log('[Webcam] Loading MediaPipe Pose...');
                setDebugState(prev => ({ ...prev, status: 'Loading MediaPipe Pose...' }));
                
                const pose = new Pose({
                    locateFile: (file) => {
                        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                        console.log(`[Webcam] Loading: ${url}`);
                        return url;
                    }
                });
                
                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                
                pose.onResults(onPoseResults);
                poseRef.current = pose;
                console.log('[Webcam] MediaPipe Pose initialized');
                
                setDebugState(prev => ({ ...prev, mediapipeLoaded: true, status: 'Starting camera...' }));
                
                // Set up camera
                console.log('[Webcam] Starting camera...');
                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        if (videoRef.current && handsRef.current && poseRef.current) {
                            try {
                                await handsRef.current.send({ image: videoRef.current });
                                await poseRef.current.send({ image: videoRef.current });
                            } catch (err) {
                                console.error('[Webcam] Error processing frame:', err);
                            }
                        }
                    },
                    width: 640,
                    height: 480
                });
                
                cameraRef.current = camera;
                await camera.start();
                console.log('[Webcam] Camera started successfully');
                
                setDebugState(prev => ({ 
                    ...prev, 
                    cameraStarted: true, 
                    status: 'Camera ready - searching for hands...' 
                }));
                setIsInitialized(true);
                
            } catch (error) {
                console.error('[Webcam] Initialization error:', error);
                
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // Handle permission denied specifically
                if (errorMessage.includes('Permission denied') || 
                    errorMessage.includes('NotAllowedError') || 
                    errorMessage.includes('Permission dismissed')) {
                    
                    setNewAlert(dispatch, { 
                        msg: "Camera permissions were denied. Motion controls are turned off.", 
                        alertType: "error" 
                    });
                    
                    if (onError) onError();
                }

                setDebugState(prev => ({ 
                    ...prev, 
                    lastError: errorMessage,
                    status: 'Error initializing'
                }));
            }
        };
        
        initMediaPipe();
        
        return () => {
            console.log('[Webcam] Cleaning up...');
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
            if (poseRef.current) {
                poseRef.current.close();
            }
        };
    }, [onHandResults, onPoseResults, enabled, dispatch, onError]);

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                bgcolor: '#000'
            }}
        >
            <video
                ref={videoRef}
                style={{
                    display: 'none', // Hide video, show canvas instead
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror the video
                }}
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                width={640}
                height={480}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror the canvas
                }}
            />
            {!isInitialized && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        textAlign: 'center',
                        p: 2
                    }}
                >
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        {debugState.status}
                    </Typography>
                    {debugState.lastError && (
                        <Typography variant="caption" color="error">
                            Error: {debugState.lastError}
                        </Typography>
                    )}
                    <Box sx={{ mt: 2, fontSize: '12px', color: '#888' }}>
                        <div>MediaPipe: {debugState.mediapipeLoaded ? '✅' : '⏳'}</div>
                        <div>Camera: {debugState.cameraStarted ? '✅' : '⏳'}</div>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default Webcam;
