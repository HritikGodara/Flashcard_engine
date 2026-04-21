import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import DeckPage from './pages/DeckPage';
import StudyPage from './pages/StudyPage';
import DashboardPage from './pages/DashboardPage';
import './styles/design-system.css';
import './styles/components.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)',
      }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          ⚡
        </div>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navbar />
            <main style={{ flex: 1, paddingBottom: 'var(--space-12)' }}>
              <HomePage />
            </main>
          </ProtectedRoute>
        }
      />
      <Route
        path="/deck/:id"
        element={
          <ProtectedRoute>
            <Navbar />
            <main style={{ flex: 1, paddingBottom: 'var(--space-12)' }}>
              <DeckPage />
            </main>
          </ProtectedRoute>
        }
      />
      <Route
        path="/study/:id"
        element={
          <ProtectedRoute>
            <main style={{ flex: 1, paddingBottom: 'var(--space-12)' }}>
              <StudyPage />
            </main>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navbar />
            <main style={{ flex: 1, paddingBottom: 'var(--space-12)' }}>
              <DashboardPage />
            </main>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
