import chanterelleLogo from '../../assets/chanterelle.png';
import { useTheme } from '../../contexts/ThemeContext';

// Not used
// Modern Header Component - designed to work with custom title bar
const ModernHeader = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-slate-700 transition-colors">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img
                            src={chanterelleLogo}
                            alt="Chanterelle Logo"
                            className="h-8 w-8 object-contain"
                        />
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                Chanterelle
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                ML Model Catalog
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Search bar could go here */}
                        <div className="hidden md:block">
                            <input
                                type="text"
                                placeholder="Search models..."
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            />
                        </div>
                        
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Toggle light/dark mode"
                        >
                            {theme === 'light' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default ModernHeader;