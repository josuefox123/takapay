import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Adaptateur FeexPay v2 : relais sécurisé via le backend Laravel (la clé secrète FEEXPAY_API_KEY ne quitte jamais le serveur)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  let url = typeof resource === 'string' ? resource : (resource?.url || '');

  if (typeof url === 'string' && url.includes('feexpay.me')) {
    url = url.replace('api.feexpay.me', 'api-v2.feexpay.me');

    const statusMatch = url.match(/\/api\/transactions\/getrequesttopay\/integration\/([^/?#]+)/);
    if (statusMatch) {
      const txRef = statusMatch[1];
      url = `https://api-v2.feexpay.me/api/transactions/public/single/status/${txRef}`;
    }

    const method = (config?.method || (resource instanceof Request ? resource.method : 'GET') || 'GET').toUpperCase();
    let parsedBody = null;
    if (config?.body && typeof config.body === 'string') {
      try {
        parsedBody = JSON.parse(config.body);
        if (parsedBody.network && !parsedBody.reseau) {
          parsedBody.reseau = parsedBody.network;
        }
        if (window.__takapayCurrentDepositAmount && Number(window.__takapayCurrentDepositAmount) > 0) {
          parsedBody.amount = Number(window.__takapayCurrentDepositAmount);
        }
      } catch {
        parsedBody = null;
      }
    }

    try {
      const res = await originalFetch('/api/payment/feexpay-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          url,
          method,
          body: parsedBody,
        }),
      });

      if (!res.ok && url.includes('/get_shop')) {
        return new Response(
          JSON.stringify({
            name: 'Takapay Store',
            reference: 'Takapay',
            status: 'ACTIVE',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return res;
    } catch (err) {
      if (url.includes('/get_shop')) {
        return new Response(
          JSON.stringify({
            name: 'Takapay Store',
            reference: 'Takapay',
            status: 'ACTIVE',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }
  }

  return originalFetch(...args);
};

// Pré-remplissage automatique des informations client dans le modal FeexPay
if (typeof window !== 'undefined') {
  const setNativeInputValue = (element, value) => {
    if (!element || value === undefined || value === null) return;
    const strVal = String(value).trim();
    if (!strVal || element.value === strVal) return;

    const previousValue = element.value;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, strVal);
    } else {
      element.value = strVal;
    }
    const tracker = element._valueTracker;
    if (tracker) {
      tracker.setValue(previousValue);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const getActiveClientInfo = () => {
    if (window.__takapayPrefillUser && (window.__takapayPrefillUser.fullName || window.__takapayPrefillUser.phoneDigits)) {
      return window.__takapayPrefillUser;
    }
    let u = null;
    try {
      const s1 = localStorage.getItem('takapay-client-user');
      if (s1) u = JSON.parse(s1);
    } catch {
      // Ignorer
    }
    if (!u) return null;

    const fullName = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || u.prenom || u.name || '';
    let rawPhone = u.telephone || u.phone || '';
    let phoneDigits = String(rawPhone).replace(/\D/g, '');
    if (phoneDigits.startsWith('229') && phoneDigits.length > 8) {
      phoneDigits = phoneDigits.substring(3);
    }
    const email = u.email && !u.email.endsWith('@client.takapay.bj') ? u.email : '';
    return { fullName, phoneDigits, email };
  };

  const tryPrefillFeexpayModal = () => {
    try {
      // Détection stricte de la modal FeexPay uniquement (ne jamais appliquer au reste de l'application)
      const feexpayModalEl = document.querySelector('img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
        document.querySelector('.fixed.inset-0 img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
        document.querySelector('.feexpay-modal-overlay-custom');

      if (!feexpayModalEl) return;

      if (!feexpayModalEl.classList.contains('feexpay-modal-overlay-custom')) {
        feexpayModalEl.classList.add('feexpay-modal-overlay-custom');
        const card = feexpayModalEl.querySelector('.bg-white.rounded-lg') || feexpayModalEl.querySelector('.max-w-md');
        if (card) card.classList.add('feexpay-modal-card-custom');
      }

      const clientInfo = getActiveClientInfo();
      if (!clientInfo) return;

      const { fullName, phoneDigits, email } = clientInfo;
      const inputs = Array.from(feexpayModalEl.querySelectorAll('input'));

      inputs.forEach((input) => {
        const ph = (input.getAttribute('placeholder') || '').toLowerCase();
        const type = (input.getAttribute('type') || '').toLowerCase();

        // 1. Champ Téléphone (sans indicatif)
        if (type === 'tel' || ph.includes('téléphone') || ph.includes('telephone') || ph.includes('numéro') || ph.includes('numero')) {
          if (phoneDigits && input.value !== phoneDigits && !input.dataset.manuallyEdited) {
            setNativeInputValue(input, phoneDigits);
          }
        }
        // 2. Champ Nom et Prénoms
        else if (ph.includes('nom') || ph.includes('prénom') || ph.includes('prenom')) {
          if (fullName && input.value !== fullName && !input.dataset.manuallyEdited) {
            setNativeInputValue(input, fullName);
          }
        }
        // 3. Champ Email
        else if (type === 'email' || ph.includes('email') || ph.includes('e-mail') || ph.includes('courriel')) {
          if (email && input.value !== email && !input.dataset.manuallyEdited) {
            setNativeInputValue(input, email);
          }
        }

        if (!input.dataset.boundManual) {
          input.dataset.boundManual = 'true';
          input.addEventListener('input', (e) => {
            if (e.isTrusted) {
              input.dataset.manuallyEdited = 'true';
            }
          });
        }
      });
    } catch {
      // Ignorer
    }
  };

  const observer = new MutationObserver(() => {
    tryPrefillFeexpayModal();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
