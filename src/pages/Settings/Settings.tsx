// Clean implementation using ThemeContext (preference + system handling) and project directory management.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { SettingsService, type Settings as SettingsType } from '../../services/Settings';
import { useTheme } from '../../contexts/ThemeContext';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotificationContext();
  const [settings, setSettings] = useState<SettingsType>({ projects_directory: '' });
  const [loading, setLoading] = useState(false);
  const { preference, setPreference } = useTheme();

  useEffect(() => {
    // Scroll to top when navigating to this page
    window.scrollTo(0, 0);
    
    (async () => {
      try {
        const currentSettings = await SettingsService.getSettings();
        setSettings(currentSettings);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    })();
  }, []);

  const selectProjectsDirectory = async () => {
    try {
      const selectedPath = await SettingsService.openDirectoryDialog();
      if (selectedPath) {
        setSettings((prev: SettingsType) => ({ ...prev, projects_directory: selectedPath }));
      }
    } catch (err) {
      console.error('Failed to open directory dialog', err);
      showError('Could not open directory dialog');
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await SettingsService.saveSettings(settings);
      showSuccess('Settings saved successfully');
      setTimeout(() => navigate('/'), 120);
    } catch (err) {
      console.error('Save failed', err);
      showError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-slate-900 transition-colors">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-bold font-mono text-blue-950 dark:text-slate-100">Settings</h1>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 transition-colors">
          {/* Appearance / Theme */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Appearance</h2>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</legend>
                <div className="flex flex-wrap gap-4">
                  {['light','dark','system'].map(value => (
                    <label key={value} className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="theme"
                        value={value}
                        checked={preference === value}
                        onChange={() => setPreference(value as any)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{value}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 max-w-md">System mode follows your OS preference automatically.</p>
              </fieldset>
            </div>
            {/* Projects directory */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Projects Directory:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.projects_directory}
                  readOnly
                  placeholder="Select a directory for your projects"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={selectProjectsDirectory} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200">Browse...</button>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                disabled={loading || !settings.projects_directory}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-400 transition-colors duration-200"
              >Cancel</button>
            </div>
        </div>
      </main>
    </div>
  );
};