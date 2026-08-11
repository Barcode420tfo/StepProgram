import { useState, useEffect, useCallback } from 'react';
import Nav from '../components/layout/Nav';
import ControlBar from '../components/layout/ControlBar';
import StatusBar from '../components/layout/StatusBar';
import Overview from './Overview';
import Merchants from './Merchants';
import FieldOps from './FieldOps';
import Agents from './Agents';
import StorePerformance from './StorePerformance';
import DevproReport from './DevproReport';
import RoleHome from './RoleHome';
import GrowthPartnerPerformance from './GrowthPartnerPerformance';
import Attendance from './Attendance';
import { ToastContainer } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ROLES } from '../config/accessControl';

const ROLE_PAGES = Object.freeze({
  [ROLES.ADMIN]: ['workspace', 'overview', 'merchants', 'fieldops', 'storeperformance', 'devproreport', 'agents', 'attendance'],
  [ROLES.GROWTH_PARTNER]: ['workspace', 'overview', 'merchants', 'fieldops', 'storeperformance', 'devproreport', 'performance'],
  [ROLES.SUPERVISOR]: ['workspace', 'overview', 'merchants', 'fieldops', 'storeperformance', 'devproreport'],
  [ROLES.SALES_AGENT]: ['workspace'],
});

function isRestrictedGrowthPartner(role, profile) {
  return role === ROLES.GROWTH_PARTNER && ['Mohammed', 'Sarah', 'Esther'].includes(profile?.portfolio?.name);
}
function pagesFor(role, profile) {
  return isRestrictedGrowthPartner(role, profile) ? ['workspace'] : (ROLE_PAGES[role] || []);
}
function defaultPage(role, profile) {
  if (isRestrictedGrowthPartner(role, profile)) return 'workspace';
  return [ROLES.ADMIN, ROLES.GROWTH_PARTNER, ROLES.SUPERVISOR].includes(role) ? 'overview' : 'workspace';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function WelcomeBanner({ user, onGoAcquisitions, onDismiss }) {
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  return (
    <div className="welcome-banner">
      <div className="welcome-left">
        <div className="welcome-greeting">{getGreeting()}, {firstName}! 👋</div>
        <div className="welcome-note">
          The dashboard is now focused on live merchant acquisition. Head to{' '}
          <button className="welcome-link" onClick={onGoAcquisitions}>Acquisitions</button>
          {' '}to review the latest merchants captured from the source sheet.
        </div>
      </div>
      <button className="welcome-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
    </div>
  );
}

// Request browser notification permission once
async function requestBrowserNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function sendBrowserNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function summarizeNames(values, fallback) {
  if (!values.length) return fallback;
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values[0]}, ${values[1]} +${values.length - 2} more`;
}

export default function Dashboard() {
  const { user, role, profile }              = useAuth();
  const { newRowDelta, clearNewRowDelta } = useData();
  const [activePage, setActivePage]          = useState(() => defaultPage(role, profile));
  const [showWelcome, setShowWelcome]        = useState(true);
  const [toasts, setToasts]                  = useState([]);

  // Ask for browser notification permission on mount
  useEffect(() => { requestBrowserNotifPermission(); }, []);

  // Auto-dismiss welcome after 7s
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 7000);
    return () => clearTimeout(t);
  }, []);

  // Watch for new acquisition rows
  useEffect(() => {
    if (newRowDelta.onboarding === 0 && (!newRowDelta.salesUpdates || newRowDelta.salesUpdates.length === 0)) return;

    if (newRowDelta.onboarding > 0) {
      const agentNames = summarizeNames(newRowDelta.agents, 'a field agent');
      const message = `${newRowDelta.onboarding} new acquisition record${newRowDelta.onboarding > 1 ? 's' : ''} added by ${agentNames}`;

      addToast({
        title: '🏪 New Merchant Acquisition',
        message,
        type: 'info',
        duration: 6000,
      });

      sendBrowserNotif('🏪 STEP — New merchant acquisition', message);
    }

    newRowDelta.salesUpdates.forEach((update) => {
      const storeSummary = summarizeNames(update.stores, 'tracked stores');
      const locationSummary = summarizeNames(update.locations, 'active locations');
      const message = `${update.count} new ${update.source} record${update.count > 1 ? 's' : ''} added for ${storeSummary} across ${locationSummary}`;

      addToast({
        title: `📈 New ${update.source} Activity`,
        message,
        type: 'success',
        duration: 7000,
      });

      sendBrowserNotif(`📈 STEP — New ${update.source} activity`, message);
    });

    clearNewRowDelta();
  }, [newRowDelta]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, ...toast }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handlePageChange = (page) => {
    if (pagesFor(role, profile).includes(page)) setActivePage(page);
  };

  useEffect(() => {
    setActivePage(defaultPage(role, profile));
    setShowWelcome(role === ROLES.ADMIN);
  }, [role, profile.canViewExecutiveWorkspace]);

  const goAcquisitions = () => {
    setActivePage('merchants');
    setShowWelcome(false);
  };

  const isAdmin = role === ROLES.ADMIN;
  const safeActivePage = pagesFor(role, profile).includes(activePage) ? activePage : defaultPage(role, profile);
  const shouldShowSharedFilters = [ROLES.ADMIN, ROLES.GROWTH_PARTNER, ROLES.SUPERVISOR].includes(role) && !['workspace', 'performance', 'storeperformance', 'devproreport'].includes(safeActivePage);

  return (
    <>
      <Nav activePage={activePage} onPageChange={handlePageChange} />
      {shouldShowSharedFilters && <ControlBar />}
      {isAdmin && <StatusBar />}
      {isAdmin && showWelcome && (
        <WelcomeBanner user={user} onGoAcquisitions={goAcquisitions} onDismiss={() => setShowWelcome(false)} />
      )}
      <div className="canvas">
        {safeActivePage === 'workspace'   && <RoleHome />}
        {safeActivePage === 'overview'    && <Overview />}
        {safeActivePage === 'merchants'   && <Merchants />}
        {safeActivePage === 'fieldops'    && <FieldOps />}
        {safeActivePage === 'storeperformance' && <StorePerformance />}
        {safeActivePage === 'devproreport' && <DevproReport />}
        {safeActivePage === 'agents'      && <Agents />}
        {safeActivePage === 'attendance'  && <Attendance />}
        {safeActivePage === 'performance' && <GrowthPartnerPerformance />}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
