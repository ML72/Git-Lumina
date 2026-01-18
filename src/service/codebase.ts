import { Dispatch } from 'redux';
import { setGraph, setName, resetGraphState, updateGraphCategories } from '../store/slices/graph';
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

        console.log("Graph constructed, dispatching to store...");
        dispatch(setGraph(graph));
        dispatch(setName(file.name));
        
        setNewAlert(dispatch, { msg: "Graph construction complete!", alertType: "success" });

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
            msg: error.message || "Failed to analyze codebase, please ensure the upload is valid",
            alertType: 'error'
        });
        throw error;
     }
}
