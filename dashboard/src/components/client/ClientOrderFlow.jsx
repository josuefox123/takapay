import { useState, useEffect } from 'react';
import { FeexPayProvider, FeexPayButton } from '@feexpay/react-sdk';
import '@feexpay/react-sdk/style.css';
import { formatFCFA } from '../../data/clientStore';
import { adminService } from '../../services/adminService';
import ClientForgotPinModal from './ClientForgotPinModal';

export default function ClientOrderFlow({
  product,
  selectedColor,
  initialOrderType = 'cagnotte',
  initialQuantity = 1,
  initialDeposit = null,
  user,
  onUserAuthSuccess,
  onCompleteOrder,
  onBack,
}) {
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [activeUser, setActiveUser] = useState(() => {
    if (user) return user;
    try {
      const s = localStorage.getItem('takapay-client-user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  // Étapes : 'auth' -> 'pin-create' -> 'pin-confirm' -> 'payment'
  const [step, setStep] = useState(user || activeUser ? 'payment' : 'auth');
  const [authMode, setAuthMode] = useState('signup'); // 'signup' ou 'login'

  // Étape effective : si l'utilisateur est déjà connecté, orienter directement sur le paiement
  const currentStep = (user || activeUser) && step === 'auth' ? 'payment' : step;

  // Formulaire inscription
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('+229 ');
  const [email, setEmail] = useState(() => {
    const em = user?.email || activeUser?.email || '';
    return em && !em.endsWith('@client.takapay.bj') ? em : '';
  });
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
  const [authNotice, setAuthNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [orderType, setOrderType] = useState(initialOrderType || 'cagnotte'); // 'cagnotte' ou 'cash'
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [successModalData, setSuccessModalData] = useState(null);

  // Coordonnées de paiement pré-remplies (directement insérées et modifiables par le client)
  const [paymentPhone, setPaymentPhone] = useState(() => {
    return user?.telephone || user?.phone || activeUser?.telephone || activeUser?.phone || '';
  });
  const [paymentName, setPaymentName] = useState(() => {
    const u = user || activeUser;
    return `${u?.prenom || ''} ${u?.nom || ''}`.trim() || u?.nom || u?.n || '';
  });

  // Mode Cash : Choix entre Paiement à la livraison et Mobile Money
  const [cashPaymentMode, setCashPaymentMode] = useState('delivery'); // 'delivery' ou 'online'
  const [deliveryAddress, setDeliveryAddress] = useState(() => user?.adresse || activeUser?.adresse || '');
  const [deliveryPhone, setDeliveryPhone] = useState(() => user?.telephone || user?.phone || activeUser?.telephone || activeUser?.phone || '');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Synchronisation automatique des informations du client connecté ou inscrit
  useEffect(() => {
    const current = activeUser || user;
    if (current) {
      const full = `${current.prenom || ''} ${current.nom || ''}`.trim() || current.nom || current.n || '';
      const p = current.telephone || current.phone || '';
      const em = current.email && !current.email.endsWith('@client.takapay.bj') ? current.email : '';
      const adr = current.adresse || '';

      if (full) setPaymentName((prev) => prev || full);
      if (p) {
        setPaymentPhone((prev) => (prev && prev !== '+229 ' ? prev : p));
        setDeliveryPhone((prev) => (prev && prev !== '+229 ' ? prev : p));
      }
      if (adr) setDeliveryAddress((prev) => prev || adr);
      if (em) setEmail((prev) => prev || em);
    }
  }, [activeUser, user]);

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
        setActiveUser(loggedUser);
        setPaymentName(fullName);
        setPaymentPhone(loggedUser.phone);
        setDeliveryPhone(loggedUser.phone);
        if (loggedUser.adresse) setDeliveryAddress(loggedUser.adresse);
        if (loggedUser.email && !loggedUser.email.endsWith('@client.takapay.bj')) {
          setEmail(loggedUser.email);
        }
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
      setActiveUser(newUser);
      setPaymentName(fullName);
      setPaymentPhone(newUser.phone);
      setDeliveryPhone(newUser.phone);
      if (newUser.email && !newUser.email.endsWith('@client.takapay.bj')) {
        setEmail(newUser.email);
      }
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
  const minDeposit = (initialDeposit && Number(initialDeposit) > 0)
    ? Number(initialDeposit)
    : Math.max(
        1,
        product?.payment?.minimumStart
          ? Math.floor(product.payment.minimumStart * priceRatio)
          : Math.floor((effectivePrice * 10) / 100)
      );
  const effectiveQuantity = orderType === 'cash' ? Math.max(1, quantity) : 1;
  const paymentAmount = orderType === 'cash' ? (cashPrice * effectiveQuantity) : minDeposit;

  // Géolocalisation pour l'adresse de livraison
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur votre navigateur.');
      return;
    }
    setIsLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setDeliveryCoords(`${lat}, ${lng}`);

        // Nettoyer si le champ contenait déjà un ancien libellé GPS brut
        setDeliveryAddress((prev) => (prev && prev.startsWith('Position GPS') ? '' : prev));

        try {
          const res = await fetch(
            `https://api-bdc.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=fr`
          );
          if (res.ok) {
            const data = await res.json();
            const parts = [];
            const admin = data.localityInfo?.administrative || [];
            const subDistrict = admin.find((a) => a.adminLevel === 7 || a.adminLevel === 8)?.name;
            if (subDistrict && subDistrict !== data.city) parts.push(subDistrict);
            if (data.locality && data.locality !== data.city && !parts.includes(data.locality)) parts.push(data.locality);
            if (data.city) parts.push(data.city);
            else if (data.principalSubdivision) parts.push(data.principalSubdivision);
            const readableAddress = parts.join(', ');

            if (readableAddress) {
              setDeliveryAddress((prev) => {
                if (!prev || prev.startsWith('Position GPS')) return readableAddress;
                return prev.includes(readableAddress) ? prev : `${prev} (${readableAddress})`;
              });
            }
          }
        } catch {
          // Si le géocodage inverse échoue, les coordonnées restent enregistrées dans deliveryCoords sans polluer le champ d'adresse
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setError('Impossible d’accéder à votre position GPS. Veuillez renseigner l’adresse manuellement.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Soumission de commande avec paiement à la livraison (COD)
  const handleDeliveryOrderSubmit = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setError('Veuillez renseigner votre adresse de livraison.');
      return;
    }
    if (!deliveryPhone.trim()) {
      setError('Veuillez renseigner un numéro de téléphone joignable pour le livreur.');
      return;
    }
    setError('');
    setSubmitting(true);

    const orderRef = `CMD_COD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const initRes = await adminService.initiatePayment({
        amount: cashPrice * effectiveQuantity,
        produit_id: product?.id,
        type_paiement: 'cash',
        quantite: effectiveQuantity,
        moyen_paiement: 'livraison',
        user_id: activeUser?.id || user?.id,
        adresse_livraison: deliveryAddress.trim(),
        telephone_livraison: deliveryPhone.trim(),
        note_livraison: deliveryNote.trim(),
        coordonnees_gps: deliveryCoords,
      });

      const finalRef = initRes?.reference || orderRef;
      setSuccessModalData({
        product: { ...product, p: effectivePrice },
        selectedColor,
        provider: 'Paiement à la livraison',
        initialAmount: 0,
        totalPrice: cashPrice * effectiveQuantity,
        reference: finalRef,
        transactionId: finalRef,
        date: new Date().toISOString(),
        isCash: true,
        isCod: true,
        quantity: effectiveQuantity,
        deliveryAddress: deliveryAddress.trim(),
        deliveryPhone: deliveryPhone.trim(),
        deliveryNote: deliveryNote.trim(),
        deliveryCoords,
        commandeId: initRes?.commande_id || null,
        backendId: initRes?.cagnotte_id || null,
        message: 'La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.',
      });
    } catch {
      setSuccessModalData({
        product: { ...product, p: effectivePrice },
        selectedColor,
        provider: 'Paiement à la livraison',
        initialAmount: 0,
        totalPrice: cashPrice * effectiveQuantity,
        reference: orderRef,
        transactionId: orderRef,
        date: new Date().toISOString(),
        isCash: true,
        isCod: true,
        quantity: effectiveQuantity,
        deliveryAddress: deliveryAddress.trim(),
        deliveryPhone: deliveryPhone.trim(),
        deliveryNote: deliveryNote.trim(),
        deliveryCoords,
        commandeId: null,
        message: 'La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Étape 4 : Initiation et Validation Paiement FeexPay
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!provider) {
      setError('Veuillez choisir votre moyen de paiement.');
      return;
    }
    if (!paymentPhone.trim()) {
      setError('Veuillez renseigner votre numéro de téléphone Mobile Money.');
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
        user_id: activeUser?.id || user?.id,
        telephone: paymentPhone.trim(),
        client_nom: paymentName.trim(),
        client_email: (email && email.trim()) || null,
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
          user_id: activeUser?.id || user?.id,
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', marginBottom: '6px' }}>
                      <label className="fl" htmlFor="login-pin" style={{ margin: 0 }}>Code PIN ou mot de passe</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPinModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--r, #c62828)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Code oublié ?
                      </button>
                    </div>
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

                {authNotice && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', margin: '8px 0', fontWeight: 600 }}>
                    {authNotice}
                  </div>
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
                      {product?.payment?.mode === 'libre'
                        ? "Cotisations libres · Récupération dès 100% de la cagnotte atteinte"
                        : "Cotisations échelonnées sécurisées"}
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

            {/* Sélecteur de méthode de règlement en mode CASH */}
            {orderType === 'cash' && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--tx)' }}>
                  Choisissez votre méthode de règlement :
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setCashPaymentMode('delivery'); setPaymentData(null); }}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: cashPaymentMode === 'delivery' ? '2px solid var(--p, #dc2626)' : '1.5px solid #ded6ce',
                      background: cashPaymentMode === 'delivery' ? 'rgba(220,38,38,0.06)' : '#ffffff',
                      color: cashPaymentMode === 'delivery' ? 'var(--p, #dc2626)' : '#1b1716',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>🚚</span>
                    Paiement à la livraison
                    <small style={{ display: 'block', fontSize: '11px', color: '#706966', marginTop: '2px' }}>
                      Règlement au livreur
                    </small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCashPaymentMode('online')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: cashPaymentMode === 'online' ? '2px solid var(--p, #dc2626)' : '1.5px solid #ded6ce',
                      background: cashPaymentMode === 'online' ? 'rgba(220,38,38,0.06)' : '#ffffff',
                      color: cashPaymentMode === 'online' ? 'var(--p, #dc2626)' : '#1b1716',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📱</span>
                    Mobile Money
                    <small style={{ display: 'block', fontSize: '11px', color: '#706966', marginTop: '2px' }}>
                      Payer en ligne
                    </small>
                  </button>
                </div>
              </div>
            )}

            {/* CAS 1 : Paiement à la livraison */}
            {orderType === 'cash' && cashPaymentMode === 'delivery' ? (
              <form onSubmit={handleDeliveryOrderSubmit}>
                {/* Information disponibilité */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '20px' }}>ℹ️</span>
                    <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                      <b>Information commande :</b><br />
                      La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.
                      Vous réglerez <b>{formatFCFA(paymentAmount)}</b> en espèces directement au livreur.
                    </div>
                  </div>
                </div>

                {/* Adresse de livraison */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="fl" htmlFor="delivery-address" style={{ margin: 0 }}>
                      Adresse de livraison *
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user?.adresse && (
                        <button
                          type="button"
                          onClick={() => setDeliveryAddress(user.adresse)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0369a1',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Mon adresse de profil
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--p, #dc2626)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: isLocating ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        📍 {isLocating ? 'Localisation...' : 'Ma position'}
                      </button>
                    </div>
                  </div>
                  <input
                    id="delivery-address"
                    type="text"
                    required
                    className="fi"
                    placeholder="Ex: Cotonou, Akpakpa, rue 124, maison jaune"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                  {deliveryCoords && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>
                          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>check_circle</span>
                          <span>Position enregistrée avec succès pour la livraison</span>
                        </small>
                        <a
                          href={`https://www.google.com/maps?q=${deliveryCoords.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>open_in_new</span>
                          <span>Google Maps</span>
                        </a>
                      </div>
                      <iframe
                        title="Aperçu Google Maps de livraison"
                        width="100%"
                        height="130"
                        style={{
                          border: '1px solid var(--bd, #e2e8f0)',
                          borderRadius: '8px',
                          display: 'block',
                        }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${deliveryCoords.replace(/\s+/g, '')}&hl=fr&z=15&output=embed`}
                      />
                    </div>
                  )}
                </div>

                {/* Numéro pour le livreur */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="fl" htmlFor="delivery-phone">
                    Numéro de téléphone à contacter par le livreur *
                  </label>
                  <input
                    id="delivery-phone"
                    type="tel"
                    required
                    className="fi"
                    placeholder="+229 97 00 00 00"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                  />
                  <small style={{ color: '#706966', fontSize: '11.5px', display: 'block', marginTop: '4px' }}>
                    Le livreur vous appellera sur ce numéro pour coordonner la remise en main propre.
                  </small>
                </div>

                {/* Note facultative */}
                <div style={{ marginBottom: '18px' }}>
                  <label className="fl" htmlFor="delivery-note">
                    Note d’information pour le livreur (facultatif)
                  </label>
                  <input
                    id="delivery-note"
                    type="text"
                    className="fi"
                    placeholder="Ex: Repère, sonnerie, instructions d'accès..."
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="client-btn w100"
                  disabled={submitting}
                  style={{ padding: '16px', fontSize: '15px' }}
                >
                  {submitting ? 'Enregistrement de la commande...' : 'Confirmer la commande (Paiement à la livraison)'}
                </button>
              </form>
            ) : paymentData ? (
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
                      fullname: paymentName.trim() || `${activeUser?.prenom || user?.prenom || prenom || ''} ${activeUser?.nom || user?.nom || nom || ''}`.trim() || 'Client',
                      first_name: (paymentName.trim().split(' ')[0]) || activeUser?.prenom || user?.prenom || prenom || 'Client',
                      last_name: (paymentName.trim().split(' ').slice(1).join(' ')) || activeUser?.nom || user?.nom || nom || '',
                      email: (email && email.trim()) || (activeUser?.email && !activeUser.email.endsWith('@client.takapay.bj') ? activeUser.email : '') || '',
                      phone: paymentPhone.trim() || activeUser?.telephone || activeUser?.phone || user?.telephone || user?.phone || phone || '',
                      phoneNumber: paymentPhone.trim() || activeUser?.telephone || activeUser?.phone || user?.telephone || user?.phone || phone || '',
                      reseau: provider === 'Moov' ? 'MOOV' : 'MTN',
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
 
                {/* Coordonnées de paiement pré-remplies (directement insérées, modifiables) */}
                <div style={{ marginTop: '16px', marginBottom: '14px' }}>
                  <label className="fl" htmlFor="client-payment-phone">
                    Numéro Mobile Money pour le débit *
                  </label>
                  <input
                    id="client-payment-phone"
                    type="tel"
                    required
                    className="fi"
                    placeholder="+229 97 00 00 00"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                  />
                  <small style={{ color: '#706966', fontSize: '11.5px', display: 'block', marginTop: '4px' }}>
                    Numéro enregistré à l’inscription. Vous pouvez l’effacer et le remplacer si vous payez depuis un autre numéro.
                  </small>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="fl" htmlFor="client-payment-name">
                    Nom et prénom du client *
                  </label>
                  <input
                    id="client-payment-name"
                    type="text"
                    required
                    className="fi"
                    placeholder="Ex: Jean DOSSOU"
                    value={paymentName}
                    onChange={(e) => setPaymentName(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="fl" htmlFor="client-receipt-email">
                    Adresse email pour recevoir le reçu {(!email || email.endsWith('@client.takapay.bj')) ? '(facultatif)' : ''}
                  </label>
                  <input
                    id="client-receipt-email"
                    type="email"
                    className="fi"
                    placeholder="Ex: votre.email@gmail.com"
                    value={email && !email.endsWith('@client.takapay.bj') ? email : ''}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

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
              {successModalData.isCod
                ? 'Commande enregistrée avec succès !'
                : successModalData.isCash
                ? 'Paiement confirmé avec succès !'
                : 'Félicitations ! Votre cagnotte est créée !'}
            </h2>

            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 20px' }}>
              {successModalData.isCod ? (
                <>
                  <b style={{ color: '#0369a1', display: 'block', marginBottom: '6px' }}>
                    📢 La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.
                  </b>
                  Votre commande pour <b>{successModalData.product?.n}</b> a bien été enregistrée. Le règlement de <b>{formatFCFA(successModalData.totalPrice)}</b> s’effectuera directement auprès du livreur à la réception.
                </>
              ) : successModalData.isCash ? (
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
                <span style={{ color: '#6b7280' }}>Mode de règlement :</span>
                <span style={{ fontWeight: 700, color: successModalData.isCod ? '#0369a1' : '#16a34a' }}>
                  {successModalData.provider}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Total à régler :</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{formatFCFA(successModalData.totalPrice)}</span>
              </div>
              {successModalData.deliveryAddress && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '6px', marginTop: '6px' }}>
                  <span style={{ color: '#6b7280' }}>Adresse :</span>
                  <span style={{ fontWeight: 600, color: '#111827', maxWidth: '60%', textAlign: 'right' }}>
                    {successModalData.deliveryAddress}
                  </span>
                </div>
              )}
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

      {/* Modale de réinitialisation sécurisée du code PIN (par Email ou SMS) */}
      <ClientForgotPinModal
        isOpen={showForgotPinModal}
        onClose={() => setShowForgotPinModal(false)}
        initialIdentifiant={loginId}
        onSuccess={(resetId, successMsg) => {
          setShowForgotPinModal(false);
          setStep('auth');
          setAuthMode('login');
          if (resetId) {
            setLoginId(resetId);
          }
          setLoginPin('');
          setError('');
          setAuthNotice(successMsg || 'Code PIN modifié avec succès ! Veuillez vous connecter avec votre nouveau code PIN.');
        }}
      />
    </div>
  );
}
