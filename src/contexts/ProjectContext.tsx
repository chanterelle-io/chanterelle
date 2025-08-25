import React, { useState, createContext, useContext, ReactNode } from 'react';

// Define the shape of our project state
export interface ProjectState {
    // Current model being viewed/worked with
    currentProjectName: string | null;
    currentProjectPath: string | null;
}

// Initial state
const initialState: ProjectState = {
    currentProjectName: null,
    currentProjectPath: null
};

// Context actions/methods that components can use
export interface ProjectContextValue {
    // state: ProjectState;
    projectPath: string | null;
    setProjectPath: (projectPath: string) => void;
}

// Create the context
const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

// Provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [projectState, setProjectState] = useState<ProjectState>(initialState);
    
    const setProjectPath = (projectPath: string) => {
        setProjectState((prevState) => ({ ...prevState, currentProjectPath: projectPath }));
    };

    const contextValue: ProjectContextValue = {
        projectPath: projectState.currentProjectPath,
        setProjectPath
    };

    return (
        <ProjectContext.Provider value={contextValue}>
            {children}
        </ProjectContext.Provider>
    );
};

// Custom hook to use the project context
export const useProjectContext = (): ProjectContextValue => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

// Export the context for advanced use cases
export { ProjectContext };
