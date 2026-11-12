import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initGlossaryWatcher } from './services/glossaryService'

// Surveillance et application du glossaire officiel TakaPay pour les traductions
initGlossaryWatcher();

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
      let authToken = null;
      try {
        authToken =
          localStorage.getItem('takapay_client_token') ||
          localStorage.getItem('takapay_admin_token');
      } catch {}

      const res = await originalFetch('/api/payment/feexpay-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          url,
          method,
          body: parsedBody,
        }),
      });

      if (res.ok && url.includes('/api/transactions/details')) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data && typeof data === 'object') {
            const realTotal = data.total || data.real_amount || (data.fees ? (Number(parsedBody?.amount || 0) + Number(data.fees)) : null);
            if (realTotal && !data.total) {
              data.total = realTotal;
              return new Response(JSON.stringify(data), {
                status: res.status,
                headers: { 'Content-Type': 'application/json' },
              });
            }
          }
        } catch {
          // Utiliser la réponse directe
        }
      }

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
    let u = null;
    try {
      const s1 = localStorage.getItem('takapay-client-user');
      if (s1) u = JSON.parse(s1);
    } catch {
      // Ignorer
    }

    const prefill = window.__takapayPrefillUser || {};
    let fullName = prefill.fullName || '';
    if (!fullName || fullName === 'Client') {
      const uFull = `${u?.prenom || ''} ${u?.nom || ''}`.trim() || u?.nom || u?.prenom || u?.n || '';
      if (uFull) fullName = uFull;
    }
    if (!fullName) fullName = 'Client';

    let phoneDigits = prefill.phoneDigits || '';
    if (!phoneDigits) {
      const rawPhone = u?.telephone || u?.phone || '';
      let digits = String(rawPhone).replace(/\D/g, '');
      if (digits.startsWith('229') && digits.length > 8) {
        digits = digits.substring(3);
      }
      phoneDigits = digits;
    }

    let email = prefill.email || '';
    if (!email && u?.email && !u.email.endsWith('@client.takapay.bj')) {
      email = u.email;
    }

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

        // 1. Champ Téléphone (sans indicatif ou avec indicatif)
        if (type === 'tel' || ph.includes('téléphone') || ph.includes('telephone') || ph.includes('numéro') || ph.includes('numero')) {
          const targetPhone = ph.includes('avec indicatif') ? (phoneDigits ? `+229${phoneDigits}` : '') : phoneDigits;
          if (targetPhone && input.value !== targetPhone && !input.dataset.manuallyEdited) {
            setNativeInputValue(input, targetPhone);
          }
        }
        // 2. Champ Prénom seul
        else if (ph.includes('prénom') || ph.includes('prenom')) {
          if (!ph.includes('nom')) {
            const firstName = fullName.split(' ')[0] || fullName;
            if (firstName && input.value !== firstName && !input.dataset.manuallyEdited) {
              setNativeInputValue(input, firstName);
            }
          } else {
            // "Nom et Prénoms"
            if (fullName && input.value !== fullName && !input.dataset.manuallyEdited) {
              setNativeInputValue(input, fullName);
            }
          }
        }
        // 3. Champ Nom seul ou Nom complet
        else if (ph.includes('nom')) {
          if (!ph.includes('prénom') && !ph.includes('prenom')) {
            const lastName = fullName.split(' ').slice(1).join(' ') || fullName;
            if (lastName && input.value !== lastName && !input.dataset.manuallyEdited) {
              setNativeInputValue(input, lastName);
            }
          } else {
            if (fullName && input.value !== fullName && !input.dataset.manuallyEdited) {
              setNativeInputValue(input, fullName);
            }
          }
        }
        // 4. Champ Email
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

      // Vérification et combinaison stricte du montant et des frais (Montant + Frais = Montant Total à payer)
      const summaryCard = feexpayModalEl.querySelector('div.bg-gray-50.p-4.rounded-md');
      if (summaryCard) {
        const rows = Array.from(summaryCard.querySelectorAll('div.flex.justify-between'));
        let montantVal = null;
        let fraisVal = null;
        let totalRowSpan = null;
        let currency = 'XOF';

        rows.forEach((row) => {
          const text = (row.textContent || '').replace(/\s+/g, ' ');
          if (text.includes('Montant :') && !text.includes('Total')) {
            const valSpan = row.querySelector('span:last-child');
            const valText = valSpan?.textContent || '';
            const matchCurrency = valText.match(/[A-Z]{3}/);
            if (matchCurrency) currency = matchCurrency[0];
            const num = parseInt(valText.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > 0) montantVal = num;
          } else if (text.includes('Frais')) {
            const valSpan = row.querySelector('span:last-child');
            const num = parseInt((valSpan?.textContent || '').replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > 0) fraisVal = num;
          } else if (text.includes('Total')) {
            totalRowSpan = row.querySelector('span:last-child');
          }
        });

        if (montantVal !== null && fraisVal !== null && fraisVal > 0 && totalRowSpan) {
          const expectedTotal = montantVal + fraisVal;
          const currentTotalNum = parseInt((totalRowSpan.textContent || '').replace(/\D/g, ''), 10);
          if (currentTotalNum !== expectedTotal) {
            const formattedTotal = `${expectedTotal.toLocaleString('fr-FR')} ${currency}`;
            totalRowSpan.textContent = formattedTotal;

            const payBtn = feexpayModalEl.querySelector('button.bg-primary-orange') ||
              Array.from(feexpayModalEl.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Payer'));
            if (payBtn) {
              const spinner = payBtn.querySelector('svg');
              if (spinner) {
                payBtn.innerHTML = '';
                payBtn.appendChild(spinner);
                payBtn.appendChild(document.createTextNode(` Payer ${formattedTotal}`));
              } else {
                payBtn.textContent = `Payer ${formattedTotal}`;
              }
            }
          }
        }
      }
    } catch {
      // Ignorer
    }
  };

  let feexpaySyncInterval = null;
  const startFeexpaySync = () => {
    tryPrefillFeexpayModal();
    if (feexpaySyncInterval) return;
    let ticks = 0;
    feexpaySyncInterval = setInterval(() => {
      ticks++;
      const modal = document.querySelector('img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
        document.querySelector('.fixed.inset-0 img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
        document.querySelector('.feexpay-modal-overlay-custom');
      if (!modal) {
        clearInterval(feexpaySyncInterval);
        feexpaySyncInterval = null;
        return;
      }
      tryPrefillFeexpayModal();
      if (ticks > 50) {
        clearInterval(feexpaySyncInterval);
        feexpaySyncInterval = null;
      }
    }, 100);
  };

  const observer = new MutationObserver(() => {
    const modal = document.querySelector('img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
      document.querySelector('.fixed.inset-0 img[src*="feexpay"]')?.closest('.fixed.inset-0') ||
      document.querySelector('.feexpay-modal-overlay-custom');
    if (modal) {
      startFeexpaySync();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
