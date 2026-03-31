import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { MobileTopBar } from './components/MobileTopBar.jsx';
import { Tour } from './components/Tour.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { TrackablesPage } from './pages/TrackablesPage.jsx';
import { TrackerPage } from './pages/TrackerPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

/**
 * Private route component that checks authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to render if authenticated
 * @returns {JSX.Element}
 */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

function AppContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showTour, tourCompleted, startTour } = useOnboarding();

  // Start tour automatically on first login
  useEffect(() => {
    if (user && !tourCompleted && !showTour) {
      const hasStartedBefore = localStorage.getItem('lekalu_user_logged_in') === 'true';
      if (!hasStartedBefore) {
        localStorage.setItem('lekalu_user_logged_in', 'true');
        const timer = setTimeout(() => {
          startTour();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, tourCompleted, showTour, startTour]);

  // If user is logged in, show the main app with sidebar
  if (user) {
    return (
      <>
        <Tour />
        <MobileTopBar isMenuOpen={sidebarOpen} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-col md:flex-row h-screen bg-primary">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} withTopBar={true} />
          <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
            <Routes>
              <Route path="/" element={<ActivityPage />} />
              <Route path="/trackables" element={<TrackablesPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </>
    );
  }

  // If user is not logged in, show auth pages
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <OnboardingProvider>
          <AppContent />
        </OnboardingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
