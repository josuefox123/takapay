import { useState } from 'react';
import { FeexPayProvider, FeexPayButton } from '@feexpay/react-sdk';
import '@feexpay/react-sdk/style.css';
import { formatFCFA } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

export default function ClientOrderFlow({
  product,
  selectedColor,
  initialOrderType = 'cagnotte',
  initialQuantity = 1,
  user,
  onUserAuthSuccess,
  onCompleteOrder,
  onBack,
}) {
  // Étapes : 'auth' -> 'pin-create' -> 'pin-confirm' -> 'payment'
  const [step, setStep] = useState(user ? 'payment' : 'auth');
  const [authMode, setAuthMode] = useState('signup'); // 'signup' ou 'login'

  // Étape effective : si l'utilisateur est déjà connecté, orienter directement sur le paiement
  const currentStep = user && step === 'auth' ? 'payment' : step;

  // Formulaire inscription
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('+229 ');
  const [email, setEmail] = useState(user?.email && !user.email.endsWith('@client.takapay.bj') ? user.email : '');
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
  const [paymentData, setPaymentData] = useState(null);
  const [orderType, setOrderType] = useState(initialOrderType || 'cagnotte'); // 'cagnotte' ou 'cash'
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [successModalData, setSuccessModalData] = useState(null);

  // Connexion Google
  const handleGoogleAuth = async () => {
    setError('La connexion directe avec Google sera disponible prochainement. Veuillez vous inscrire ou vous connecter avec votre numéro de téléphone.');
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
      const digits = phone.replace(/\D/g, '');
      const localDigits = phone.includes('+229') || digits.startsWith('229') ? digits.replace(/^229/, '') : digits;
      if (localDigits.length < 8) {
        setError('Veuillez renseigner un numéro de téléphone valide (au moins 8 chiffres).');
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
      if (!loginPin.trim()) {
        setError('Veuillez renseigner votre code PIN ou mot de passe.');
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

  const effectivePrice = selectedColor?.price || product?.p || 0;
  const cashPrice = Number(product?.prix_cash || product?.payment?.prixCash || effectivePrice);
  const basePrice = product?.p && product.p > 0 ? product.p : effectivePrice;
  const priceRatio = basePrice > 0 ? effectivePrice / basePrice : 1;
  const minDeposit = Math.max(
    100,
    product?.payment?.minimumStart
      ? Math.round(product.payment.minimumStart * priceRatio)
      : Math.round(effectivePrice * 0.1)
  );
  const effectiveQuantity = orderType === 'cash' ? Math.max(1, quantity) : 1;
  const paymentAmount = orderType === 'cash' ? (cashPrice * effectiveQuantity) : minDeposit;

  // Étape 4 : Initiation et Validation Paiement FeexPay
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!provider) {
      setError('Veuillez choisir votre moyen de paiement.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const initRes = await adminService.initiatePayment({
        amount: paymentAmount,
        produit_id: product?.id,
        type_paiement: orderType,
        quantite: effectiveQuantity,
        moyen_paiement: provider,
        user_id: user?.id,
      });
      setPaymentData(initRes);
    } catch (err) {
      setError(err.message || 'Impossible d’initialiser le paiement avec FeexPay.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeexpayCallback = async (response) => {
    console.log('FeexPay callback reçu :', response);
    const isSuccess = response && (
      response.status?.toUpperCase() === 'SUCCESSFUL' ||
      response.status?.toUpperCase() === 'SUCCESS' ||
      response.status?.toUpperCase() === 'PAID'
    );

    if (isSuccess) {
      const orderRef = paymentData?.reference || response.reference;
      const customerEmail = response.email || (email && email.trim()) || (user?.email && !user.email.endsWith('@client.takapay.bj') ? user.email : null);
      try {
        await adminService.confirmPayment({
          reference: orderRef,
          status: 'successful',
          transaction_id: response.transaction_id || response.reference || orderRef,
          amount: response.amount || paymentAmount,
          reseau: response.reseau || provider,
          user_id: user?.id,
          client_email: customerEmail,
        });

        // Persister l'adresse email réelle sur le profil utilisateur
        if (customerEmail && user && (!user.email || user.email.endsWith('@client.takapay.bj'))) {
          const updatedUser = { ...user, email: customerEmail };
          onUserAuthSuccess(updatedUser, 'Paiement confirmé ! Votre reçu sera envoyé par email.');
        }

        // Afficher le popup de félicitations avant la redirection vers les cagnottes ou commandes
        setSuccessModalData({
          product: { ...product, p: effectivePrice },
          selectedColor,
          provider: response.reseau || provider,
          initialAmount: paymentAmount,
          totalPrice: orderType === 'cash' ? (cashPrice * effectiveQuantity) : effectivePrice,
          reference: orderRef,
          transactionId: response.transaction_id || orderRef,
          date: new Date().toISOString(),
          isCash: orderType === 'cash',
          quantity: effectiveQuantity,
        });
      } catch (err) {
        console.error('Erreur confirmation backend :', err);
        setError(`Votre paiement a été validé par FeexPay mais la confirmation sur le serveur a échoué (${err.message || 'erreur réseau'}). Veuillez contacter le support avec la référence : ${orderRef}`);
      }
    } else {
      setError(response?.message || 'Le paiement FeexPay a été annulé ou n’a pas abouti.');
    }
  };

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
          {currentStep === 'auth' && (
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

                    <label className="fl" htmlFor="login-pin">Code PIN ou mot de passe</label>
                    <input
                      id="login-pin"
                      type="password"
                      required
                      className="fi"
                      placeholder="••••••"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
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
        {currentStep === 'pin-create' && (
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

              <button
                type="button"
                onClick={() => { setError(''); setStep('auth'); }}
                style={{
                  marginTop: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--mu)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                ← Modifier mes coordonnées
              </button>
            </form>

            <p className="auth-footnote">
              Gardez ce code secret. Il vous sera demandé lors de chaque confirmation de paiement.
            </p>
          </div>
        )}

        {/* Étape 3 : Confirmer le PIN */}
        {currentStep === 'pin-confirm' && (
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
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  <div style={{ color: 'var(--r)', fontSize: '13px', fontWeight: 600 }}>
                    {error}
                  </div>
                  {error.toLowerCase().includes('connecter') && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setAuthMode('login');
                        setLoginId(phone.trim());
                        setStep('auth');
                      }}
                      style={{
                        marginTop: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--p, #c62828)',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Se connecter avec ce numéro
                    </button>
                  )}
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

              <button
                type="button"
                onClick={() => { setError(''); setStep('pin-create'); }}
                disabled={submitting}
                style={{
                  marginTop: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--mu)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                ← Modifier le code PIN
              </button>
            </form>
          </div>
        )}

        {/* Étape 4 : Choix du Moyen de Paiement */}
        {currentStep === 'payment' && (
          <div>
            <span className="flow-label">ÉTAPE 4 · MOYEN DE PAIEMENT</span>
            <h1>Finaliser votre commande</h1>
            <p className="flow-lead">
              Votre compte est prêt. Choisissez votre portefeuille Mobile Money pour lancer votre premier versement.
            </p>

            {/* Affichage exclusif de la modalité de règlement sélectionnée */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--tx)' }}>
                Modalité de règlement :
              </div>
              {orderType === 'cash' ? (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #1e293b',
                    background: 'rgba(30, 41, 59, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                      💵 Paiement comptant
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '3px' }}>
                      Règlement direct intégral
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: 'rgba(30, 41, 59, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                    {formatFCFA(cashPrice)} / article
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--r)',
                    background: 'rgba(220, 38, 38, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--r)' }}>
                      🎯 Mode Cagnotte Takapay
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '3px' }}>
                      Cotisations échelonnées sécurisées
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--r)', background: 'rgba(220, 38, 38, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                    1er versement : {formatFCFA(minDeposit)}
                  </span>
                </div>
              )}
            </div>

            {/* Récapitulatif de l'article */}
            <div className="payment-summary">
              <strong style={{ fontSize: '15px' }}>{product?.n}</strong>
              {selectedColor && (
                <div style={{ color: 'var(--mu)', fontSize: '12px', marginTop: '4px' }}>
                  Couleur choisie : <b>{selectedColor.name || selectedColor}</b>
                </div>
              )}

              {orderType === 'cash' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ color: 'var(--mu)', fontSize: '13px' }}>Quantité commandée :</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => { setQuantity((q) => Math.max(1, q - 1)); setPaymentData(null); }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--bd)', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', fontWeight: 800 }}
                    >
                      −
                    </button>
                    <b style={{ fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>{quantity}</b>
                    <button
                      type="button"
                      onClick={() => { setQuantity((q) => q + 1); setPaymentData(null); }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--bd)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--mu)', fontSize: '12px', marginTop: '6px' }}>
                  Quantité : <b>1 article</b>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ color: 'var(--mu)', fontSize: '13px' }}>
                  {orderType === 'cash' ? `Total comptant (${effectiveQuantity} × ${formatFCFA(cashPrice)}) :` : '1er versement à effectuer :'}
                </span>
                <strong style={{ fontSize: '16px', color: 'var(--r)' }}>
                  {formatFCFA(paymentAmount)}
                </strong>
              </div>
            </div>

            {/* Affichage des erreurs au niveau global de l'étape de paiement */}
            {error && (
              <div style={{ color: 'var(--r)', fontSize: '13px', margin: '12px 0', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Choix de l'opérateur Mobile Money et Déclenchement FeexPay */}
            {paymentData ? (
              <FeexPayProvider>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ marginBottom: '14px', padding: '12px', background: 'rgba(22, 163, 74, 0.08)', borderRadius: '10px', fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                    Commande prête (Réf: {paymentData.reference}). Cliquez ci-dessous pour ouvrir le module sécurisé FeexPay.
                  </div>

                  <FeexPayButton
                    id={paymentData.shop_id}
                    token={paymentData.api_key}
                    amount={paymentData.amount}
                    description={`Takapay - ${product?.n || 'Commande'}`}
                    mode={paymentData.mode || 'SANDBOX'}
                    currency="XOF"
                    customId={paymentData.reference}
                    callback_info={{
                      first_name: user?.prenom || user?.nom || prenom || nom || 'Client',
                      email: (email && email.trim()) || user?.email || '',
                    }}
                    callback={handleFeexpayCallback}
                    buttonText={`Payer ${formatFCFA(paymentAmount)} avec FeexPay`}
                    buttonClass="client-btn w100"
                  />

                  <button
                    type="button"
                    onClick={() => setPaymentData(null)}
                    style={{
                      marginTop: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--mu)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      textDecoration: 'underline',
                    }}
                  >
                    ← Changer d'opérateur ou modifier
                  </button>
                </div>
              </FeexPayProvider>
            ) : (
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
 
                {(!user?.email || user.email.endsWith('@client.takapay.bj')) && (
                  <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                    <label className="fl" htmlFor="client-receipt-email">
                      Votre adresse email pour recevoir le reçu (recommandé)
                    </label>
                    <input
                      id="client-receipt-email"
                      type="email"
                      className="fi"
                      placeholder="Ex: votre.email@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="checkout-note">
                  🔒 Transaction sécurisée par notification push Mobile Money sur votre téléphone via FeexPay.
                </div>

                <button
                  type="submit"
                  className="client-btn w100"
                  disabled={submitting}
                  style={{ padding: '16px', fontSize: '15px' }}
                >
                  {submitting ? 'Préparation FeexPay...' : `Valider avec ${provider === 'MTN' ? 'MTN MoMo' : 'Moov Money'}`}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Modal Popup de Félicitations après paiement */}
      {successModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
                fontSize: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)',
              }}
            >
              🎉
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
              {successModalData.isCash
                ? 'Paiement confirmé avec succès !'
                : 'Félicitations ! Votre cagnotte est créée !'}
            </h2>

            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 20px' }}>
              {successModalData.isCash ? (
                <>
                  Votre règlement comptant de <b>{formatFCFA(successModalData.initialAmount)}</b> pour <b>{successModalData.product?.n}</b> a bien été validé. Votre commande est prise en charge !
                </>
              ) : (
                <>
                  Votre premier versement de <b>{formatFCFA(successModalData.initialAmount)}</b> pour <b>{successModalData.product?.n}</b> a été validé par FeexPay. Votre cagnotte est active !
                </>
              )}
            </p>

            <div
              style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '13px',
                textAlign: 'left',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Référence :</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{successModalData.reference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Montant versé :</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatFCFA(successModalData.initialAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Prix total de l’article :</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{formatFCFA(successModalData.totalPrice)}</span>
              </div>
            </div>

            <button
              type="button"
              className="client-btn w100"
              style={{
                padding: '14px',
                fontSize: '15px',
                fontWeight: 800,
                borderRadius: '12px',
              }}
              onClick={() => onCompleteOrder(successModalData)}
            >
              {successModalData.isCash ? 'Voir mes commandes →' : 'Accéder à mes cagnottes →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
