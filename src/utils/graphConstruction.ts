
import axios from "axios";
import type { CodebaseGraph } from "../types/CodebaseGraph";

/**
 * Decodes base64 to UTF-8 string in a browser-friendly way.
 */
export function base64ToUtf8(base64: string): string {
  const cleaned = base64.replace(/\n/g, "");
  if (typeof window !== "undefined" && window.atob) {
    const binary = window.atob(cleaned);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return "";
}

/**
 * Fetches the GitHub repository info (to get default branch, etc).
 */
export async function getRepoInfo(owner: string, repo: string, githubToken: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = { Authorization: `token ${githubToken}` };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch repo info: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Fetches the recursive file tree for a given repo and branch.
 */
export async function getRepoTree(owner: string, repo: string, branch: string, githubToken: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers = { Authorization: `token ${githubToken}` };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch repo tree: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Parses code and extracts imported module names.
 * (This is a simple regex-based parser for import statements in code.)
 */
export function getImports(codeContent: string): string[] {
  const importRegex = /^\s*(?:from|import)\s+([a-zA-Z0-9_\.]+)/gm;
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(codeContent)) !== null) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

/**
 * Resolves an import name to a file path in the repo (language-agnostic).
 * Tries to match the import/module name to any file in the repo by replacing dots with slashes and matching any extension.
 */
export function resolvePath(importName: string, currentPath: string, allPaths: Set<string>): string | null {
  // Try to match importName to any file path in the repo
  const importPath = importName.replace(/\./g, "/");
  // Check for any file that ends with the import path (with or without extension)
  for (const path of allPaths) {
    if (path.endsWith(importPath) || path.endsWith(importPath + ".js") || path.endsWith(importPath + ".ts") || path.endsWith(importPath + ".jsx") || path.endsWith(importPath + ".tsx") || path.endsWith(importPath + ".py")) {
      return path;
    }
  }
  // Try relative: <currentDir>/<importPath>
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
  const relativePath = currentDir ? `${currentDir}/${importPath}` : importPath;
  for (const path of allPaths) {
    if (path.endsWith(relativePath) || path.endsWith(relativePath + ".js") || path.endsWith(relativePath + ".ts") || path.endsWith(relativePath + ".jsx") || path.endsWith(relativePath + ".tsx") || path.endsWith(relativePath + ".py")) {
      return path;
    }
  }
  return null;
}

/**
 * Constructs a graph of nodes and links from a GitHub repo's code files (language-agnostic).
 */
export async function constructGraph(owner: string, repo: string, githubToken: string): Promise<CodebaseGraph> {
  // 1. Get repo info for default branch
  const repoInfo = await getRepoInfo(owner, repo, githubToken);
  const branch = repoInfo.default_branch || "main";

  // 2. Get the file tree
  const treeData = await getRepoTree(owner, repo, branch, githubToken);
  const tree = treeData.tree || [];

  // 3. Filter for code files (js, ts, jsx, tsx, py, java, cpp, c, cs, go, rb, php, etc.)
  const codeExtensions = [
    ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".cpp", ".c", ".cs", ".go", ".rb", ".php", ".swift", ".kt", ".rs", ".m", ".scala", ".pl", ".sh", ".dart", ".lua"
  ];
  const allPaths: string[] = tree
    .filter((item: any) => codeExtensions.some((ext: string) => item.path.toLowerCase().endsWith(ext)))
    .map((item: any) => String(item.path));
  const allPathsSet: Set<string> = new Set<string>(allPaths);

  // 4. Categories (stub: by extension)
  const extToCategory: Record<string, number> = {};
  const categories: string[] = [];
  allPaths.forEach((path: string) => {
    const ext = path.slice(path.lastIndexOf('.'));
    if (!(ext in extToCategory)) {
      extToCategory[ext] = categories.length;
      categories.push(ext);
    }
  });

  // 5. Build nodes with required fields
  const nodes = await Promise.all(allPaths.map(async (path: string) => {
    // Find the tree item for this path
    const item = tree.find((i: any) => i.path === path);
    let functions: Record<string, { line_start: number, line_count: number }> = {};
    let content = "";
    let size: number | undefined = undefined;
    let dependsOn: string[] | undefined = undefined;
    if (item) {
      try {
        const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`;
        const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
        const blobRes = await axios.get(blobUrl, { headers });
        content = base64ToUtf8(blobRes.data.content);
        size = content ? content.split('\n').length : undefined;
        // Simple function extraction (stub: match 'function name(' or 'def name(')
        const funcRegex = /(?:function|def)\s+([a-zA-Z0-9_]+)\s*\(.*\)\s*[{:]?/g;
        let match: RegExpExecArray | null;
        let lines = content.split('\n');
        while ((match = funcRegex.exec(content)) !== null) {
          const name = match[1];
          // Find line number
          const before = content.slice(0, match.index);
          const line_start = before.split('\n').length;
          // For demo, just set line_count = 1
          functions[name] = { line_start, line_count: 1 };
        }
        // Dependency directions: what this file depends on
        const imports = getImports(content);
        const resolvedDeps = imports
          .map(imp => resolvePath(imp, path, allPathsSet))
          .filter((depPath): depPath is string => !!depPath);
        if (resolvedDeps.length > 0) {
          dependsOn = resolvedDeps;
        }
      } catch (e) {}
    }
    const ext = path.slice(path.lastIndexOf('.'));
    return {
      filepath: path,
      github_url: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
      category: extToCategory[ext],
      functions,
      description: "",
      ...(size !== undefined ? { size } : {}),
      ...(dependsOn !== undefined ? { dependsOn } : {})
    };
  }));

  // 6. Build edges as [fromIndex, toIndex, weight]
  const edges: [number, number, number][] = [];
  for (let i = 0; i < allPaths.length; ++i) {
    const path: string = allPaths[i];
    const item = tree.find((it: any) => it.path === path);
    if (!item) continue;
    try {
      const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`;
      const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
      const blobRes = await axios.get(blobUrl, { headers });
      const content = base64ToUtf8(blobRes.data.content);
      const imports = getImports(content);
      for (const imp of imports) {
        const targetPath = resolvePath(imp, path, allPathsSet);
        if (targetPath) {
          const j = allPaths.indexOf(targetPath);
          if (j !== -1) {
            // Weight stub: 1.0 for now
            edges.push([i, j, 1.0]);
          }
        }
      }
    } catch (e) {}
  }

  return { categories, nodes, edges };
}