/**
 * ProfilePage.jsx
 *
 * Profile info form page for the Interview Prep app.
 * Rendered at /profile-info (protected route).
 *
 * On mount:
 *   - If unauthenticated, redirects to /login (handled by ProtectedRoute, but
 *     also guarded here for belt-and-suspenders safety).
 *   - Calls getProfile(token) to check whether the user already has a profile.
 *     - 200 → redirect to /interview (replace) — skip the form entirely.
 *     - 404 → render the form.
 *     - Other error → fall through to the form with a console warning.
 *
 * The `isCheckingProfile` flag prevents the form from flashing before the
 * profile check completes. While true, the component renders nothing.
 *
 * Form fields:
 *   - Full name (text input, maxLength 100)
 *   - Job role (select, 8 options)
 *   - Experience level (select, 4 options)
 *
 * Client-side validation runs on submit before any API call.
 * On successful save (201), navigates to /interview.
 * On API error, displays err.message above the submit button.
 *
 * All colors reference variables.css tokens — no raw hex values.
 * Semantic HTML: <main>, <form>, <label>, <button>.
 * All interactive elements are keyboard navigable with visible focus indicators.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 1.12, 1.13, 1.14, 2.4, 2.5
 *
 * @author profile-info spec
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveProfile, getProfile } from '../services/profileService';
import '../styles/variables.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The eight permitted Job_Role values, in the required display order.
 * Requirement 1.2
 */
const JOB_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'UI/UX Designer',
  'Product Manager',
  'QA Engineer',
];

/**
 * The four permitted Experience_Level values, in the required display order.
 * Requirement 1.3
 */
