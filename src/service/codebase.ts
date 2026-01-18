import { Dispatch } from 'redux';
import { setGraph, setName, resetGraphState } from '../store/slices/graph';
import { constructGraphFromZip } from '../utils/graphConstruction';
import { openaiCategorize } from '../utils/openaiCategorize';
import { setNewAlert } from './alert';

export const generateAndStoreGraph = async (
    file: File, 
    dispatch: Dispatch<any>, 
    navigate: (path: string) => void,
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

        console.log("Graph constructed, dispatching to store...");
        dispatch(setGraph(graph));
        dispatch(setName(file.name));
        
        setNewAlert(dispatch, { msg: "Graph construction complete!", alertType: "success" });

        // Navigate
        navigate('/results');
     } catch (error: any) {
        console.error("Error generating graph:", error);
         setNewAlert(dispatch, {
            msg: error.message || "Failed to analyze codebase, please ensure the upload is valid",
            alertType: 'error'
        });
        throw error;
     }
}
