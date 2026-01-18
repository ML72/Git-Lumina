import { Dispatch } from 'redux';
import { setGraph, setName, resetGraphState } from '../store/slices/graph';
import { constructGraphFromZip } from '../utils/graphConstruction';
import { setNewAlert } from './alert';

export const generateAndStoreGraph = async (
    file: File, 
    dispatch: Dispatch<any>, 
    navigate: (path: string) => void
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
     } catch (error: any) {
        console.error("Error generating graph:", error);
         setNewAlert(dispatch, {
            msg: error.message || "Failed to analyze codebase, please ensure the upload is valid",
            alertType: 'error'
        });
        throw error;
     }
}
