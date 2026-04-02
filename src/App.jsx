import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { MobileTopBar } from './components/MobileTopBar.jsx';
import { Tour } from './components/Tour.jsx';
import { PostLoginBiometricVerification } from './components/PostLoginBiometricVerification.jsx';
import { isMobileDevice } from './utils/webauthn.js';
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
  const { user, isBiometricVerified, setIsBiometricVerified } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showTour, tourCompleted, startTour } = useOnboarding();
  const verificationTimeoutRef = useRef(null); // Track verification timing

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

  // Reset biometric verification when app loses focus (tab switch, window minimize, another app)
  useEffect(() => {
    if (!user) return;

    // Handle tab/window visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[AppContent] App visibility hidden, not resetting biometric yet');
      } else {
        console.log('[AppContent] App became visible again, requiring biometric re-verification');
        // Set a flag to prevent immediate re-verification within 500ms
        if (verificationTimeoutRef.current) {
          clearTimeout(verificationTimeoutRef.current);
        }
        verificationTimeoutRef.current = setTimeout(() => {
          setIsBiometricVerified(false);
          sessionStorage.removeItem('biometricVerified');
        }, 500);
      }
    };

    // Handle window blur (switching apps or windows)
    const handleWindowBlur = () => {
      console.log('[AppContent] Window lost focus');
    };

    // Handle window focus (returning to app)
    const handleWindowFocus = () => {
      console.log('[AppContent] Window regained focus, requiring biometric re-verification');
      // Set a flag to prevent immediate re-verification within 500ms
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      verificationTimeoutRef.current = setTimeout(() => {
        setIsBiometricVerified(false);
        sessionStorage.removeItem('biometricVerified');
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, [user, setIsBiometricVerified]);

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('[AppContent] User logged in:', user.uid);
      console.log('[AppContent] isBiometricVerified:', isBiometricVerified);
      console.log('[AppContent] isMobileDevice():', isMobileDevice());
      console.log('[AppContent] Should show biometric screen:', !isBiometricVerified && isMobileDevice());
    }
  }, [user, isBiometricVerified]);

  // If user is logged in, show the main app with sidebar
  if (user) {
    // Show biometric lock screen if not verified (mobile only)
    if (!isBiometricVerified && isMobileDevice()) {
      console.log('[AppContent] Rendering biometric verification screen');
      return <PostLoginBiometricVerification onVerificationSuccess={() => {
        console.log('[AppContent] onVerificationSuccess called, setting isBiometricVerified to true');
        setIsBiometricVerified(true);
      }} />;
    }

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
