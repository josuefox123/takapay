import { useState, useEffect } from 'react';

export default function ClientCookieBanner({ onShowToast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem('takapay-cookie-consent');
      if (!choice) {
        // Afficher la bannière discrètement après 1.5s
        const timer = setTimeout(() => setVisible(true), 1500);
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
      <div className="cookie-copy">
        <strong>Gestion de la confidentialité & Notifications</strong>
        <p>
          TakaPay utilise des cookies essentiels pour assurer le bon fonctionnement de votre panier et vos cagnottes.
          Activez les notifications pour recevoir des rappels d'échéances et vos alertes de livraison.
        </p>
      </div>

      <div className="cookie-actions">
        <button
          type="button"
          className="client-btn"
          onClick={() => handleSave('all')}
        >
          Tout accepter
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
