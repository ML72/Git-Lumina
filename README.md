# Git Lumina

Git-Lumina is a powerful **Repository Visualizer** designed to help developers understand codebases quickly and intuitively.

By uploading a codebase (via a ZIP file or a GitHub URL), users generate an interactive graph where:
- **Nodes** represent files.
- **Edges** represent connections (imports, references, function calls).

This visualization allows users to explore the architecture of a project, identify dependencies, and click into individual nodes to uncover detailed information about how specific files are utilized within the system.

Visit our deployement on GitHub pages [here](https://ml72.github.io/Git-Lumina/).

## Features

- **Codebase Ingestion**: Support for uploading local ZIP files or fetching directly from GitHub repositories.
- **Interactive Graph**: A dynamic visualization engine (powered by Reagraph) that maps out file relationships.
- **Deep Dive Analysis**: Click on any file node to view its specific details, dependencies, and usages.
- **Smart Parsing**: Automatically categorizes files and constructs the dependency graph based on language syntax and import statements.

## Tech Stack

This project is built with a modern web development stack:

- **Frontend**: React (v19) with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit (with Redux Persist)
- **UI Framework**: Material UI (MUI)
- **Visualization**: Reagraph (WebGL-based graph visualization)
- **Utilities**: JSZip for file handling
- **Experimental**: MediaPipe integration for gesture-based controls.

## Getting Started

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Start the development server**:

    ```bash
    npm run dev
    ```

3. **Open the application**:
   Navigate to `http://localhost:5173` in your browser.

## Usage

1. **Landing Page**: Choose to upload a `.zip` file of your source code or provide a public GitHub repository URL.
2. **Analysis**: The application will parse the file structure and contents.
3. **Exploration**: Use the graph view to navigate through the codebase. Click nodes to focus on files and inspect their relationships.

## Team

Made with 🍵 by Erica, Max, Sahiba, and Michael. Contributions are welcome.
