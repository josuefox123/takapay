import { useState, useEffect } from 'react';

export default function ClientCookieBanner({ onShowToast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem('takapay-cookie-consent');
      if (!choice) {
        // Afficher la bannière promptement dès le chargement
        const timer = setTimeout(() => setVisible(true), 400);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorer
    }
  }, []);

  const handleSave = (choice) => {
    try {
      localStorage.setItem('takapay-cookie-consent', choice);
    } catch {
      // Ignorer
    }
    setVisible(false);
    onShowToast(
      choice === 'all'
        ? 'Vos préférences de cookies ont été enregistrées avec succès.'
        : 'Seuls les cookies strictement nécessaires sont activés.'
    );
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      onShowToast('Les notifications ne sont pas prises en charge par votre navigateur.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onShowToast('Notifications activées ! Vous recevrez des alertes sur vos cagnottes.');
        handleSave('all');
      } else {
        onShowToast('Autorisation des notifications refusée dans votre navigateur.');
      }
    } catch {
      onShowToast('Impossible de demander l’autorisation des notifications.');
    }
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Consentement Cookies & Notifications">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 360px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(220, 38, 38, 0.18)',
            border: '1.5px solid rgba(220, 38, 38, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          🍪
        </div>
        <div className="cookie-copy">
          <strong>Gestion des cookies & Confidentialité</strong>
          <p>
            TakaPay utilise des cookies essentiels pour sécuriser votre compte, vos commandes et vos cagnottes.
            Activez les alertes pour ne rater aucune échéance de livraison.
          </p>
        </div>
      </div>

      <div className="cookie-actions">
        <button
          type="button"
          className="client-btn"
          style={{ fontWeight: 800 }}
          onClick={() => handleSave('all')}
        >
          ✓ Tout accepter
        </button>

        <button
          type="button"
          className="client-btn g"
          onClick={() => handleSave('essential')}
        >
          Refuser les optionnels
        </button>

        <button
          type="button"
          className="client-btn o"
          onClick={handleEnableNotifications}
        >
          🔔 Activer les notifications
        </button>
      </div>
    </div>
  );
}
