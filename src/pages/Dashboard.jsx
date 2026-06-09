import { useState, useEffect, useCallback } from 'react';
import Nav from '../components/layout/Nav';
import ControlBar from '../components/layout/ControlBar';
import StatusBar from '../components/layout/StatusBar';
import Overview from './Overview';
import Merchants from './Merchants';
import FieldOps from './FieldOps';
import Agents from './Agents';
import Insights from './Insights';
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
    if (newRowDelta.onboarding === 0) return;

    const agentNames = newRowDelta.agents.length
      ? newRowDelta.agents.join(' & ')
      : 'a field agent';
    const message = `${newRowDelta.onboarding} new acquisition record${newRowDelta.onboarding > 1 ? 's' : ''} added by ${agentNames}`;

    addToast({
      title: '🏪 New Merchant Acquisition',
      message,
      type: 'info',
      duration: 6000,
    });

    sendBrowserNotif('🏪 STEP — New merchant acquisition', message);

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

  return (
    <>
      <Nav activePage={activePage} onPageChange={handlePageChange} />
      <ControlBar />
      <StatusBar />
      {showWelcome && (
        <WelcomeBanner user={user} onGoAcquisitions={goAcquisitions} onDismiss={() => setShowWelcome(false)} />
      )}
      <div className="canvas">
        {activePage === 'overview'    && <Overview />}
        {activePage === 'merchants'   && <Merchants />}
        {activePage === 'fieldops'    && <FieldOps />}
        {activePage === 'agents'      && <Agents />}
        {activePage === 'insights'    && <Insights />}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
