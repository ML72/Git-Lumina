import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ApiState {
    openaiKey: string | null;
}

const initialState: ApiState = {
    openaiKey: null
};

export const apiSlice = createSlice({
    name: 'api',
    initialState,
    reducers: {
        setOpenAiKey: (state, action: PayloadAction<string>) => {
            state.openaiKey = action.payload;
        },
        clearOpenAiKey: (state) => {
            state.openaiKey = null;
        }
    }
});

export const { setOpenAiKey, clearOpenAiKey } = apiSlice.actions;

export const selectOpenAiKey = (state: any) => state.api.openaiKey;

export default apiSlice.reducer;
