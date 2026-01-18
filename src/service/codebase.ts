import { Dispatch } from 'redux';
import { setGraph, setName, resetGraphState, updateGraphCategories } from '../store/slices/graph';
import { constructGraphFromZip } from '../utils/graphConstruction';
import { openaiCategorize } from '../utils/openaiCategorize';
import { setNewAlert } from './alert';

// Defined logic: Small graphs go to Redux + Persistence, Large graphs (>100 nodes) are passed via Navigation State only.
const LARGE_GRAPH_THRESHOLD = 100;

export const generateAndStoreGraph = async (
    file: File, 
    dispatch: Dispatch<any>, 
    navigate: (path: string, state?: any) => void,
    apiKey?: string | null
) => {
     try {
        console.log("Resetting previous graph state...");
        dispatch(resetGraphState());

        console.log("Starting graph construction...");
        const graph = await constructGraphFromZip(file);
        
        if (!graph || graph.nodes.length === 0) {
             throw new Error("Could not extract any valid code files from the zip.");
        }

        console.log("Graph constructed, dispatching to store...");
        dispatch(setGraph(graph));
        dispatch(setName(file.name));
        
        // Dispatch basic metadata to store regardless
        dispatch(setName(file.name));

        const isLargeGraph = graph.nodes.length > LARGE_GRAPH_THRESHOLD;

        if (isLargeGraph) {
            console.log(`Graph is large (${graph.nodes.length} nodes). Bypassing Redux storage.`);
            setNewAlert(dispatch, { msg: "Large codebase detected. Visualization loaded efficiently.", alertType: "success" });
            // Pass via navigation state
            navigate('/results', { state: { largeGraph: graph } });
        } else {
            console.log(`Graph is small (${graph.nodes.length} nodes). Storing in Redux.`);
            dispatch(setGraph(graph));
            setNewAlert(dispatch, { msg: "Graph construction complete!", alertType: "success" });
            navigate('/results');
        }

        // Navigate
        navigate('/results');

        // Auto-categorize if API key is present (ASYNC)
        if (apiKey) {
            console.log("Categorizing files with OpenAI...");
            setNewAlert(dispatch, { msg: "Graph built. Categorizing in background...", alertType: "info" });
            
            // Do not await this. Let it run in background.
            openaiCategorize(graph.nodes, apiKey)
                .then(categorization => {
                    if (categorization && categorization.categories.length > 0) {
                        dispatch(updateGraphCategories({
                            categories: categorization.categories,
                            assignments: categorization.assignments
                        }));
                        console.log("Categorization complete:", categorization.categories);
                        setNewAlert(dispatch, { msg: "AI Categorization applied!", alertType: "success" });
                    }
                })
                .catch(catError => {
                    console.warn("Categorization failed, falling back to default.", catError);
                    setNewAlert(dispatch, { 
                        msg: `AI Categorization failed: ${catError instanceof Error ? catError.message : "Unknown error"}`, 
                        alertType: "warning" 
                    });
                });
        }
     } catch (error: any) {
        console.error("Error generating graph:", error);
         setNewAlert(dispatch, {
            msg: error.message || "Failed to analyze codebase, please ensure the upload is valid.",
            alertType: 'error'
        });
        throw error;
     }
}
