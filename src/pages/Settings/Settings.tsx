// src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { SettingsService, type Settings as SettingsType } from '../../services/Settings';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotificationContext();
  const [settings, setSettings] = useState<SettingsType>({ projects_directory: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await SettingsService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const selectProjectsDirectory = async () => {
    try {
      const selectedPath = await SettingsService.openDirectoryDialog();
      if (selectedPath) {
        setSettings({ ...settings, projects_directory: selectedPath });
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await SettingsService.saveSettings(settings);
      showSuccess('Settings saved successfully!');
      // Redirect to Models Catalog after successful save and brief delay
      setTimeout(() => navigate('/'), 100);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-bold font-mono text-blue-950">Settings</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projects Directory:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.projects_directory}
                readOnly
                placeholder="Select a directory for your projects"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={selectProjectsDirectory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Browse...
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveSettings}
              disabled={loading || !settings.projects_directory}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
              title="Cancel and return to Models Catalog"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};