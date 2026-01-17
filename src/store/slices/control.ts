import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ControlState {
  isUserActive: boolean;
  wingspan: number;
  rotationControl: {
    x: number; // relative horizontal position of left hand
    y: number; // relative vertical position of left hand
    z: number; // relative depth position of left hand
  };
  cursorControl: {
    x: number; // screen x (0-1)
    y: number; // screen y (0-1)
    isClicking: boolean;
  };
}

const initialState: ControlState = {
  isUserActive: false,
  wingspan: 1,
  rotationControl: { x: 0, y: 0, z: 0 },
  cursorControl: { x: 0.5, y: 0.5, isClicking: false },
};

export const controlSlice = createSlice({
  name: 'control',
  initialState,
  reducers: {
    updateControlState: (state, action: PayloadAction<Partial<ControlState>>) => {
      // Merge payload into state
      return { ...state, ...action.payload };
    },
    setIsUserActive: (state, action: PayloadAction<boolean>) => {
      state.isUserActive = action.payload;
    },
    setWingspan: (state, action: PayloadAction<number>) => {
      state.wingspan = action.payload;
    }
  }
});

export const { updateControlState, setIsUserActive, setWingspan } = controlSlice.actions;

export const selectControlState = (state: any) => state.control;

export default controlSlice.reducer;
