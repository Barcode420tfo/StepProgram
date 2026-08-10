import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { canViewExecutiveWorkspace, getBootstrapIdentity, getPortfolioForUser, isSuperAdmin, normalizeRole, ROLE_LABELS, ROLES } from '../config/accessControl';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState({});
  const [role, setRole] = useState(ROLES.UNASSIGNED);
  const [previewRole, setPreviewRoleState] = useState(() => import.meta.env.DEV ? localStorage.getItem('step-preview-role') : null);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdTokenResult();
          const bootstrapIdentity = getBootstrapIdentity(firebaseUser.uid);
          const tokenClaims = {
            ...(token.claims || {}),
            ...(bootstrapIdentity?.profileName ? { profile_name: bootstrapIdentity.profileName } : {}),
          };
          setClaims(tokenClaims);
          // The UID directory is authoritative for known rollout accounts.
          // A stale or incorrect Firebase custom claim cannot elevate them.
          setRole(normalizeRole(bootstrapIdentity?.role || tokenClaims.role || tokenClaims.user_role));
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

  // Role preview is an executive-admin tool only. It must never override the
  // real role of a Growth Partner, Supervisor, or Sales Agent—even locally.
  const canPreviewRoles = import.meta.env.DEV && role === ROLES.ADMIN && canViewExecutiveWorkspace(user?.uid);
  const effectiveRole = canPreviewRoles && previewRole ? previewRole : role;
  const setPreviewRole = (nextRole) => {
    if (!canPreviewRoles) return;
    const normalized = normalizeRole(nextRole);
    localStorage.setItem('step-preview-role', normalized);
    setPreviewRoleState(normalized);
  };
  const portfolio = getPortfolioForUser(effectiveRole, user, claims);
  const isGrowthPartnerSupervisor = effectiveRole === ROLES.GROWTH_PARTNER && Boolean(portfolio?.agent);
  const profile = {
    role: effectiveRole,
    roleLabel: isSuperAdmin(user?.uid) ? 'Super Admin' : isGrowthPartnerSupervisor ? 'Growth Partner / Supervisor' : ROLE_LABELS[effectiveRole],
    portfolio,
    canViewExecutiveWorkspace: canViewExecutiveWorkspace(user?.uid),
    isSuperAdmin: isSuperAdmin(user?.uid),
    isGrowthPartnerSupervisor,
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, role: effectiveRole, claims, profile, previewRole, setPreviewRole, canPreviewRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
