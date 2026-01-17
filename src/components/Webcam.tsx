import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Holistic, Results, POSE_LANDMARKS, POSE_CONNECTIONS, HAND_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { useDispatch, useSelector } from 'react-redux';
import { updateControlState, selectControlState } from '../store/slices/control';
import { Box, Typography } from '@mui/material';

const WebcamStream: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dispatch = useDispatch();
    const { isUserActive, wingspan } = useSelector(selectControlState);
    const [modelLoading, setModelLoading] = useState(true);

    // Track consistency to lock onto a user
    const consecutiveFramesWithHands = useRef(0);
    const FRAMES_TO_LOCK = 10;
    const isLocked = useRef(false);

    useEffect(() => {
        const holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        });

        holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            refineFaceLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        holistic.onResults(onResults);

        if (typeof webcamRef.current !== "undefined" && webcamRef.current !== null) {
            // @ts-ignore
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current && webcamRef.current.video) {
                        await holistic.send({ image: webcamRef.current.video });
                    }
                },
                width: 640,
                height: 480
            });
            camera.start();
            setModelLoading(false);
        }

        return () => {
            holistic.close();
        };
    }, []);

    const calculateDistance = (p1: { x: number, y: number, z?: number }, p2: { x: number, y: number, z?: number }) => {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + 
            Math.pow(p1.y - p2.y, 2) + 
            (p1.z && p2.z ? Math.pow(p1.z - p2.z, 2) : 0)
        );
    };

    const isHandClosed = (landmarks: any[]) => {
        if (!landmarks || landmarks.length < 21) return false;
        // Check finger tips (8, 12, 16, 20) against wrist (0)
        const wrist = landmarks[0];
        const tipIndices = [8, 12, 16, 20];
        let averageDist = 0;
        
        // Simple heuristic: if tips are closer to wrist than PIP joints
        const pipIndices = [6, 10, 14, 18];
        
        let closedFingers = 0;
        for(let i=0; i<4; i++) {
            const tipDist = calculateDistance(landmarks[tipIndices[i]], wrist);
            const pipDist = calculateDistance(landmarks[pipIndices[i]], wrist);
            if (tipDist < pipDist * 1.1) { // 1.1 buffer
                closedFingers++;
            }
        }
        
        return closedFingers >= 3; // Majority closed
    };

    const onResults = (results: Results) => {
        const { poseLandmarks, rightHandLandmarks, leftHandLandmarks } = results;

        // --- Drawing Logic ---
        const canvasCtx = canvasRef.current?.getContext('2d');
        if (canvasCtx && canvasRef.current && webcamRef.current?.video) {
             const width = webcamRef.current.video.videoWidth;
             const height = webcamRef.current.video.videoHeight;
             
             canvasRef.current.width = width;
             canvasRef.current.height = height;
             
             canvasCtx.save();
             canvasCtx.clearRect(0, 0, width, height);
             
             // Mirror drawing to match mirrored video
             canvasCtx.translate(width, 0); 
             canvasCtx.scale(-1, 1);
             
             // Draw Pose
             drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
             drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
             
             // Draw Hands
             drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#CC0000', lineWidth: 2 });
             drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#00FF00', lineWidth: 1, radius: 3 });
             drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#00CC00', lineWidth: 2 });
             drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
             
             canvasCtx.restore();
        }

        // Check for "two hands in frame"
        // Relying on hand landmarks existence or pose visibility
        // Prompt says "two hands in the camera frame"
        const hasLeftHand = !!leftHandLandmarks || (poseLandmarks && poseLandmarks[15] && poseLandmarks[15].visibility && poseLandmarks[15].visibility > 0.5);
        const hasRightHand = !!rightHandLandmarks || (poseLandmarks && poseLandmarks[16] && poseLandmarks[16].visibility && poseLandmarks[16].visibility > 0.5);

        if (hasLeftHand && hasRightHand) {
            consecutiveFramesWithHands.current++;
        } else {
            consecutiveFramesWithHands.current = 0;
            if (isLocked.current) {
                // If we lose hands for a bit, do we unlock immediately? 
                // "When the person's hands exit ... search for other users"
                // Let's degrade gracefully
                isLocked.current = false;
                dispatch(updateControlState({ isUserActive: false }));
            }
        }

        if (consecutiveFramesWithHands.current > FRAMES_TO_LOCK) {
            isLocked.current = true;
        }

        if (!isLocked.current || !poseLandmarks) return;

        // --- Detected User Logic ---

        // 1. Calculate Wingspan (Approximate)
        // Shoulder (11, 12) to Elbow (13, 14) to Wrist (15, 16)
        const leftShoulder = poseLandmarks[11];
        const rightShoulder = poseLandmarks[12];
        const leftElbow = poseLandmarks[13];
        const rightElbow = poseLandmarks[14];
        const leftWrist = poseLandmarks[15];
        const rightWrist = poseLandmarks[16];

        // Sum segements
        const armSpan = 
            calculateDistance(leftShoulder, leftElbow) + 
            calculateDistance(leftElbow, leftWrist) + 
            calculateDistance(rightShoulder, rightElbow) + 
            calculateDistance(rightElbow, rightWrist) +
            calculateDistance(leftShoulder, rightShoulder);


        // 2. Left Hand Control (Rotation & Zoom)
        // "Moving their left hand sideways will rotate... up and down will rotate..."
        // Use relative position to Left Shoulder to be more robust
        // Left hand is poseLandmarks[15] (Wrist) or leftHandLandmarks avg
        const lhPos = leftHandLandmarks ? leftHandLandmarks[9] : leftWrist; // Use middle knuckle or wrist
        
        // Normlize by wingspan/arm length for sensitivity
        // Start roughly at shoulder?
        const dx = (lhPos.x - leftShoulder.x);
        const dy = (lhPos.y - leftShoulder.y);
        const dz = (lhPos.z || 0) - (leftShoulder.z || 0); // Z is usually pose relative

        // 3. Right Hand Control (Cursor & Click)
        // Cursor overlaid. Map hand position to screen.
        // Hand position relative to shoulder or just in frame?
        // "Right hand will act as a cursor"
        // Let's use raw frame coordinates for cursor, maybe smoothed.
        const rhPos = rightHandLandmarks ? rightHandLandmarks[8] : rightWrist; // Index tip better for cursor
        // Flip X because webcam is mirrored usually
        const cursorX = 1 - rhPos.x; 
        const cursorY = rhPos.y;

        const isClicking = rightHandLandmarks ? isHandClosed(rightHandLandmarks) : false;

        dispatch(updateControlState({
            isUserActive: true,
            wingspan: armSpan,
            rotationControl: {
                x: dx, // Delta X from shoulder
                y: dy, // Delta Y from shoulder
                z: dz  // Delta Z
            },
            cursorControl: {
                x: cursorX,
                y: cursorY,
                isClicking
            }
        }));
    };

    return (
        <Box sx={{ 
            position: 'absolute', 
            bottom: 20, 
            right: 20, 
            width: 200, 
            height: 150, 
            zIndex: 1000,
            border: '2px solid #333',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: '#000'
        }}>
            {modelLoading && <Typography sx={{color: 'white', fontSize: 12, p: 1}}>Loading AI...</Typography>}
            <Webcam
                ref={webcamRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror
                }}
            />
            <canvas 
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover' // Match video
                }}
            />
            {isUserActive && (
                <div style={{
                    position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#0f0' 
                }} />
            )}
        </Box>
    );
};

export default WebcamStream;
