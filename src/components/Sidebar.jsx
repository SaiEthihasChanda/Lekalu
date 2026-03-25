import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, CheckSquare, Settings, Activity, LogOut, Menu, X, HelpCircle, Sliders } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOnboarding } from '../contexts/OnboardingContext.jsx';
import { logoutUser } from '../fb/index.js';
import { SettingsModal } from './SettingsModal.jsx';

export const Sidebar = ({ isOpen, onClose, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTour } = useOnboarding();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Activity', icon: Activity },
    { path: '/trackables', label: 'Trackables', icon: Settings },
    { path: '/tracker', label: 'Tracker', icon: CheckSquare },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavClick = () => {
    onClose();
  };

  const handleDataCleared = () => {
    // Data will be reloaded when page refreshes
    handleNavClick();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 p-2 hover:bg-gray-700 rounded-lg"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="tour-sidebar"
        className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-secondary border-r border-gray-700 
        flex flex-col z-40 transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6 pt-16 md:pt-6">
          <h1 className="text-xl md:text-2xl font-bold text-accent flex items-center gap-2">
            <TrendingUp size={24} />
            <span>Lekalu</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Expense Tracker</p>
        </div>

        <nav className="mt-4 md:mt-8 px-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm md:text-base ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="mb-4 px-2 min-w-0">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm text-white truncate font-medium">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              handleNavClick();
              startTour();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm md:text-base"
            title="Start guided tour"
          >
            <HelpCircle size={20} />
            <span>Help & Tour</span>
          </button>
          <button
            onClick={() => {
              handleNavClick();
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm md:text-base"
            title="Open settings"
          >
            <Sliders size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              handleNavClick();
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm md:text-base"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataCleared={handleDataCleared}
      />
    </>
  );
};
