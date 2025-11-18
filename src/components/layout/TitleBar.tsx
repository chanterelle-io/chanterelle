import { getCurrentWindow } from '@tauri-apps/api/window';
import chanterelleLogo from '../../assets/chanterelle.png';
import { useTheme } from '../../contexts/ThemeContext';

const TitleBar = () => {
  const { theme, toggleTheme } = useTheme();

  const handleMinimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
      console.log('Window minimized successfully');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = getCurrentWindow();
      await window.toggleMaximize();
      console.log('Window maximize toggled successfully');
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
      console.log('Window closed successfully');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-8 bg-gradient-to-r from-blue-900 via-blue-900 to-blue-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 select-none"
    >
      {/* Left side - App logo and name - draggable */}
      <div className="flex items-center gap-2 px-3 h-full" data-tauri-drag-region>
        <img
          src={chanterelleLogo}
          alt="Chanterelle Logo"
          className="h-5 w-5 object-contain pointer-events-none"
          data-tauri-drag-region
        />
        <span className="text-white text-sm font-medium pointer-events-none" data-tauri-drag-region>Chanterelle</span>
      </div>

      {/* Center - draggable area */}
      <div className="flex-1 h-full" data-tauri-drag-region></div>

      {/* Right side - Theme toggle and window controls - NOT draggable */}
      <div className="flex items-center h-full">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="px-2 py-1 mx-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30 dark:bg-black/30 dark:hover:bg-black/40 text-white transition-colors"
          title="Toggle light/dark mode"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Window controls */}
        <div className="flex">
          <button
            onClick={handleMinimize}
            className="w-11 h-8 flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors text-white cursor-pointer"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-11 h-8 flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors text-white cursor-pointer"
            title="Maximize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-11 h-8 flex items-center justify-center hover:bg-red-500 active:bg-red-600 transition-colors text-white cursor-pointer"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;