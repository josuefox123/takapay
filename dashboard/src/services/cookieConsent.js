export const COOKIE_CONSENT_KEY = 'takapay-cookie-consent';
export const COOKIE_CONSENT_EVENT = 'takapay:open-cookie-preferences';

const CONSENT_VERSION = 2;
const CONSENT_DURATION_MS = 180 * 24 * 60 * 60 * 1000;

export function readCookieConsent() {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) return null;

  if (stored === 'all' || stored === 'essential') {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return validateCookieConsent(parsed);
    }
  } catch {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    return null;
  }

  return null;
}

function validateCookieConsent(consent) {
  if (
    consent.version !== CONSENT_VERSION
    || typeof consent.preferences !== 'boolean'
    || !Number.isFinite(consent.expiresAt)
    || consent.expiresAt <= Date.now()
  ) {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    return null;
  }

  return { ...consent, necessary: true };
}

export function saveCookieConsent(preferences) {
  const consent = {
    version: CONSENT_VERSION,
    necessary: true,
    preferences: Boolean(preferences),
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + CONSENT_DURATION_MS,
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    throw new Error('Impossible d’enregistrer vos préférences de confidentialité dans ce navigateur.');
  }

  return consent;
}

export function removeTranslationCookie() {
  if (typeof document === 'undefined') return;

  const host = window.location.hostname;
  const domains = host && host.includes('.') && !/^(\d{1,3}\.){3}\d{1,3}$/.test(host)
    ? [`; domain=.${host}`, `; domain=${host}`]
    : [];
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

  document.cookie = `googtrans=; ${expires}`;
  domains.forEach((domain) => {
    document.cookie = `googtrans=; ${expires}${domain}`;
  });
}

export function openCookiePreferences(tab = 'cookies') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { tab } }));
  }
}

export function enableOptionalServices() {
  if (typeof window !== 'undefined') {
    window.takapayLoadOptionalServices?.();
  }
}
