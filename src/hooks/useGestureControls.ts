import { useRef, useCallback, useMemo } from 'react';
import { GestureState, HandData } from '../components/Webcam';

export interface GestureControlState {
    // Pan delta in normalized coordinates (-1 to 1)
    panDelta: { x: number; y: number };
    // Zoom delta (positive = zoom in, negative = zoom out)
    zoomDelta: number;
    // Whether any hand is actively "clicking" (closed)
    isActive: boolean;
    // Number of hands currently clicking
    activeHandCount: number;
    // Current cursor positions for visualization
    cursors: {
        left: { x: number; y: number; isActive: boolean } | null;
        right: { x: number; y: number; isActive: boolean } | null;
    };
    // Debug info
    mode: 'idle' | 'one-hand-pan' | 'two-hand-zoom';
}

interface SmoothedPosition {
    x: number;
    y: number;
}

interface PreviousState {
    leftHand: { x: number; y: number } | null;
    rightHand: { x: number; y: number } | null;
    distance: number | null;
    centerPoint: { x: number; y: number } | null;
    wasInTwoHandMode: boolean;
    // Smoothed positions for reducing jitter
    smoothedLeftHand: SmoothedPosition | null;
    smoothedRightHand: SmoothedPosition | null;
    smoothedDistance: number | null;
    smoothedCenterPoint: SmoothedPosition | null;
    // Smoothed output deltas
    smoothedPanDelta: { x: number; y: number };
    smoothedZoomDelta: number;
}

// Sensitivity multipliers
const PAN_SENSITIVITY = 10;
const ZOOM_SENSITIVITY = 15;

// Smoothing factors (0 = no smoothing/instant, 1 = infinite smoothing/no movement)
// Lower values = more responsive but jittery
// Higher values = smoother but more lag
const POSITION_SMOOTHING = 0.6;  // Smoothing for hand positions (0.6 = 40% new, 60% old)
const OUTPUT_SMOOTHING = 0.5;    // Smoothing for output deltas (0.5 = 50% new, 50% old)
const DISTANCE_SMOOTHING = 0.7;  // Smoothing for pinch distance (more smoothing for zoom stability)

// Deadzone threshold - ignore very small movements
const DEADZONE = 0.002;

// Exponential smoothing function
const smooth = (current: number, previous: number, factor: number): number => {
    return previous * factor + current * (1 - factor);
};

// Smooth a 2D position
const smoothPosition = (
    current: SmoothedPosition, 
    previous: SmoothedPosition | null, 
    factor: number
): SmoothedPosition => {
    if (!previous) return current;
    return {
        x: smooth(current.x, previous.x, factor),
        y: smooth(current.y, previous.y, factor)
    };
};

// Apply deadzone - if delta is too small, return 0
const applyDeadzone = (value: number, threshold: number): number => {
    return Math.abs(value) < threshold ? 0 : value;
};

