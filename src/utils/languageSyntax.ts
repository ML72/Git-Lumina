export interface FunctionLocation {
    line_start: number;
    line_count: number;
}

export interface FileAnalysis {
    functions: Record<string, FunctionLocation>;
    imports: string[];
}

type Language = 'javascript' | 'typescript' | 'python' | 'java' | 'c' | 'cpp' | 'json' | 'markdown' | 'css' | 'html' | 'yaml' | 'text' | 'go' | 'rust' | 'php' | 'ruby' | 'Other';

export const getLanguageFromExtension = (filename: string): Language => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'c':
        case 'h':
            return 'c';
        case 'cpp':
        case 'hpp':
        case 'cc':
            return 'cpp';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        case 'yaml':
        case 'yml':
            return 'yaml';
        case 'txt':
            return 'text';
        case 'go':
            return 'go';
        case 'rs':
            return 'rust';
        case 'php':
            return 'php';
        case 'rb':
            return 'ruby';
        default:
            return 'Other';
    }
};

const getLines = (content: string) => content.split('\n');

const analyzeJsTs = (content: string): FileAnalysis => {
    const lines = getLines(content);
    const functions: Record<string, FunctionLocation> = {};
    const imports: string[] = [];

    const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s*)?(\(.*\)|[^=]*)\s*=>|(\w+)\s*\([^)]*\)\s*\{/;
    const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/;

    lines.forEach((line, index) => {
        const importMatch = line.match(importRegex);
        if (importMatch) {
            imports.push(importMatch[1] || importMatch[2]);
        }

        const funcMatch = line.match(functionRegex);
        if (funcMatch) {
            const funcName = funcMatch[1] || funcMatch[2] || funcMatch[5];
            if (funcName && !['if', 'for', 'switch', 'while', 'catch'].includes(funcName)) {
                // Heuristic for line count: count braces or just assume a block
                // For simplicity/visualization, we'll estimate or count until closing brace (simplified)
                // Here we just mark start and a heuristic length or scan ahead
                
                // Let's do a simple brace counting for length
                let openBraces = 0;
                let count = 0;
                let foundEnd = false;
                
                for (let i = index; i < lines.length; i++) {
                    const l = lines[i];
                    openBraces += (l.match(/\{/g) || []).length;
                    openBraces -= (l.match(/\}/g) || []).length;
                    count++;
                    if (openBraces === 0 && count > 0 && l.includes('}')) {
                         foundEnd = true;
                         break;
                    }
                     // Safety break for long files if parsing gets confused
                    if (count > 200) break;
                }
                
                functions[funcName] = {
                    line_start: index + 1,
                    line_count: foundEnd ? count : 1 // fallback
                };
            }
        }
    });

    return { functions, imports };
};

const analyzePython = (content: string): FileAnalysis => {
    const lines = getLines(content);
    const functions: Record<string, FunctionLocation> = {};
    const imports: string[] = [];

    const defRegex = /^\s*def\s+(\w+)/;
    const importRegex = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/;

    lines.forEach((line, index) => {
        const importMatch = line.match(importRegex);
        if (importMatch) {
            imports.push(importMatch[1] || importMatch[2]);
        }

        const funcMatch = line.match(defRegex);
        if (funcMatch) {
            const funcName = funcMatch[1];
            // Indentation based counting
            const indentLevel = line.search(/\S/);
            let count = 1;
            for (let i = index + 1; i < lines.length; i++) {
                const l = lines[i];
                if (l.trim() === '') {
                    count++;
                    continue;
                }
                const currentIndent = l.search(/\S/);
                if (currentIndent > indentLevel) {
                    count++;
                } else {
                    break;
                }
            }
             functions[funcName] = {
                line_start: index + 1,
                line_count: count
            };
        }
    });

    return { functions, imports };
};