const EXPERIENCE_LEVELS = ['Fresher', 'Junior', 'Mid-Level', 'Senior'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProfilePage — collects the user's full name, job role, and experience level.
 *
 * Checks for an existing profile on mount and redirects to /interview if one
 * is found. Renders the form only when no profile exists (404 from the API).
 */
function ProfilePage() {
  // Form field state
  const [fullName, setFullName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  // Per-field inline validation errors
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    jobRole: '',
    experienceLevel: '',
  });

  // API-level error displayed above the submit button
  const [apiError, setApiError] = useState('');

  // True while the POST /api/profile request is in-flight
  const [isLoading, setIsLoading] = useState(false);

  // True while the initial GET /api/profile check is running.
  // Prevents the form from flashing before we know whether to redirect.
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Mount effect — check for existing profile
  // ---------------------------------------------------------------------------

  useEffect(() => {
    /**
     * Checks whether the authenticated user already has a profile.
     * - If unauthenticated: redirect to /login.
     * - If profile found (200): redirect to /interview.
     * - If no profile (404): render the form.
     * - Any other error: fall through to the form with a console warning.
     */
    async function checkExistingProfile() {
      // Guard: ProtectedRoute handles this, but we double-check here.
      if (!isAuthenticated || !token) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        await getProfile(token);
        // 200 — profile already exists; skip the form.
        navigate('/interview', { replace: true });
      } catch (err) {
        if (err && err.status === 404) {
          // No profile yet — render the form.
          setIsCheckingProfile(false);
        } else {
          // Unexpected error — fall through to the form as a safe fallback.
          console.warn(
            `[${new Date().toISOString()}] [warning] [ProfilePage] ` +
              `Unexpected error during profile check (status ${err?.status}): ${err?.message}`,
          );
          setIsCheckingProfile(false);
        }
      }
    }

    checkExistingProfile();
  }, [isAuthenticated, token, navigate]);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Validates all form fields and populates fieldErrors state.
   * Returns true if all fields are valid, false otherwise.
   * Does NOT call the API — pure client-side check.
   *
   * @returns {boolean} Whether the form is valid.
   */
  function validateFields() {
    const errors = { fullName: '', jobRole: '', experienceLevel: '' };
    let isValid = true;

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
      isValid = false;
    }

    if (!jobRole) {
      errors.jobRole = 'Please select a job role.';
      isValid = false;
    }

    if (!experienceLevel) {
      errors.experienceLevel = 'Please select an experience level.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  }

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  /**
   * Handles form submission.
   * Runs client-side validation first; if valid, calls saveProfile().
   * On 201 success, navigates to /interview.
   * On error, displays err.message in the API error area and re-enables the button.
   *
   * @param {React.FormEvent<HTMLFormElement>} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    // Clear any previous API error before re-validating.
    setApiError('');

    // Client-side validation — abort if invalid.
    if (!validateFields()) {
      return;
    }

    setIsLoading(true);

    try {
      await saveProfile(
        {
          full_name: fullName.trim(),
          job_role: jobRole,
          experience_level: experienceLevel,
        },
        token,
      );

      // 201 — profile saved; navigate to the interview page.
      navigate('/interview');
    } catch (err) {
      // Display the error message and re-enable the submit button.
      setApiError(err && err.message ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render — loading guard
  // ---------------------------------------------------------------------------

  // While the profile check is in progress, render nothing to prevent form flash.
  if (isCheckingProfile) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render — form
  // ---------------------------------------------------------------------------

  return (
    <main className="profile-page" style={styles.page}>
      <div className="profile-card" style={styles.card}>
        <h1 style={styles.heading}>Set Up Your Profile</h1>
        <p style={styles.subheading}>
          Tell us about yourself so we can tailor your interview questions.
        </p>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* ----------------------------------------------------------------
              API error area — displayed above the submit button (Req 1.9)
          ---------------------------------------------------------------- */}
          {apiError && (
            <p
              role="alert"
              aria-live="polite"
              className="profile-api-error"
              style={styles.apiError}
              data-testid="api-error"
            >
              {apiError}
            </p>
          )}

          {/* ----------------------------------------------------------------
              Full Name field (Req 1.1, 1.14)
          ---------------------------------------------------------------- */}
          <div style={styles.fieldGroup}>
            <label htmlFor="full-name" style={styles.label}>
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              name="fullName"
              value={fullName}
              maxLength={100}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              aria-describedby={fieldErrors.fullName ? 'full-name-error' : undefined}
              aria-invalid={!!fieldErrors.fullName}
              style={styles.input}
              data-testid="input-full-name"
            />
            {fieldErrors.fullName && (
              <span
                id="full-name-error"
                role="alert"
                className="field-error"
                style={styles.fieldError}
                data-testid="error-full-name"
              >
                {fieldErrors.fullName}
              </span>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Job Role field (Req 1.2, 1.14)
          ---------------------------------------------------------------- */}
          <div style={styles.fieldGroup}>
            <label htmlFor="job-role" style={styles.label}>
              Job Role
            </label>
            <select
              id="job-role"
              name="jobRole"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              aria-describedby={fieldErrors.jobRole ? 'job-role-error' : undefined}
              aria-invalid={!!fieldErrors.jobRole}
              style={styles.select}
              data-testid="select-job-role"
            >
              <option value="">— Select a job role —</option>
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {fieldErrors.jobRole && (
              <span
                id="job-role-error"
                role="alert"
                className="field-error"
                style={styles.fieldError}
                data-testid="error-job-role"
              >
                {fieldErrors.jobRole}
              </span>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Experience Level field (Req 1.3, 1.14)
          ---------------------------------------------------------------- */}
          <div style={styles.fieldGroup}>
            <label htmlFor="experience-level" style={styles.label}>
              Experience Level
            </label>
            <select
              id="experience-level"
              name="experienceLevel"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              aria-describedby={fieldErrors.experienceLevel ? 'experience-level-error' : undefined}
              aria-invalid={!!fieldErrors.experienceLevel}
              style={styles.select}
              data-testid="select-experience-level"
            >
              <option value="">— Select an experience level —</option>
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            {fieldErrors.experienceLevel && (
              <span
                id="experience-level-error"
                role="alert"
                className="field-error"
                style={styles.fieldError}
                data-testid="error-experience-level"
              >
                {fieldErrors.experienceLevel}
              </span>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Submit button — disabled and shows loading text in-flight (Req 1.8)
          ---------------------------------------------------------------- */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            data-testid="submit-button"
          >
            {isLoading ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline styles — all color values reference CSS variable tokens (Req 1.12)
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '2rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    color: 'var(--color-primary)',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  subheading: {
    color: 'var(--color-text-gray)',
    fontSize: '0.95rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  apiError: {
    color: 'var(--color-accent-orange)',
    backgroundColor: 'var(--color-bg-light-blue)',
    border: '1px solid var(--color-accent-orange)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    margin: 0,
    fontSize: '0.9rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    color: 'var(--color-text)',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  input: {
    border: '1px solid var(--color-text-mid-gray)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    color: 'var(--color-text)',
    backgroundColor: '#ffffff',
    // Visible focus indicator (Req 1.13)
    outline: '2px solid transparent',
    outlineOffset: '2px',
  },
  select: {
    border: '1px solid var(--color-text-mid-gray)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    color: 'var(--color-text)',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    // Visible focus indicator (Req 1.13)
    outline: '2px solid transparent',
    outlineOffset: '2px',
  },
  fieldError: {
    color: 'var(--color-accent-orange)',
    fontSize: '0.85rem',
    marginTop: '0.1rem',
  },
  button: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.25rem',
    // Visible focus indicator (Req 1.13)
    outline: '2px solid transparent',
    outlineOffset: '2px',
  },
  buttonDisabled: {
    backgroundColor: 'var(--color-text-mid-gray)',
    cursor: 'not-allowed',
  },
};

export default ProfilePage;
