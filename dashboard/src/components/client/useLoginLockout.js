import { useEffect, useState } from 'react';

const normalizeIdentifier = (identifier) => String(identifier || '').trim().toLowerCase();

export const formatLockoutTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds} s`;
  return `${minutes} min ${remainingSeconds.toString().padStart(2, '0')} s`;
};

export default function useLoginLockout() {
  const [lockout, setLockout] = useState(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!lockout) return undefined;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= lockout.unlockAt) setLockout(null);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockout]);

  const startLockout = (identifier, retryAfter) => {
    const seconds = Number(retryAfter);
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    const currentTime = Date.now();
    setNow(currentTime);
    setLockout({
      identifier: normalizeIdentifier(identifier),
      unlockAt: currentTime + seconds * 1000,
    });
  };

  const clearLockout = () => setLockout(null);
  const remainingFor = (identifier) => {
    if (!lockout || lockout.identifier !== normalizeIdentifier(identifier)) return 0;
    return Math.max(0, Math.ceil((lockout.unlockAt - now) / 1000));
  };

  return { startLockout, clearLockout, remainingFor };
}
