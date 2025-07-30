import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router';
import './App.css';
import { FirstTimeSetup } from './components/FirstTimeSetup';
import ModelsCatalog from './pages/ModelsCatalog/ModelsCatalog';
import ModelPage from './pages/ModelPage/ModelPage';
import { Settings } from './pages/Settings/Settings';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsService } from './services/api';

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
      <NotificationProvider>
        <div className="flex flex-col min-h-screen bg-sky-100 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </NotificationProvider>
    );
  }

  if (!isFirstTimeSetupComplete) {
    return (
      <NotificationProvider>
        <div className="flex flex-col min-h-screen bg-sky-100">
          <main className="flex-grow">
            <FirstTimeSetup
              onComplete={() => {
                console.log('First-time setup completed');
                setIsFirstTimeSetupComplete(true);
              }}
            />
          </main>
        </div>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-sky-100">
          {/* <Header /> */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<ModelsCatalog />} />
              <Route
                path="/model/:modelId"
                element={<ModelPage />}
              />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          {/* <Footer /> */}
        </div>
      </Router>
    </NotificationProvider>
  );
};

export default App;