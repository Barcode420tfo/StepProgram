import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { canViewExecutiveWorkspace, getBootstrapIdentity, getPortfolioForUser, normalizeRole, ROLE_LABELS, ROLES } from '../config/accessControl';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState({});
  const [role, setRole] = useState(ROLES.UNASSIGNED);
  const [previewRole, setPreviewRoleState] = useState(() => import.meta.env.DEV ? (localStorage.getItem('step-preview-role') || ROLES.ADMIN) : null);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdTokenResult();
          const bootstrapIdentity = getBootstrapIdentity(firebaseUser.uid);
          const tokenClaims = {
            ...(bootstrapIdentity?.profileName ? { profile_name: bootstrapIdentity.profileName } : {}),
            ...(token.claims || {}),
          };
          setClaims(tokenClaims);
          setRole(normalizeRole(tokenClaims.role || tokenClaims.user_role || bootstrapIdentity?.role));
        } catch {
          setClaims({});
          setRole(ROLES.UNASSIGNED);
        }
      } else {
        setClaims({});
        setRole(ROLES.UNASSIGNED);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
      setUser({ ...result.user, displayName });
    }
    return result;
  };

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signOut = () => firebaseSignOut(auth);

  const effectiveRole = import.meta.env.DEV && previewRole ? previewRole : role;
  const setPreviewRole = (nextRole) => {
    if (!import.meta.env.DEV) return;
    const normalized = normalizeRole(nextRole);
    localStorage.setItem('step-preview-role', normalized);
    setPreviewRoleState(normalized);
  };
  const profile = {
    role: effectiveRole,
    roleLabel: ROLE_LABELS[effectiveRole],
    portfolio: getPortfolioForUser(effectiveRole, user, claims),
    canViewExecutiveWorkspace: canViewExecutiveWorkspace(user?.uid),
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, role: effectiveRole, claims, profile, previewRole, setPreviewRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
