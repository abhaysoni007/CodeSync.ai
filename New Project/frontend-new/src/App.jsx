import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './context/UserContext';
import { AIProvider } from './context/AIContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectRoom from './pages/ProjectRoom';
import Profile from './pages/Profile';

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute';

// Landing Page
import LandingPage from './LandingPage';

function App() {
  return (
    <UserProvider>
      <AIProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="app">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute>
                  <ProjectRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#2d2d30',
                color: '#cccccc',
                border: '1px solid #3c3c3c',
              },
              success: {
                iconTheme: {
                  primary: '#89d185',
                  secondary: '#1e1e1e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f48771',
                  secondary: '#1e1e1e',
                },
              },
            }}
          />
        </div>
      </Router>
      </AIProvider>
    </UserProvider>
  );
}

export default App;
