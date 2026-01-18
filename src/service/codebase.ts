import { Dispatch } from 'redux';
import { setGraph, setName, resetGraphState } from '../store/slices/graph';
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

        // Auto-categorize if API key is present
        if (apiKey) {
            console.log("Categorizing files with OpenAI...");
            setNewAlert(dispatch, { msg: "Graph built. Now categorizing files with AI...", alertType: "info" });
            try {
                const filePaths = graph.nodes.map(n => n.filepath);
                const categorization = await openaiCategorize(filePaths, apiKey);
                
                if (categorization && categorization.categories.length > 0) {
                    graph.categories = categorization.categories;
                    
                    graph.nodes.forEach(node => {
                        const catName = categorization.assignments[node.filepath];
                        if (catName) {
                            const idx = categorization.categories.indexOf(catName);
                            if (idx !== -1) {
                                node.category = idx;
                            }
                        }
                    });
                     console.log("Categorization complete:", categorization.categories);
                }
            } catch (catError) {
                console.warn("Categorization failed, falling back to default.", catError);
                setNewAlert(dispatch, { msg: "AI Categorization failed, using default grouping.", alertType: "warning" });
            }
        }

        console.log("Graph constructed.");
        
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

     } catch (error: any) {
        console.error("Error generating graph:", error);
         setNewAlert(dispatch, {
            msg: error.message || "Failed to analyze codebase, please ensure the upload is valid.",
            alertType: 'error'
        });
        throw error;
     }
}
