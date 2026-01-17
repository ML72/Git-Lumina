// This file defines the schema for the codebase graph data structure.

export interface CodebaseGraph {
  categories: string[];
  nodes: Array<{
    filepath: string;
    num_lines: number;
    num_characters: number;
    category: number;
    functions: Record<string, { line_start: number; line_count: number }>;
    description: string;
    size?: number; // Number of lines or other metric (optional)
    dependsOn?: string[]; // List of filepaths this node depends on (optional)
  }>;
  edges: [number, number, number][];
}
