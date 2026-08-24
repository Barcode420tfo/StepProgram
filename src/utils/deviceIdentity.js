const STORAGE_KEY = 'step-attendance-device-v1';

function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

function createIdentity() {
  return {
    deviceId: window.crypto.randomUUID?.() || randomToken(16),
    deviceSecret: randomToken(32),
  };
}

export function getAttendanceDevice() {
  let identity;
  try {
    identity = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    identity = null;
  }

  if (!identity?.deviceId || !identity?.deviceSecret) {
    identity = createIdentity();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }

  return {
    ...identity,
    deviceInfo: {
      label: `${navigator.platform || 'Mobile device'} · ${navigator.userAgentData?.mobile ? 'Mobile' : 'Browser'}`,
      browser: navigator.userAgent || 'Unknown browser',
      platform: navigator.platform || 'Unknown platform',
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
    },
  };
}

export function resetAttendanceDevice() {
  const identity = createIdentity();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}
