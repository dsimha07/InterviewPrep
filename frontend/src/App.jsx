/**
 * App.jsx
 *
 * Root component that defines the client-side route tree using
 * React Router v6. No Vite starter boilerplate — this file is
 * purely routing configuration.
 *
 * Routes:
 *   /              → redirect to /login
 *   /login         → LoginPage
 *   /signup        → SignupPage
 *   /profile-info  → ProfilePage   (protected — requires authentication)
 *   /interview     → InterviewPage (protected — requires authentication)
 *
 * <BrowserRouter> and <AuthProvider> are provided by main.jsx so
 * that this component stays focused on routing only.
 *
 * Requirements: 2.4, 7.2, 7.3
 *
 * @author profile-info spec
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import InterviewPage from './pages/InterviewPage';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * App — defines the application route tree.
 *
 * ProtectedRoute wraps the protected routes and redirects
 * unauthenticated users to /login via React Router's <Outlet>.
 */
function App() {
  return (
    <Routes>
      {/* Default redirect: / → /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes — ProtectedRoute guards the nested <Outlet> */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile-info" element={<ProfilePage />} />
        <Route path="/interview" element={<InterviewPage />} />
      </Route>
    </Routes>
  );
}

export default App;