const analyzeJava = (content: string): FileAnalysis => {
    const lines = getLines(content);
    const functions: Record<string, FunctionLocation> = {};
    const imports: string[] = [];
    
    // Simplistic Java parsing
    const importRegex = /import\s+([\w.]+);/;
    // access_modifier return_type name(args) { 
    // We'll skip complex regex and look for patterns that look like methods
    // public/private/protected static? Type name(...) {
    const methodRegex = /(?:public|private|protected|static|\s) +[\w<>\[\]]+\s+(\w+)\s*\(.*\)\s*\{?/;

    lines.forEach((line, index) => {
        const importMatch = line.match(importRegex);
        if (importMatch) {
            imports.push(importMatch[1]);
        }

        const funcMatch = line.match(methodRegex);
        if (funcMatch) {
            const funcName = funcMatch[1];
            if (!['if', 'for', 'while', 'switch'].includes(funcName)) {
                let openBraces = (line.match(/\{/g) || []).length;
                let count = 0;
                let braceTrack = openBraces;
                
                // If it didn't open a brace on this line, look ahead
                let i = index;
                if(openBraces === 0) {
                     // scan a few lines for opening brace
                     for (let j = 1; j < 5 && i + j < lines.length; j++) {
                         braceTrack += (lines[i+j].match(/\{/g) || []).length;
                         if (braceTrack > 0) break;
                     }
                }

                if (braceTrack > 0) {
                     for (; i < lines.length; i++) {
                        const l = lines[i];
                        braceTrack += (l.match(/\{/g) || []).length;
                        braceTrack -= (l.match(/\}/g) || []).length;
                        count++;
                        if (braceTrack === 0) break;
                     }
                } else {
                    count = 1; // Abstract method or interface or failed parse
                }

                functions[funcName] = {
                    line_start: index + 1,
                    line_count: count
                };
            }
        }
    });

    return { functions, imports };
};

const analyzeC = (content: string): FileAnalysis => {
     const lines = getLines(content);
    const functions: Record<string, FunctionLocation> = {};
    const imports: string[] = [];
    
    const includeRegex = /#include\s+[<"]([^>"]+)[>"]/;
    // Type name(...) {
    const funcRegex = /^[a-zA-Z0-9_*]+\s+(\w+)\s*\(.*\)\s*\{?/;

     lines.forEach((line, index) => {
        const incMatch = line.match(includeRegex);
        if (incMatch) imports.push(incMatch[1]);

        const funcMatch = line.match(funcRegex);
        if (funcMatch) {
            const funcName = funcMatch[1];
             if (!['if', 'for', 'while', 'switch'].includes(funcName)) {
                let braceTrack = (line.match(/\{/g) || []).length;
                let count = 0;
                // scan logic similar to Java
                 let i = index;
                 if(braceTrack === 0) {
                     for (let j = 1; j < 5 && i + j < lines.length; j++) {
                         braceTrack += (lines[i+j].match(/\{/g) || []).length;
                         if (braceTrack > 0) break;
                     }
                 }
                
                if (braceTrack > 0) {
                     for (; i < lines.length; i++) {
                        const l = lines[i];
                        braceTrack += (l.match(/\{/g) || []).length;
                        braceTrack -= (l.match(/\}/g) || []).length;
                        count++;
                        if (braceTrack === 0) break;
                     }
                } else {
                    count = 1;
                }

                functions[funcName] = {
                    line_start: index + 1,
                    line_count: count
                };
            }
        }
    });
    return { functions, imports };
}


export const analyzeFile = (content: string, filename: string): FileAnalysis => {
    const lang = getLanguageFromExtension(filename);
    try {
        switch (lang) {
            case 'javascript':
            case 'typescript':
                return analyzeJsTs(content);
            case 'python':
                return analyzePython(content);
            case 'java':
                return analyzeJava(content);
            case 'c':
            case 'cpp':
                return analyzeC(content);
            default:
                return { functions: {}, imports: [] };
        }
    } catch (e) {
        console.error(`Error analyzing ${filename}`, e);
        return { functions: {}, imports: [] };
    }
};
