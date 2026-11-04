import { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_EVENT,
  enableOptionalServices,
  openCookiePreferences,
  readCookieConsent,
  removeTranslationCookie,
  saveCookieConsent,
} from '../../services/cookieConsent';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  background: 'rgba(24, 20, 18, 0.62)',
  backdropFilter: 'blur(4px)',
};

const buttonStyle = {
  minHeight: '42px',
  padding: '10px 15px',
  border: '1px solid #ded8d2',
  borderRadius: '12px',
  background: '#fff',
  color: '#28211e',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
};

export default function ClientCookieBanner({ onShowToast }) {
  const [initialState] = useState(() => {
    try {
      return { consent: readCookieConsent(), error: '' };
    } catch (readError) {
      return {
        consent: null,
        error: readError.message || 'Le stockage de ce navigateur est indisponible.',
      };
    }
  });
  const [isOpen, setIsOpen] = useState(!initialState.consent || Boolean(initialState.error));
  const [hasConsent, setHasConsent] = useState(Boolean(initialState.consent));
  const [preferences, setPreferences] = useState(Boolean(initialState.consent?.preferences));
  const [tab, setTab] = useState('cookies');
  const [error, setError] = useState(initialState.error);

  useEffect(() => {
    if (initialState.consent?.preferences) enableOptionalServices();
  }, [initialState]);

  useEffect(() => {
    const handleOpen = (event) => {
      setTab(event.detail?.tab === 'privacy' ? 'privacy' : 'cookies');
      setIsOpen(true);
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleOpen);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleOpen);
  }, []);

  const save = (allowPreferences) => {
    setError('');
    let wasEnabled;
    try {
      wasEnabled = Boolean(readCookieConsent()?.preferences);
      saveCookieConsent(allowPreferences);
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer votre choix.');
      return;
    }

    setPreferences(allowPreferences);
    setHasConsent(true);
    setIsOpen(false);

    if (allowPreferences) {
      enableOptionalServices();
    } else {
      removeTranslationCookie();
      if (wasEnabled) window.location.reload();
    }

    onShowToast?.(
      allowPreferences
        ? 'Vos préférences de confidentialité ont été enregistrées.'
        : 'Seuls les stockages nécessaires sont activés.'
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => openCookiePreferences('cookies')}
          aria-label="Ouvrir les préférences de confidentialité et de cookies"
          style={{
            position: 'fixed',
            left: '16px',
            bottom: '16px',
            zIndex: 10040,
            minHeight: '42px',
            padding: '9px 13px',
            border: '1px solid #ded8d2',
            borderRadius: '999px',
            background: '#fff',
            color: '#28211e',
            boxShadow: '0 4px 18px rgba(0,0,0,.14)',
            font: 'inherit',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Confidentialité
        </button>
      )}

      {isOpen && (
        <div
          style={backdropStyle}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && hasConsent) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-dialog-title"
            style={{
              width: 'min(100%, 620px)',
              maxHeight: 'min(90vh, 760px)',
              overflow: 'auto',
              padding: '24px',
              borderRadius: '22px',
              background: '#fff',
              color: '#28211e',
              boxShadow: '0 24px 80px rgba(0,0,0,.28)',
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h2 id="cookie-dialog-title" style={{ margin: 0, fontSize: '22px' }}>
                  Confidentialité et cookies
                </h2>
                <p style={{ margin: '8px 0 0', color: '#625b56', lineHeight: 1.55 }}>
                  Choisissez les services facultatifs. Votre choix est conservé pendant 6 mois
                  et peut être modifié à tout moment.
                </p>
              </div>
              {hasConsent && (
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setIsOpen(false)}
                  style={{ ...buttonStyle, minHeight: '36px', padding: '4px 10px', alignSelf: 'flex-start' }}
                >
                  ×
                </button>
              )}
            </header>

            <nav aria-label="Informations de confidentialité" style={{ display: 'flex', gap: '8px', margin: '20px 0' }}>
              <button
                type="button"
                onClick={() => setTab('cookies')}
                aria-pressed={tab === 'cookies'}
                style={{
                  ...buttonStyle,
                  background: tab === 'cookies' ? '#fff2ef' : '#fff',
                  borderColor: tab === 'cookies' ? '#c62828' : '#ded8d2',
                }}
              >
                Cookies
              </button>
              <button
                type="button"
                onClick={() => setTab('privacy')}
                aria-pressed={tab === 'privacy'}
                style={{
                  ...buttonStyle,
                  background: tab === 'privacy' ? '#fff2ef' : '#fff',
                  borderColor: tab === 'privacy' ? '#c62828' : '#ded8d2',
                }}
              >
                Politique de confidentialité
              </button>
            </nav>

            {tab === 'cookies' ? (
              <div style={{ lineHeight: 1.6 }}>
                <div style={{ padding: '14px 0', borderTop: '1px solid #eee8e3' }}>
                  <strong>Stockage nécessaire — toujours actif</strong>
                  <p style={{ margin: '6px 0 0', color: '#625b56' }}>
                    Le navigateur conserve les éléments indispensables au fonctionnement du compte,
                    à la sécurité et à vos choix. Il s’agit principalement de stockage local,
                    pas de cookies publicitaires.
                  </p>
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '14px 0',
                    borderTop: '1px solid #eee8e3',
                    cursor: 'pointer',
                  }}
                >
                  <span>
                    <strong>Préférences facultatives — Google Traduction</strong>
                    <span style={{ display: 'block', marginTop: '6px', color: '#625b56' }}>
                      Autorise le chargement de Google Traduction et l’utilisation du cookie
                      <code> googtrans</code> pour mémoriser la langue choisie. Google reçoit
                      certaines données techniques, comme l’adresse IP, lors de ce chargement.
                      Le cookie peut rester jusqu’à un an après le choix de la langue.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences}
                    onChange={(event) => setPreferences(event.target.checked)}
                    aria-label="Autoriser Google Traduction"
                    style={{ width: '20px', height: '20px', accentColor: '#c62828', flexShrink: 0 }}
                  />
                </label>
                <p style={{ margin: '8px 0 0', color: '#625b56', fontSize: '13px' }}>
                  Aucun cookie publicitaire ou outil de mesure d’audience n’est configuré dans
                  l’interface actuelle. Les polices et icônes Google Fonts sont chargées pour
                  afficher l’interface (sans consentement cookie) et peuvent transmettre à Google
                  des données techniques, comme l’adresse IP. Les paiements FeexPay et les
                  fonctions de localisation ne sont sollicités que lorsque vous les utilisez.
                </p>
              </div>
            ) : (
              <div style={{ color: '#4d4641', lineHeight: 1.65 }}>
                <h3 style={{ marginBottom: '6px', color: '#28211e' }}>Données et utilisation</h3>
                <p style={{ marginTop: 0 }}>
                  Takapay traite les informations que vous fournissez pour créer et sécuriser
                  votre compte (nom, téléphone, e-mail), gérer les produits, commandes, cagnottes,
                  paiements et livraisons, répondre à vos demandes et protéger le service contre
                  les abus. Les informations techniques nécessaires au fonctionnement et à la
                  sécurité peuvent également être traitées.
                </p>
                <h3 style={{ marginBottom: '6px', color: '#28211e' }}>Partage et services externes</h3>
                <p style={{ marginTop: 0 }}>
                  Les données sont accessibles aux personnes autorisées qui exploitent Takapay
                  et aux prestataires nécessaires à la fonction demandée. FeexPay intervient
                  lorsque vous initiez un paiement. Lorsqu’une position GPS est demandée, le
                  service de géocodage inverse api-bdc.net reçoit les coordonnées pour proposer
                  une adresse lisible; l’aperçu Google Maps peut ensuite afficher cette position.
                  Google Traduction n’est chargé qu’après
                  votre accord pour les préférences facultatives. Ces services appliquent leurs
                  propres politiques de confidentialité.
                </p>
                <h3 style={{ marginBottom: '6px', color: '#28211e' }}>Durée et demandes</h3>
                <p style={{ marginTop: 0 }}>
                  L’application ne publie pas encore de calendrier précis de conservation.
                  Les données liées au compte et aux opérations sont conservées selon les besoins
                  du service, de la sécurité et les obligations applicables. Pour demander l’accès,
                  la correction ou la suppression de vos données, ou poser une question, écrivez à{' '}
                  <a href="mailto:support@takapay.bj" style={{ color: '#a51f1f', fontWeight: 700 }}>
                    support@takapay.bj
                  </a>
                  . Certaines données d’opérations peuvent devoir être conservées lorsque la loi
                  l’exige.
                </p>
                <p style={{ marginBottom: 0, fontSize: '13px', color: '#716963' }}>
                  Vous pouvez retirer à tout moment l’accord donné pour Google Traduction depuis
                  « Confidentialité » en bas de page. La politique doit être complétée si les
                  coordonnées de l’opérateur ou les durées légales exactes changent.
                </p>
              </div>
            )}

            {error && (
              <p role="alert" style={{ color: '#a51f1f', fontWeight: 700 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px', marginTop: '22px' }}>
              <button type="button" onClick={() => save(false)} style={buttonStyle}>
                Refuser les facultatifs
              </button>
              <button
                type="button"
                onClick={() => save(preferences)}
                style={{ ...buttonStyle, background: '#fff2ef', borderColor: '#c62828' }}
              >
                Enregistrer mon choix
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                style={{ ...buttonStyle, background: '#c62828', borderColor: '#c62828', color: '#fff' }}
              >
                Tout accepter
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
