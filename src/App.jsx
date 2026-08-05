import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './pages/Dashboard';
import { isFirebaseConfigured } from './lib/firebase';
import { ROLES } from './config/accessControl';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function PendingAccess() {
  const { user, signOut } = useAuth();
  return (
    <div className="auth-page">
      <div className="auth-card pending-access-card">
        <img src="/logo.svg" alt="STEP Network" className="pending-access-logo" />
        <div className="role-eyebrow">Account created</div>
        <div className="auth-title">Your access is pending</div>
        <div className="auth-sub">An Administrator must assign your STEP role and reporting scope before operational data becomes available.</div>
        <div className="pending-access-email">{user?.email}</div>
        <button className="auth-btn" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}

function AuthorizedWorkspace() {
  const { role } = useAuth();
  if (role === ROLES.UNASSIGNED) return <PendingAccess />;
  return <DataProvider><Dashboard /></DataProvider>;
}

function FirebaseSetupScreen() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo">
            <svg viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
          </div>
          <span className="nav-title">STEP Network Live Ops</span>
        </div>
        <div className="auth-title">Firebase setup required</div>
        <div className="auth-sub" style={{ marginBottom: '18px' }}>
          Create a <code style={{ background: '#f1f3f4', padding: '1px 5px', borderRadius: '3px', fontSize: '12px' }}>.env</code> file in the project root with your Firebase credentials.
        </div>
        <pre style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', padding: '12px', fontSize: '11px', lineHeight: '1.7', overflowX: 'auto' }}>{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}</pre>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '16px', lineHeight: '1.7' }}>
          <b>Steps:</b><br />
          1. Go to <b>console.firebase.google.com</b><br />
          2. Create a project → Add a Web app<br />
          3. Copy the <code style={{ background: '#f1f3f4', padding: '1px 4px', borderRadius: '3px' }}>firebaseConfig</code> values above<br />
          4. Enable <b>Email/Password</b> in Authentication → Sign-in method<br />
          5. Restart the dev server after saving <code style={{ background: '#f1f3f4', padding: '1px 4px', borderRadius: '3px' }}>.env</code>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!isFirebaseConfigured) return <FirebaseSetupScreen />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/signin"
            element={<PublicRoute><SignIn /></PublicRoute>}
          />
          <Route
            path="/signup"
            element={<PublicRoute><SignUp /></PublicRoute>}
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthorizedWorkspace />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
