import { useState, useEffect, useCallback } from 'react';
import Nav from '../components/layout/Nav';
import ControlBar from '../components/layout/ControlBar';
import StatusBar from '../components/layout/StatusBar';
import Overview from './Overview';
import Merchants from './Merchants';
import StoreCapture from './StoreCapture';
import FieldOps from './FieldOps';
import Agents from './Agents';
import Insights from './Insights';
import StorePerformance from './StorePerformance';
import DevproReport from './DevproReport';
import { ToastContainer } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

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
  const { user }                             = useAuth();
  const { newRowDelta, clearNewRowDelta } = useData();
  const [activePage, setActivePage]          = useState('overview');
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
    setActivePage(page);
  };

  const goAcquisitions = () => {
    setActivePage('merchants');
    setShowWelcome(false);
  };

  const shouldHideSharedFilters = activePage === 'storecapture' || activePage === 'storeperformance' || activePage === 'devproreport';

  return (
    <>
      <Nav activePage={activePage} onPageChange={handlePageChange} />
      {!shouldHideSharedFilters && <ControlBar />}
      <StatusBar />
      {showWelcome && (
        <WelcomeBanner user={user} onGoAcquisitions={goAcquisitions} onDismiss={() => setShowWelcome(false)} />
      )}
      <div className="canvas">
        {activePage === 'overview'    && <Overview />}
        {activePage === 'merchants'   && <Merchants />}
        {activePage === 'storecapture' && <StoreCapture />}
        {activePage === 'fieldops'    && <FieldOps />}
        {activePage === 'storeperformance' && <StorePerformance />}
        {activePage === 'devproreport' && <DevproReport />}
        {activePage === 'agents'      && <Agents />}
        {activePage === 'insights'    && <Insights />}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
