import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import './styles/variables.css'
import './index.css'
import App from './App.jsx'

/**
 * Application entry point.
 *
 * Wrapping order (outermost → innermost):
 *   BrowserRouter  — provides routing context to the entire tree
 *   AuthProvider   — provides authentication state to all routes
 *   App            — root component containing route definitions
 *
 * CSS import order:
 *   variables.css  — brand color tokens must load before component styles
 *   index.css      — global base styles
 *
 * @author basic-auth spec
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
