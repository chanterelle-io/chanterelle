import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router';
import './App.css';
import { FirstTimeSetup } from './components/FirstTimeSetup';
import ModelsCatalog from './pages/ModelsCatalog/ModelsCatalog';
import ModelPage from './pages/ModelPage/ModelPage';
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage';
import InteractivePage from './pages/InteractivePage/InteractivePage';
import { Settings } from './pages/Settings/Settings';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsService } from './services/Settings';
import TitleBar from './components/layout/TitleBar';

const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollEl = document.getElementById('app-scroll-container');
    scrollEl?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

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
          <div className="flex flex-col h-full bg-sky-100 dark:bg-slate-900 transition-colors overflow-hidden">
            <TitleBar />
            <main className="flex-1 min-h-0 overflow-auto pt-8" id="app-scroll-container">
              <div className="min-h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </NotificationProvider>
      </ThemeProvider>
    );
  }

  if (!isFirstTimeSetupComplete) {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <div className="flex flex-col h-full bg-sky-100 dark:bg-slate-900 transition-colors overflow-hidden">
            <TitleBar />
            <main className="flex-1 min-h-0 overflow-auto pt-8" id="app-scroll-container">
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
            <ScrollToTop />
            <div className="flex flex-col h-full bg-sky-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
              <TitleBar />
              <main className="flex-1 min-h-0 overflow-auto" id="app-scroll-container">
                <Routes>
                  <Route path="/" element={<ModelsCatalog />} />
                  <Route path="/model/:modelId" element={<ModelPage />} />
                  <Route path="/analytics/:projectId" element={<AnalyticsPage />} />
                  <Route path="/interactive/:modelId" element={<InteractivePage />} />
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