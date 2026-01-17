// This file defines the schema for the codebase graph data structure.

export interface CodebaseGraph {
  categories: string[]; // List of categories for grouping nodes
  nodes: Array<{
    filepath: string; // The relative path of the file
    num_lines: number; // Total number of lines in the file
    num_characters: number; // Total number of characters in the file
    category: number; // Index of the category this node belongs to
    functions: Record<string, { line_start: number; line_count: number }>; // Map of function names to their location
    description: string; // Description of the file's purpose
    fileDependencies: string[]; // List of filepaths this node depends on
  }>;
  edges: [number, number, number][]; // Directed edges between nodes: [sourceNodeIndex, targetNodeIndex, weight]
}
