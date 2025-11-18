// src/components/FirstTimeSetup.tsx
import React from 'react';
import { SettingsService } from '../services/Settings';

export const FirstTimeSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const handleSelectDirectory = async () => {
    try {
      const path = await SettingsService.openDirectoryDialog();
      if (path) {
        console.log('Selected directory:', path);
        await SettingsService.setProjectsDirectory(path);
        onComplete();
      }
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          {/* <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div> */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Welcome to Chanterelle!</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Get started by selecting a directory where you want to store your ML projects and data.
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={handleSelectDirectory}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Select Projects Directory</span>
            </div>
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can change this directory later in settings
          </p>
        </div>
      </div>
    </div>
  );
};