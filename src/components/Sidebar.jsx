import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CheckSquare, Settings, Activity, LogOut, HelpCircle, Sliders, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOnboarding } from '../contexts/OnboardingContext.jsx';
import { logoutUser } from '../fb/index.js';
import { SettingsModal } from './SettingsModal.jsx';

export const Sidebar = ({ isOpen, onClose, onToggle, withTopBar }) => {
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
        ${withTopBar ? 'pt-16 md:pt-0' : 'pt-0'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="/lekalu-logo.svg" alt="Lekalu" className="w-10 h-10" />
            <h1 className="text-xl md:text-2xl font-bold text-white">Lekalu</h1>
          </div>
          <p className="text-xs text-gray-400">Personal Finance, Simplified</p>
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
          <div className="mb-4 px-2 min-w-0 flex items-center gap-3">
            <div className="flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-accent object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-gray-600 bg-primary flex items-center justify-center">
                  <User size={20} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400">Logged in as</p>
              <p className="text-sm text-white truncate font-medium">{user?.email}</p>
            </div>
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
