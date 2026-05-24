/**
 * InterviewPage.jsx
 *
 * Placeholder page for the interview section of the Interview Prep app.
 * Rendered at /interview (protected route — auth guarding is handled
 * entirely by ProtectedRoute; no auth logic lives here).
 *
 * Renders a <main> landmark containing an <h1> that confirms the user
 * has reached the interview section.
 *
 * All colors reference variables.css tokens — no raw hex values.
 * Semantic HTML: <main>, <h1>.
 *
 * Requirements: 7.1
 *
 * @author profile-info spec
 */

import '../styles/variables.css';

/**
 * InterviewPage — confirms the user has reached the interview section.
 *
 * This is a placeholder page. Auth guarding is delegated to ProtectedRoute,
 * which wraps this route in App.jsx and redirects unauthenticated users to
 * /login before this component ever renders.
 */
function InterviewPage() {
  return (
    <main className="interview-page" style={styles.page}>
      <h1 style={styles.heading}>Welcome to Your Interview</h1>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline styles — all color values reference CSS variable tokens (Req 7.1)
// ---------------------------------------------------------------------------

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
    padding: '2rem 1rem',
  },
  heading: {
    color: 'var(--color-primary)',
    textAlign: 'center',
  },
};

export default InterviewPage;
