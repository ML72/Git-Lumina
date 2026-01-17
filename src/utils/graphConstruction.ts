import JSZip from 'jszip';
import { CodebaseGraph } from '../types/CodebaseGraph';
import { analyzeFile, getLanguageFromExtension } from './languageSyntax';

export const constructGraphFromZip = async (zipFile: File): Promise<CodebaseGraph> => {
    // 1. Unzip
    console.log(`Unzipping ${zipFile.name}...`);
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);

    // 2. Process Files
    const files: Array<{
        path: string;
        content: string;
        fileName: string; // name without path
        nameNoExt: string;
    }> = [];

    // The zip usually contains a top-level folder "repo-branch"
    // We want to normalize paths by stripping that root folder.
    const rootFolder = Object.keys(contents.files)[0].split('/')[0] + '/';

    for (const [relativePath, file] of Object.entries(contents.files)) {
        if (file.dir) continue;
        if (!relativePath.startsWith(rootFolder)) continue; 
        
        // Skip hidden files, images, etc. based on extension/name
        const path = relativePath.slice(rootFolder.length);
        if(!path) continue; // Root folder entry itself if technically not dir?

        const fileName = path.split('/').pop() || '';
        if (fileName.startsWith('.') || fileName === 'package-lock.json' || fileName === 'yarn.lock') continue;

        const ext = fileName.split('.').pop()?.toLowerCase();
        // Allow-list for text/code files
        const allowedExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'json', 'md', 'css', 'html', 'go', 'rs'];
        if (ext && allowedExts.includes(ext)) {
            const content = await file.async('string');
            files.push({
                path,
                content,
                fileName,
                nameNoExt: fileName.replace(/\.[^/.]+$/, "") 
            });
        }
    }

    // 3. Construct Nodes
    const nodes = files.map((f, index) => {
        const analysis = analyzeFile(f.content, f.path);
        
        // We'll store analysis in a temp way if needed, but here we just need functions on the node
        return {
            id: index, // Temp ID for edge construction
            filepath: f.path,
            num_lines: f.content.split('\n').length,
            num_characters: f.content.length,
            category: 0, // Default category index
            functions: analysis.functions,
            description: "",
            imports: analysis.imports, // Keep for edge calc
            content: f.content,
            nameNoExt: f.nameNoExt
        };
    });

    // 4. Construct Edges
    const edges: [number, number, number][] = [];
    const dependencies: string[][] = nodes.map(() => []);

    // O(N^2) rough matching
    for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        
        // Pre-compute normalized imports for A
        const importsA = nodeA.imports.map(imp => {
            // imp might be "react", "./utils/helper", "numpy"
            // Normalize relative paths? Too complex for this snippet.
            // Just matching basename
            const part = imp.split('/').pop();
            return part ? part.replace(/\.[^/.]+$/, "") : "";
        });

        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const nodeB = nodes[j];
            
            let weight = 0;
            
            // 1. Check strict imports (fuzzy match filename against import list)
            if (importsA.includes(nodeB.nameNoExt)) {
                weight += 5; // High weight for direct import match
            }

            // 2. Check content references (mention of class name or file name)
            // Simple string search - careful of false positives but okay for visualizer
            // Regex for whole word to avoid "us" matching "user"
            const nameRegex = new RegExp(`\\b${escapeRegExp(nodeB.nameNoExt)}\\b`, 'g');
            const matches = (nodeA.content.match(nameRegex) || []).length;
            
            if (matches > 0) {
               weight += matches;
            }

            if (weight > 0) {
                // Logarithmic scaling as requested
                // matches can be large, so log helps
                const finalWeight = Math.log(weight + 1);
                // Ensure reasonable precision
                edges.push([i, j, Number(finalWeight.toFixed(2))]);
                dependencies[i].push(nodeB.filepath);
            }
        }
    }

    return {
        categories: ["General"],
        nodes: nodes.map(({ filepath, num_lines, num_characters, category, functions, description }, index) => ({
            filepath,
            num_lines,
            num_characters,
            category,
            functions,
            description,
            fileDependencies: dependencies[index]
        })),
        edges
    };
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
