import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router';
import './App.css';
import { FirstTimeSetup } from './components/FirstTimeSetup';
import ModelsCatalog from './pages/ModelsCatalog/ModelsCatalog';
import ModelPage from './pages/ModelPage/ModelPage';
import { Settings } from './pages/Settings/Settings';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsService } from './services/Settings';
import TitleBar from './components/layout/TitleBar';

const App: React.FC = () => {
  const [isFirstTimeSetupComplete, setIsFirstTimeSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settings = await SettingsService.getSettings();
        // If settings exist and projects_directory is set, skip first-time setup
        if (settings && settings.projects_directory && settings.projects_directory.trim() !== '') {
          setIsFirstTimeSetupComplete(true);
        }
      } catch (error) {
        console.log('No settings found, showing first-time setup');
        // If settings don't exist or there's an error, show first-time setup
        setIsFirstTimeSetupComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSettings();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen bg-sky-100 dark:bg-slate-900 transition-colors">
            <TitleBar />
            <div className="flex-1 flex items-center justify-center pt-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading...</p>
              </div>
            </div>
          </div>
        </NotificationProvider>
      </ThemeProvider>
    );
  }

  if (!isFirstTimeSetupComplete) {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen bg-sky-100 dark:bg-slate-900 transition-colors">
            <TitleBar />
            <main className="flex-grow pt-8">
              <FirstTimeSetup
                onComplete={() => {
                  console.log('First-time setup completed');
                  setIsFirstTimeSetupComplete(true);
                }}
              />
            </main>
          </div>
        </NotificationProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <ProjectProvider>
          <Router>
            <div className="flex flex-col min-h-screen bg-sky-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
              <TitleBar />
              <main className="flex-grow pt-8">
                <Routes>
                  <Route path="/" element={<ModelsCatalog />} />
                  <Route path="/model/:modelId" element={<ModelPage />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
              {/* <Footer /> */}
            </div>
          </Router>
        </ProjectProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;