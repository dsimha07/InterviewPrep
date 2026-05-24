---
inclusion: manual
---

# Add a New Page

## Overview
Creates a new React page component following the Interview Prep app conventions.

## When to use this skill
- When asked to create a new page or route
- When adding a new screen to the frontend

## Rules
- File location: `frontend/src/pages/PageName.jsx`
- Wrap all content in `<main>` landmark
- First element inside main is `<h1>` with page title
- All colors from `variables.css` tokens — never raw hex values
- All interactive elements must be keyboard navigable
- Every input must have an associated `<label>` via htmlFor/id
- Add component-level JSDoc comment with purpose and author
- Import useNavigate from react-router-dom if navigation needed
- Import useAuth from AuthContext if auth state needed

## Route registration
- Add route in `frontend/src/App.jsx`
- Protected pages go inside `<Route element={<ProtectedRoute />}>`
- Public pages go outside ProtectedRoute

## Template
```jsx
/**
 * PageName — brief description
 * @author Your Name
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/variables.css'

function PageName() {
  const { token, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  return (
    <main>
      <h1>Page Title</h1>
    </main>
  )
}

export default PageName
```