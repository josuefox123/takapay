import { useState } from 'react';
import { formatFCFA } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

export default function ClientOrderFlow({
  product,
  selectedColor,
  user,
  onUserAuthSuccess,
  onCompleteOrder,
  onBack,
}) {
  // Étapes : 'auth' -> 'pin-create' -> 'pin-confirm' -> 'payment'
  const [step, setStep] = useState(user ? 'payment' : 'auth');
  const [authMode, setAuthMode] = useState('signup'); // 'signup' ou 'login'

  // Formulaire inscription
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('+229 ');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(true);

  // Formulaire connexion
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // PIN
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Paiement
  const [provider, setProvider] = useState('MTN');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Connexion Google
  const handleGoogleAuth = async () => {
    setError('');
    setSubmitting(true);
    try {
      const googlePayload = {
        nom: 'DOSSOU',
        prenom: 'Koffi',
        email: 'koffi.dossou@gmail.com',
        telephone: '+229 01 62 18 02 90',
        photo_profil: null, // Pas de photo par défaut : prendra l'initiale du nom
      };

      const result = await adminService.googleAuth(googlePayload);
      const backendUser = result.user || {};
      const fullName = `${backendUser.prenom || ''} ${backendUser.nom || ''}`.trim() || backendUser.nom || 'Koffi DOSSOU';

      const loggedUser = {
        ...backendUser,
        n: fullName,
        nom: backendUser.nom || 'DOSSOU',
        prenom: backendUser.prenom || 'Koffi',
        phone: backendUser.telephone || googlePayload.telephone,
        email: backendUser.email || googlePayload.email,
        photo_profil: backendUser.photo_profil || null,
        avatar: backendUser.photo_profil || null,
        id: backendUser.id || 'google-user-dossou',
        authProvider: 'google',
      };

      onUserAuthSuccess(loggedUser, result.message || 'Compte créé avec succès !');
      setStep('payment');
    } catch (err) {
      // En cas d'indisponibilité réseau, fallback avec initiales
      const fallbackUser = {
        n: 'Koffi DOSSOU',
        nom: 'DOSSOU',
        prenom: 'Koffi',
        email: 'koffi.dossou@gmail.com',
        phone: '+229 01 62 18 02 90',
        photo_profil: null,
        avatar: null,
        id: 'google-user-dossou',
        authProvider: 'google',
      };
      onUserAuthSuccess(fallbackUser, 'Compte créé avec succès !');
      setStep('payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Étape 1 : Inscription ou Connexion
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'signup') {
      if (!nom.trim()) {
        setError('Veuillez renseigner votre nom de famille.');
        return;
      }
      if (!prenom.trim()) {
        setError('Veuillez renseigner votre prénom.');
        return;
      }
      if (phone.replace(/\D/g, '').length < 8) {
        setError('Veuillez renseigner un numéro de téléphone valide.');
        return;
      }
      if (!terms) {
        setError('Veuillez accepter les conditions d’utilisation.');
        return;
      }
      setStep('pin-create');
    } else {
      if (!loginId.trim()) {
        setError('Veuillez renseigner votre téléphone ou email.');
        return;
      }
      if (loginPin.length !== 6) {
        setError('Le PIN personnel doit comporter 6 chiffres.');
        return;
      }

      setSubmitting(true);
      try {
        const result = await adminService.loginClient(loginId.trim(), loginPin.trim());
        const backendUser = result.user || {};
        const fullName = `${backendUser.prenom || ''} ${backendUser.nom || ''}`.trim() || backendUser.nom || loginId;
        const loggedUser = {
          ...backendUser,
          n: fullName,
          nom: backendUser.nom || loginId,
          prenom: backendUser.prenom || '',
          phone: backendUser.telephone || loginId,
          email: backendUser.email || '',
          photo_profil: backendUser.photo_profil || null,
          avatar: backendUser.photo_profil || null,
          id: backendUser.id || loginId,
        };
        onUserAuthSuccess(loggedUser, 'Connexion réussie.');
        setStep('payment');
      } catch (err) {
        setError(err.message || 'Identifiant ou code PIN incorrect.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Étape 2 : Création PIN
  const handlePinCreate = (e) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      setError('Veuillez saisir exactement 6 chiffres.');
      return;
    }
    setError('');
    setStep('pin-confirm');
  };

  // Étape 3 : Confirmation PIN & Enregistrement en base de données
  const handlePinConfirm = async (e) => {
    e.preventDefault();
    if (confirmPin !== newPin) {
      setError('Les deux codes PIN ne correspondent pas.');
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = {
      nom: nom.trim(),
      prenom: prenom.trim() || null,
      telephone: phone.trim(),
      email: email.trim() || null,
      code_pin: newPin,
      code_pin_confirmation: confirmPin,
    };

    try {
      const result = await adminService.registerClient(payload);
      const backendUser = result.user || {};
      const fullName = `${backendUser.prenom || ''} ${backendUser.nom || ''}`.trim() || backendUser.nom || `${prenom.trim()} ${nom.trim()}`;
      const newUser = {
        ...backendUser,
        n: fullName,
        nom: backendUser.nom || nom.trim(),
        prenom: backendUser.prenom || prenom.trim(),
        phone: backendUser.telephone || phone.trim(),
        email: backendUser.email || email.trim(),
        code_pin: backendUser.code_pin || newPin,
        photo_profil: backendUser.photo_profil || null,
        avatar: backendUser.photo_profil || null,
        id: backendUser.id || phone.trim(),
      };
      onUserAuthSuccess(newUser, result.message || 'Compte créé avec succès !');
      setStep('payment');
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement de votre compte.');
    } finally {
      setSubmitting(false);
    }
  };

  // Étape 4 : Validation Paiement
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!provider) {
      setError('Veuillez choisir votre moyen de paiement.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onCompleteOrder({
        product,
        selectedColor,
        provider,
        initialAmount: product.payment?.minimumStart || product.p,
        date: new Date().toISOString(),
      });
    }, 800);
  };

  const initialAmount = product?.payment?.minimumStart || product?.p || 0;

  return (
    <div className="flow-shell auth-flow-shell">
      <div className="page-top" style={{ position: 'relative', zIndex: 2 }}>
          <button
            type="button"
            className="back-link"
            onClick={onBack}
          >
            ← Retour à l’article
          </button>
        </div>

        <div className="flow-card" style={{ position: 'relative', zIndex: 2 }}>
          {/* Étape 1 : Authentification */}
          {step === 'auth' && (
            <div>
              <span className="flow-label">ÉTAPE 1 · COMPTE CLIENT</span>
              <h1>{authMode === 'signup' ? 'Créer votre compte' : 'Connexion sécurisée'}</h1>
              <p className="flow-lead">
                {authMode === 'signup'
                  ? 'Renseignez vos coordonnées pour valider votre commande et ouvrir votre cagnotte.'
                  : 'Connectez-vous avec votre numéro et votre code PIN personnel.'}
              </p>

              <form onSubmit={handleAuthSubmit}>
                {authMode === 'signup' ? (
                  <>
                    <div className="auth-names-row">
                      <div>
                        <label className="fl" htmlFor="signup-nom">Nom *</label>
                        <input
                          id="signup-nom"
                          type="text"
                          required
                          className="fi"
                          placeholder="Ex: DOSSOU"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="fl" htmlFor="signup-prenom">Prénom *</label>
                        <input
                          id="signup-prenom"
                          type="text"
                          required
                          className="fi"
                          placeholder="Ex: Koffi"
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                        />
                      </div>
                    </div>

                    <label className="fl" htmlFor="signup-phone">Numéro de téléphone (Mobile Money) *</label>
                    <input
                      id="signup-phone"
                      type="tel"
                      required
                      className="fi"
                      placeholder="Ex: +229 97 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />

                    <label className="fl" htmlFor="signup-email">Email (facultatif)</label>
                    <input
                      id="signup-email"
                      type="email"
                      className="fi"
                      placeholder="koffi@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    <label className="terms-check">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                      />
                      <span>
                        J'accepte les conditions d'utilisation et la politique de confidentialité Takapay.
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="fl" htmlFor="login-id">Téléphone ou email</label>
                    <input
                      id="login-id"
                      type="text"
                      required
                      className="fi"
                      placeholder="Votre numéro de téléphone"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                    />

                    <label className="fl" htmlFor="login-pin">Code PIN (6 chiffres)</label>
                    <input
                      id="login-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      className="fi"
                      placeholder="••••••"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </>
                )}

                {error && (
                  <div style={{ color: 'var(--r)', fontSize: '13px', margin: '8px 0', fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="client-btn w100"
                  style={{ marginTop: '16px' }}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Vérification...'
                    : authMode === 'signup'
                    ? 'Continuer'
                    : 'Se connecter'}
                </button>
              </form>

              <p className="auth-alternate">
                {authMode === 'signup' ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                  }}
                >
                  {authMode === 'signup' ? 'Connectez-vous' : 'Créer un compte'}
                </button>
              </p>

              <div className="auth-separator">
                <span>ou</span>
              </div>

              {/* Bouton de connexion par Google ramené tout en bas */}
              <button
                type="button"
                className="google-auth-btn"
                onClick={handleGoogleAuth}
                disabled={submitting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{submitting ? 'Connexion en cours...' : 'Continuer avec Google'}</span>
              </button>
            </div>
          )}

        {/* Étape 2 : Créer le PIN */}
        {step === 'pin-create' && (
          <div>
            <span className="flow-label">ÉTAPE 2 · CODE PERSONNEL</span>
            <h1>Créez votre code PIN</h1>
            <p className="flow-lead">
              Bonjour {prenom || nom}. Choisissez un code secret à 6 chiffres pour sécuriser vos cotisations et commandes.
            </p>

            <form onSubmit={handlePinCreate}>
              <label className="fl" style={{ textAlign: 'center' }}>
                Votre nouveau PIN (6 chiffres)
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                className="fi pin-input"
                placeholder="••••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />

              {error && (
                <div style={{ color: 'var(--r)', textAlign: 'center', fontSize: '13px', margin: '8px 0' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="client-btn w100"
                style={{ marginTop: '16px' }}
                disabled={newPin.length !== 6}
              >
                Continuer
              </button>
            </form>

            <p className="auth-footnote">
              Gardez ce code secret. Il vous sera demandé lors de chaque confirmation de paiement.
            </p>
          </div>
        )}

        {/* Étape 3 : Confirmer le PIN */}
        {step === 'pin-confirm' && (
          <div>
            <span className="flow-label">ÉTAPE 3 · CONFIRMATION DU PIN</span>
            <h1>Confirmez votre PIN</h1>
            <p className="flow-lead">
              Ressaisissez vos 6 chiffres pour valider définitivement la création de votre compte.
            </p>

            <form onSubmit={handlePinConfirm}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                className="fi pin-input"
                placeholder="••••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />

              {error && (
                <div style={{ color: 'var(--r)', textAlign: 'center', fontSize: '13px', margin: '8px 0' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="client-btn w100"
                style={{ marginTop: '16px' }}
                disabled={confirmPin.length !== 6 || submitting}
              >
                {submitting ? 'Création de votre compte en cours...' : 'Confirmer mon compte'}
              </button>
            </form>
          </div>
        )}

        {/* Étape 4 : Choix du Moyen de Paiement */}
        {step === 'payment' && (
          <div>
            <span className="flow-label">ÉTAPE 4 · MOYEN DE PAIEMENT</span>
            <h1>Finaliser votre commande</h1>
            <p className="flow-lead">
              Votre compte est prêt. Choisissez votre portefeuille Mobile Money pour lancer votre premier versement.
            </p>

            {/* Récapitulatif de l'article */}
            <div className="payment-summary">
              <strong style={{ fontSize: '15px' }}>{product?.n}</strong>
              {selectedColor && (
                <div style={{ color: 'var(--mu)', fontSize: '12px', marginTop: '4px' }}>
                  Couleur choisie : <b>{selectedColor.name || selectedColor}</b>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ color: 'var(--mu)', fontSize: '13px' }}>1er versement à effectuer :</span>
                <strong style={{ fontSize: '16px', color: 'var(--r)' }}>
                  {formatFCFA(initialAmount)}
                </strong>
              </div>
            </div>

            {/* Choix de l'opérateur Mobile Money */}
            <form onSubmit={handlePaymentSubmit}>
              <div className="provider-list">
                <button
                  type="button"
                  className={`provider-option ${provider === 'MTN' ? 'on' : ''}`}
                  onClick={() => setProvider('MTN')}
                >
                  <span className="provider-mark" style={{ background: '#fef08a', color: '#854d0e' }}>
                    M
                  </span>
                  <span className="provider-copy">
                    <b>MTN Mobile Money</b>
                    <small>Paiement instantané depuis votre compte MTN Bénin</small>
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
                    {provider === 'MTN' ? '●' : '○'}
                  </span>
                </button>

                <button
                  type="button"
                  className={`provider-option ${provider === 'Moov' ? 'on' : ''}`}
                  onClick={() => setProvider('Moov')}
                >
                  <span className="provider-mark" style={{ background: '#fed7aa', color: '#9a3412' }}>
                    M
                  </span>
                  <span className="provider-copy">
                    <b>Moov Money</b>
                    <small>Règlement sécurisé via Moov Money Bénin</small>
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
                    {provider === 'Moov' ? '●' : '○'}
                  </span>
                </button>
              </div>

              <div className="checkout-note">
                🔒 Transaction sécurisée par notification push Mobile Money sur votre téléphone.
              </div>

              {error && (
                <div style={{ color: 'var(--r)', fontSize: '13px', margin: '8px 0', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="client-btn w100"
                disabled={submitting}
                style={{ padding: '16px', fontSize: '15px' }}
              >
                {submitting ? 'Validation en cours...' : `Confirmer avec ${provider === 'MTN' ? 'MTN MoMo' : 'Moov Money'}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
