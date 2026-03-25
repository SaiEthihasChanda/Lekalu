import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ActivityPage } from './pages/ActivityPage';
import { TrackablesPage } from './pages/TrackablesPage';
import { TrackerPage } from './pages/TrackerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-primary">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<ActivityPage />} />
            <Route path="/trackables" element={<TrackablesPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
