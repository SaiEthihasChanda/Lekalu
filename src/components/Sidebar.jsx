import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, CheckSquare, Settings, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { logoutUser } from '../fb/index.js';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  return (
    <aside className="w-64 bg-secondary border-r border-gray-700 h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-accent flex items-center gap-2">
          <TrendingUp size={28} />
          Lekalu
        </h1>
        <p className="text-xs text-gray-400 mt-1">Expense Tracker</p>
      </div>

      <nav className="mt-8 px-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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
      <div className="p-4 border-t border-gray-700">
        <div className="mb-4 px-2">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="text-sm text-white truncate font-medium">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
