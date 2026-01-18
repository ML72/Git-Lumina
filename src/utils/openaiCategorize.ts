import { CodebaseGraph } from '../types/CodebaseGraph';

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface CategorizationResponse {
    categories: string[];
    assignments: Record<string, string>; // filepath -> category name
}

export async function openaiCategorize(
    filePaths: string[],
    apiKey: string
): Promise<CategorizationResponse> {
    const systemPrompt = `You are a helpful assistant that categorizes files in a software project. 
    You will be given a list of file paths. 
    Your task is to group them into logical categories (e.g., "Components", "Services", "Utils", "Configuration", "Tests", etc.).
    Return a JSON object with two keys:
    1. "categories": an array of unique category names you created.
    2. "assignments": an object mapping each file path to one of the category names.
    Ensure every file path provided is in the assignments.`;

    const userMessage = `Here are the files:\n${filePaths.join('\n')}`;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o", // or gpt-3.5-turbo if preferred
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                response_format: { type: "json_object" }
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

        const result = JSON.parse(content) as CategorizationResponse;
        return result;

    } catch (error) {
        console.error("Failed to categorize files:", error);
        throw error;
    }
}
