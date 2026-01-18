import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CodebaseGraph } from '../../types/CodebaseGraph';

interface GraphState {
    graph: CodebaseGraph | null;
    description: string;
    name: string;
}

const initialState: GraphState = {
    graph: null,
    description: '',
    name: '',
};

export const graphSlice = createSlice({
    name: 'graph',
    initialState,
    reducers: {
        setGraph: (state, action: PayloadAction<CodebaseGraph>) => {
            state.graph = action.payload;
        },
        setDescription: (state, action: PayloadAction<string>) => {
            state.description = action.payload;
        },
        setName: (state, action: PayloadAction<string>) => {
            state.name = action.payload;
        },
        resetGraphState: (state) => {
            state.graph = null;
            state.description = '';
            state.name = '';
        },
        updateGraphCategories: (state, action: PayloadAction<{ categories: string[], assignments: Record<string, string> }>) => {
            if (!state.graph) return;

            const { categories, assignments } = action.payload;
            
            // Update the categories list
            state.graph.categories = categories;

            // Update each node's category index
            state.graph.nodes.forEach(node => {
                const categoryName = assignments[node.filepath];
                if (categoryName) {
                    const categoryIndex = categories.indexOf(categoryName);
                    if (categoryIndex !== -1) {
                        node.category = categoryIndex;
                    } else {
                        // Fallback
                        node.category = 0; 
                    }
                }
            });
        }
    }
});

export const { setGraph, setDescription, setName, resetGraphState, updateGraphCategories } = graphSlice.actions;

export const selectGraph = (state: any) => state.graph.graph;
export const selectDescription = (state: any) => state.graph.description;
export const selectName = (state: any) => state.graph.name;

export default graphSlice.reducer;
