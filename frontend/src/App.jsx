/**
 * App.jsx
 *
 * Root component that defines the client-side route tree using
 * React Router v6. No Vite starter boilerplate — this file is
 * purely routing configuration.
 *
 * Routes:
 *   /          → redirect to /login
 *   /login     → LoginPage
 *   /signup    → SignupPage
 *   /profile   → ProfilePage  (protected — requires authentication)
 *
 * <BrowserRouter> and <AuthProvider> are provided by main.jsx so
 * that this component stays focused on routing only.
 *
 * Requirements: 6.1, 6.2
 *
 * @author basic-auth spec
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * App — defines the application route tree.
 *
 * ProtectedRoute wraps the /profile route and redirects
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
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
