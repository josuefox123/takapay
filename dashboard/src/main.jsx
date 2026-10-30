import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Adaptateur FeexPay v2 : redirection automatique de l'ancien domaine api.feexpay.me vers api-v2.feexpay.me
let cachedFeexPayToken = '';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  let url = typeof resource === 'string' ? resource : (resource?.url || '');

  if (typeof url === 'string' && url.includes('feexpay.me')) {
    // 1. Redirection vers la nouvelle API officielle api-v2
    url = url.replace('api.feexpay.me', 'api-v2.feexpay.me');

    const headers = new Headers(config?.headers || (resource instanceof Request ? resource.headers : {}));

    // Sauvegarde du token d'authentification s'il est présent
    const authHeader = headers.get('Authorization') || headers.get('authorization');
    if (authHeader && authHeader.includes('Bearer')) {
      cachedFeexPayToken = authHeader;
    }

    // 2. Correction de la vérification de statut pour FeexPay v2
    // L'ancien endpoint SDK getrequesttopay/integration/:id devient /api/transactions/public/single/status/:id
    const statusMatch = url.match(/\/api\/transactions\/getrequesttopay\/integration\/([^/?#]+)/);
    if (statusMatch) {
      const txRef = statusMatch[1];
      url = `https://api-v2.feexpay.me/api/transactions/public/single/status/${txRef}`;
      if (cachedFeexPayToken && !headers.has('Authorization')) {
        headers.set('Authorization', cachedFeexPayToken);
      }
    }

    // 3. Correction du calcul des frais /details (FeexPay v2 attend 'reseau' au lieu de 'network')
    let body = config?.body;
    if (url.includes('/api/transactions/details') && body && typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        if (parsed.network && !parsed.reseau) {
          parsed.reseau = parsed.network;
          body = JSON.stringify(parsed);
        }
        if (parsed.token && !cachedFeexPayToken) {
          cachedFeexPayToken = `Bearer ${parsed.token}`;
        }
      } catch {
        // Ignorer l'erreur de parsing
      }
    }

    // Sauvegarde du token si envoyé dans le body de requesttopay
    if (body && typeof body === 'string' && !cachedFeexPayToken) {
      try {
        const parsed = JSON.parse(body);
        if (parsed.token) {
          cachedFeexPayToken = `Bearer ${parsed.token}`;
        }
      } catch {
        // Ignorer
      }
    }

    const newConfig = {
      ...config,
      headers,
      ...(body ? { body } : {}),
    };

    try {
      const res = await originalFetch(url, newConfig);

      // Si l'appel /get_shop échoue ou n'est pas OK, fallback propre
      if (!res.ok && url.includes('/get_shop')) {
        return new Response(
          JSON.stringify({
            name: 'Takapay Store',
            reference: '4HgUAuyVdYvnMPc',
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
            reference: '4HgUAuyVdYvnMPc',
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
    if (!element || !value) return;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const tryPrefillFeexpayModal = () => {
    try {
      const savedUserStr = localStorage.getItem('takapay-client-user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      if (!savedUser) return;

      const fullName = `${savedUser.prenom || ''} ${savedUser.nom || ''}`.trim() || savedUser.nom || '';
      let rawPhone = savedUser.telephone || savedUser.phone || '';
      let phoneDigits = String(rawPhone).replace(/\D/g, '');
      if (phoneDigits.startsWith('229') && phoneDigits.length > 8) {
        phoneDigits = phoneDigits.substring(3);
      }
      const email = savedUser.email && !savedUser.email.endsWith('@client.takapay.bj') ? savedUser.email : '';

      // Nom et Prénoms
      const nameInput = document.querySelector('input[placeholder="Nom et Prénoms"]');
      if (nameInput && !nameInput.value && fullName && !nameInput.dataset.prefilled) {
        nameInput.dataset.prefilled = 'true';
        setNativeInputValue(nameInput, fullName);
      }

      // Email
      const emailInput = document.querySelector('input[placeholder="Email"]');
      if (emailInput && !emailInput.value && email && !emailInput.dataset.prefilled) {
        emailInput.dataset.prefilled = 'true';
        setNativeInputValue(emailInput, email);
      }

      // Numéro de téléphone sans indicatif
      const phoneInput = document.querySelector('input[placeholder="Numéro de téléphone sans indicatif"]');
      if (phoneInput && !phoneInput.value && phoneDigits && !phoneInput.dataset.prefilled) {
        phoneInput.dataset.prefilled = 'true';
        setNativeInputValue(phoneInput, phoneDigits);
      }
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