export const useGestureControls = () => {
    const previousStateRef = useRef<PreviousState>({
        leftHand: null,
        rightHand: null,
        distance: null,
        centerPoint: null,
        wasInTwoHandMode: false,
        smoothedLeftHand: null,
        smoothedRightHand: null,
        smoothedDistance: null,
        smoothedCenterPoint: null,
        smoothedPanDelta: { x: 0, y: 0 },
        smoothedZoomDelta: 0
    });
    
    const controlStateRef = useRef<GestureControlState>({
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        isActive: false,
        activeHandCount: 0,
        cursors: {
            left: null,
            right: null
        },
        mode: 'idle'
    });
    
    const frameCountRef = useRef(0);

    // Process gesture state and return control deltas
    const processGesture = useCallback((gestureState: GestureState): GestureControlState => {
        const { leftHand, rightHand, sensitivityScale } = gestureState;
        const prev = previousStateRef.current;
        
        frameCountRef.current++;
        
        // Determine which hands are "clicking" (closed = not open)
        const leftActive = leftHand !== null && !leftHand.isOpen;
        const rightActive = rightHand !== null && !rightHand.isOpen;
        const activeHandCount = (leftActive ? 1 : 0) + (rightActive ? 1 : 0);
        
        // Smooth the raw hand positions first
        let smoothedLeftPos: SmoothedPosition | null = null;
        let smoothedRightPos: SmoothedPosition | null = null;
        
        if (leftHand) {
            smoothedLeftPos = smoothPosition(
                leftHand.position,
                prev.smoothedLeftHand,
                POSITION_SMOOTHING
            );
            prev.smoothedLeftHand = smoothedLeftPos;
        } else {
            prev.smoothedLeftHand = null;
        }
        
        if (rightHand) {
            smoothedRightPos = smoothPosition(
                rightHand.position,
                prev.smoothedRightHand,
                POSITION_SMOOTHING
            );
            prev.smoothedRightHand = smoothedRightPos;
        } else {
            prev.smoothedRightHand = null;
        }
        
        // Update cursor info with smoothed positions
        controlStateRef.current.cursors = {
            left: smoothedLeftPos ? {
                x: smoothedLeftPos.x,
                y: smoothedLeftPos.y,
                isActive: leftActive
            } : null,
            right: smoothedRightPos ? {
                x: smoothedRightPos.x,
                y: smoothedRightPos.y,
                isActive: rightActive
            } : null
        };
        
        let rawPanDelta = { x: 0, y: 0 };
        let rawZoomDelta = 0;
        let mode: 'idle' | 'one-hand-pan' | 'two-hand-zoom' = 'idle';
        
        // Debug log every 60 frames (reduced frequency)
        const shouldLog = frameCountRef.current % 60 === 0;
        
        // TWO-HAND MODE: Both hands closed - zoom AND pan
        if (activeHandCount === 2 && smoothedLeftPos && smoothedRightPos) {
            mode = 'two-hand-zoom';
            
            // Calculate current distance between smoothed hand positions
            const rawDistance = Math.hypot(
                smoothedRightPos.x - smoothedLeftPos.x,
                smoothedRightPos.y - smoothedLeftPos.y
            );
            
            // Smooth the distance as well
            const currentDistance = prev.smoothedDistance !== null 
                ? smooth(rawDistance, prev.smoothedDistance, DISTANCE_SMOOTHING)
                : rawDistance;
            
            // Calculate center point between hands (already using smoothed positions)
            const rawCenter = {
                x: (smoothedLeftPos.x + smoothedRightPos.x) / 2,
                y: (smoothedLeftPos.y + smoothedRightPos.y) / 2
            };
            
            // Smooth the center point
            const currentCenter = smoothPosition(
                rawCenter,
                prev.smoothedCenterPoint,
                POSITION_SMOOTHING
            );
            
            // Only calculate deltas if we have previous two-hand state
            if (prev.wasInTwoHandMode && prev.distance !== null && prev.centerPoint !== null) {
                // Calculate zoom based on pinch distance change
                const distanceDelta = currentDistance - prev.distance;
                rawZoomDelta = applyDeadzone(distanceDelta, DEADZONE) * sensitivityScale * ZOOM_SENSITIVITY;
                
                // Calculate pan based on center point movement
                const dx = applyDeadzone(currentCenter.x - prev.centerPoint.x, DEADZONE);
                const dy = applyDeadzone(currentCenter.y - prev.centerPoint.y, DEADZONE);
                rawPanDelta = {
                    x: dx * sensitivityScale * PAN_SENSITIVITY,
                    y: dy * sensitivityScale * PAN_SENSITIVITY
                };
            }
            
            // Update tracking state
            prev.distance = currentDistance;
            prev.smoothedDistance = currentDistance;
            prev.centerPoint = currentCenter;
            prev.smoothedCenterPoint = currentCenter;
            prev.wasInTwoHandMode = true;
            prev.leftHand = { ...smoothedLeftPos };
            prev.rightHand = { ...smoothedRightPos };
        }
        // ONE-HAND MODE: Single hand closed - pan only
        else if (activeHandCount === 1) {
            mode = 'one-hand-pan';
            
            // Reset two-hand state
            prev.distance = null;
            prev.smoothedDistance = null;
            prev.centerPoint = null;
            prev.smoothedCenterPoint = null;
            prev.wasInTwoHandMode = false;
            
            const activeSmoothedPos = leftActive ? smoothedLeftPos : smoothedRightPos;
            const prevHandPos = leftActive ? prev.leftHand : prev.rightHand;
            
            if (activeSmoothedPos && prevHandPos) {
                // Calculate pan delta based on smoothed hand movement
                const dx = applyDeadzone(activeSmoothedPos.x - prevHandPos.x, DEADZONE);
                const dy = applyDeadzone(activeSmoothedPos.y - prevHandPos.y, DEADZONE);
                
                rawPanDelta = {
                    x: dx * sensitivityScale * PAN_SENSITIVITY,
                    y: dy * sensitivityScale * PAN_SENSITIVITY
                };
            }
            
            // Update the active hand's previous position
            if (leftActive && smoothedLeftPos) {
                prev.leftHand = { ...smoothedLeftPos };
                prev.rightHand = null;
            } else if (rightActive && smoothedRightPos) {
                prev.rightHand = { ...smoothedRightPos };
                prev.leftHand = null;
            }
        }
        // IDLE MODE: No hands closed
        else {
            mode = 'idle';
            
            // Reset all previous state
            prev.leftHand = null;
            prev.rightHand = null;
            prev.distance = null;
            prev.smoothedDistance = null;
            prev.centerPoint = null;
            prev.smoothedCenterPoint = null;
            prev.wasInTwoHandMode = false;
            // Reset smoothed output when idle
            prev.smoothedPanDelta = { x: 0, y: 0 };
            prev.smoothedZoomDelta = 0;
        }
        
        // Apply output smoothing to the deltas
        let finalPanDelta: { x: number; y: number };
        let finalZoomDelta: number;
        
        if (mode !== 'idle') {
            finalPanDelta = {
                x: smooth(rawPanDelta.x, prev.smoothedPanDelta.x, OUTPUT_SMOOTHING),
                y: smooth(rawPanDelta.y, prev.smoothedPanDelta.y, OUTPUT_SMOOTHING)
            };
            finalZoomDelta = smooth(rawZoomDelta, prev.smoothedZoomDelta, OUTPUT_SMOOTHING);
            
            prev.smoothedPanDelta = finalPanDelta;
            prev.smoothedZoomDelta = finalZoomDelta;
        } else {
            finalPanDelta = { x: 0, y: 0 };
            finalZoomDelta = 0;
        }
        
        if (shouldLog && mode !== 'idle') {
            console.log(`[GestureControls] ${mode}:`, {
                rawPan: rawPanDelta,
                smoothedPan: finalPanDelta,
                rawZoom: rawZoomDelta.toFixed(4),
                smoothedZoom: finalZoomDelta.toFixed(4)
            });
        }
        
        controlStateRef.current = {
            panDelta: finalPanDelta,
            zoomDelta: finalZoomDelta,
            isActive: activeHandCount > 0,
            activeHandCount,
            cursors: controlStateRef.current.cursors,
            mode
        };
        
        return controlStateRef.current;
    }, []);
    
    // Reset the previous state (useful when gesture tracking is interrupted)
    const resetState = useCallback(() => {
        previousStateRef.current = {
            leftHand: null,
            rightHand: null,
            distance: null,
            centerPoint: null,
            wasInTwoHandMode: false,
            smoothedLeftHand: null,
            smoothedRightHand: null,
            smoothedDistance: null,
            smoothedCenterPoint: null,
            smoothedPanDelta: { x: 0, y: 0 },
            smoothedZoomDelta: 0
        };
        controlStateRef.current = {
            panDelta: { x: 0, y: 0 },
            zoomDelta: 0,
            isActive: false,
            activeHandCount: 0,
            cursors: {
                left: null,
                right: null
            },
            mode: 'idle'
        };
    }, []);

    return useMemo(() => ({
        processGesture,
        resetState,
        getControlState: () => controlStateRef.current
    }), [processGesture, resetState]);
};

export default useGestureControls;
