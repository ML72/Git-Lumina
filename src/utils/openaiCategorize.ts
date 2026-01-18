import { CodebaseGraph } from '../types/CodebaseGraph';

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface CategorizationResponse {
    categories: string[];
    assignments: Record<string, string>; // filepath -> category name
}

interface FolderSummary {
    path: string;
    files: {
        name: string;
        functionNames: string[];
        lineCount: number;
    }[];
}

export async function openaiCategorize(
    nodes: CodebaseGraph['nodes'],
    apiKey: string
): Promise<CategorizationResponse> {
    // 1. Group by folder
    const folderMap = new Map<string, typeof nodes>();
    
    nodes.forEach(node => {
        const parts = node.filepath.split('/');
        parts.pop(); // remove filename
        const folder = parts.join('/') || 'root';
        
        if (!folderMap.has(folder)) {
            folderMap.set(folder, []);
        }
        folderMap.get(folder)?.push(node);
    });

    // 2. Extract key info per folder
    const folderSummaries: FolderSummary[] = [];

    folderMap.forEach((folderNodes, folderPath) => {
        // Sort files to find "main" ones. 
        // Heuristic: index.* > [folderName].* > line count
        const folderName = folderPath.split('/').pop()?.toLowerCase();
        
        const sortedNodes = [...folderNodes].sort((a, b) => {
            const aName = a.filepath.split('/').pop()?.toLowerCase() || '';
            const bName = b.filepath.split('/').pop()?.toLowerCase() || '';
            
            const isAIndex = aName.startsWith('index.');
            const isBIndex = bName.startsWith('index.');
            if (isAIndex && !isBIndex) return -1;
            if (!isAIndex && isBIndex) return 1;

            if (folderName) {
                const isAMatch = aName.startsWith(folderName + '.');
                const isBMatch = bName.startsWith(folderName + '.');
                if (isAMatch && !isBMatch) return -1;
                if (!isAMatch && isBMatch) return 1;
            }

            return b.num_lines - a.num_lines; // Descending size
        });

        // Take top 3 files as representative
        const topNodes = sortedNodes.slice(0, 3);
        
        folderSummaries.push({
            path: folderPath,
            files: topNodes.map(n => ({
                name: n.filepath.split('/').pop() || '',
                functionNames: Object.keys(n.functions || {}).slice(0, 5), // Top 5 functions
                lineCount: n.num_lines
            }))
        });
    });

    // 3. Construct Prompt
    const systemPrompt = `You are a helpful assistant that categorizes a codebase.
    You will be given a list of folders, along with key files and their function names inside those folders.
    
    Your task:
    1. Create a set of logical categories (MAXIMUM 10). Examples: "UI Components", "State Management", "Utilities", "API Services", "Assets", "Configuration".
    2. Assign each *folder* to one of these categories.
    
    Return a JSON object with:
    - "categories": string[] (max 10)
    - "folder_assignments": Record<string, string> (folder path -> category)
    
    The output should be JSON only. Ensure every folder in the input is assigned a category.`;

    // Flatten summaries for prompt to save tokens (avoid full JSON structure overhead in prompt text)
    const promptLines = folderSummaries.map(f => {
        const fileDesc = f.files.map(file => 
            `${file.name} (fns: ${file.functionNames.join(', ')})`
        ).join(', ');
        return `Folder: "${f.path}" -> Files: [${fileDesc}]`;
    });

    const userMessage = `Here is the folder structure summary:\n${promptLines.join('\n')}`;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o", 
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2 // Lower temp for deterministic categories
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        if (!content) {
            throw new Error("No content received from OpenAI");
        }

        // Clean content of potential markdown code blocks
        const cleanedContent = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

        let result: { categories: string[], folder_assignments: Record<string, string> };
        try {
            result = JSON.parse(cleanedContent);
        } catch (e) {
            console.error("Failed to parse OpenAI response:", content);
            throw new Error("Failed to parse AI response as JSON");
        }
        
        // 4. Map back to file paths
        const finalAssignments: Record<string, string> = {};
        const finalCategories = result.categories || [];

        // Apply folder assignment to all files in that folder
        folderMap.forEach((folderNodes, folderPath) => {
            let category = result.folder_assignments?.[folderPath];
            
            // Fallback if LLM missed a folder or Hallucinated
            if (!category) {
                 // Try to find a best match? or just "General"
                 const firstCat = finalCategories[0];
                 category = firstCat || "General";
            } else {
                // Ensure category exists in list
                 if (!finalCategories.includes(category)) {
                    finalCategories.push(category);
                 }
            }

            folderNodes.forEach(node => {
                finalAssignments[node.filepath] = category;
            });
        });

        const uniqueCategories = Array.from(new Set(finalCategories));

        return {
            categories: uniqueCategories,
            assignments: finalAssignments
        };

    } catch (error) {
        console.error("Failed to categorize files:", error);
        throw error;
    }
}
