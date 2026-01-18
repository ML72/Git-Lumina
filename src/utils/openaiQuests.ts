import { CodebaseGraph } from '../types/CodebaseGraph';

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export interface Quest {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    relevantNodes: string[]; // filepaths
}

export async function generateQuests(
    nodes: CodebaseGraph['nodes'],
    apiKey: string
): Promise<Quest[]> {
    // 1. Prepare a summary of the codebase structure
    const folderMap = new Map<string, string[]>();
    nodes.forEach(node => {
        const parts = node.filepath.split('/');
        parts.pop();
        const folder = parts.join('/') || 'root';
        if (!folderMap.has(folder)) {
            folderMap.set(folder, []);
        }
        folderMap.get(folder)?.push(node.filepath);
    });

    const structureSummary = Array.from(folderMap.entries())
        .map(([folder, files]) => {
            // Only take top 5 files per folder to save tokens
            const topFiles = files.slice(0, 5).map(f => f.split('/').pop()).join(', ');
            return `${folder}: [${topFiles}${files.length > 5 ? '...' : ''}]`;
        })
        .join('\n');

    const systemPrompt = `You are a tailored onboarding assistant for a codebase.
    Based on the folder structure provided, generate EXACTLY 3 "Learning Quests" for a new developer.
    
    Be creative and narrative-driven. The quests should feel like a guided tour or a story unfolding.
    
    Return JSON object with a "quests" array:
    {
      "quests": [
        {
            "title": "Quest Title",
            "description": "Short description (max 10 words)",
            "relevant_files": ["src/main.ts"]
        }
      ]
    }`;

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
                    { role: "user", content: `Codebase Structure:\n${structureSummary}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
            })
        });

        if (!response.ok) throw new Error("OpenAI API Failed");

        const data = await response.json();
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);
        
        const questsArray = result.quests || [];

        // Force exactly 3 if possible, or take what we have
        return questsArray.slice(0, 3).map((q: any, i: number) => ({
            id: i + 1,
            title: q.title,
            description: q.description,
            completed: false,
            relevantNodes: q.relevant_files || []
        }));

    } catch (error) {
        console.error("Failed to generate quests:", error);
        return [
            { id: 1, title: 'Explore Structure', description: 'Review the main directories.', completed: false, relevantNodes: [] },
            { id: 2, title: 'Find Entry Point', description: 'Locate index or main files.', completed: false, relevantNodes: [] },
            { id: 3, title: 'Check Utils', description: 'Review utility functions.', completed: false, relevantNodes: [] }
        ];
    }
}