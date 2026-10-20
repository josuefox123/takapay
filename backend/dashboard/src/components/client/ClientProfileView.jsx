import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function ClientProfileView({
  user = null,
  onLogout,
  onBack,
  onShowToast,
  onUpdateUser,
}) {
  // États d'authentification pour visiteur non connecté
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Formulaire connexion
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Formulaire inscription
  const [signupNom, setSignupNom] = useState('');
  const [signupPrenom, setSignupPrenom] = useState('');
  const [signupPhone, setSignupPhone] = useState('+229 ');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPin, setSignupPin] = useState('');
  const [signupConfirmPin, setSignupConfirmPin] = useState('');
  const [signupTerms, setSignupTerms] = useState(true);

  // Modals interactifs pour utilisateur connecté
  const [activeModal, setActiveModal] = useState(null); // 'edit_profile' | 'history' | 'notifications' | 'help' | 'settings' | 'terms' | 'privacy'

  // Formulaire d'édition de profil
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ville, setVille] = useState('Cotonou');
  const [adresse, setAdresse] = useState('');

  // Mise à jour automatique des champs lorsque l'utilisateur connecté change
  useEffect(() => {
    if (user) {
      const full = (user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.nom || user.n || '').trim();
      setNom(full || user.nom || user.n || '');
      setPhone(user.telephone || user.phone || '');
      setEmail(user.email || '');
      if (user.ville) setVille(user.ville);
      if (user.adresse) setAdresse(user.adresse);
    }
  }, [user]);

  // Formulaire préférences notifications
  const [notifySms, setNotifySms] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Formulaire code PIN (dans le profil connecté)
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Gestion Connexion / Inscription si l'utilisateur n'est pas connecté
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'login') {
      if (!loginId.trim()) {
        setAuthError('Veuillez renseigner votre téléphone ou email.');
        return;
      }
      if (loginPin.length !== 6) {
        setAuthError('Le code PIN doit comporter 6 chiffres.');
        return;
      }

      setIsSubmittingAuth(true);
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
        if (onUpdateUser) onUpdateUser(loggedUser, 'Connexion réussie.');
      } catch (err) {
        setAuthError(err.message || 'Identifiant ou code PIN incorrect.');
      } finally {
        setIsSubmittingAuth(false);
      }
    } else {
      if (!signupNom.trim()) {
        setAuthError('Veuillez renseigner votre nom.');
        return;
      }
      if (!signupPrenom.trim()) {
        setAuthError('Veuillez renseigner votre prénom.');
        return;
      }
      if (signupPhone.replace(/\D/g, '').length < 8) {
        setAuthError('Veuillez renseigner un numéro de téléphone valide.');
        return;
      }
      if (signupPin.length !== 6) {
        setAuthError('Le code PIN doit comporter exactement 6 chiffres.');
        return;
      }
      if (signupPin !== signupConfirmPin) {
        setAuthError('La confirmation du code PIN ne correspond pas.');
        return;
      }
      if (!signupTerms) {
        setAuthError('Veuillez accepter les conditions d’utilisation.');
        return;
      }

      setIsSubmittingAuth(true);
      try {
        const payload = {
          nom: signupNom.trim(),
          prenom: signupPrenom.trim(),
          telephone: signupPhone.trim(),
          email: signupEmail.trim() || null,
          code_pin: signupPin,
          code_pin_confirmation: signupConfirmPin,
        };
        const result = await adminService.registerClient(payload);
        const backendUser = result.user || {};
        const fullName = `${backendUser.prenom || ''} ${backendUser.nom || ''}`.trim() || backendUser.nom || `${signupPrenom.trim()} ${signupNom.trim()}`;
        const newUser = {
          ...backendUser,
          n: fullName,
          nom: backendUser.nom || signupNom.trim(),
          prenom: backendUser.prenom || signupPrenom.trim(),
          phone: backendUser.telephone || signupPhone.trim(),
          email: backendUser.email || signupEmail.trim(),
          code_pin: backendUser.code_pin || signupPin,
          photo_profil: backendUser.photo_profil || null,
          avatar: backendUser.photo_profil || null,
          id: backendUser.id || signupPhone.trim(),
        };
        if (onUpdateUser) onUpdateUser(newUser, result.message || 'Compte créé avec succès !');
      } catch (err) {
        setAuthError(err.message || 'Erreur lors de la création de votre compte.');
      } finally {
        setIsSubmittingAuth(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      const googlePayload = {
        nom: 'DOSSOU',
        prenom: 'Koffi',
        email: 'koffi.dossou@gmail.com',
        telephone: '+229 01 62 18 02 90',
        photo_profil: null,
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
      if (onUpdateUser) onUpdateUser(loggedUser, result.message || 'Compte créé avec succès !');
    } catch (err) {
      setAuthError(err.message || 'Erreur lors de la connexion Google.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = {
      ...user,
      n: nom.trim(),
      nom: nom.trim(),
      phone: phone.trim(),
      email: email.trim(),
      ville,
      adresse,
    };
    if (onUpdateUser) onUpdateUser(updated);
    if (onShowToast) onShowToast('Vos informations de profil ont été mises à jour.');
    setActiveModal(null);
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      alert('Le code PIN doit comporter exactement 6 chiffres.');
      return;
    }
    if (newPin !== confirmPin) {
      alert('La confirmation du code PIN ne correspond pas.');
      return;
    }
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    if (onShowToast) onShowToast('Votre code PIN de sécurité a été modifié.');
    setActiveModal(null);
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    if (onShowToast) onShowToast('Vos préférences de notification ont été enregistrées.');
    setActiveModal(null);
  };

  // 1. SI NON CONNECTÉ : Afficher le formulaire de connexion / création de compte
  if (!user) {
    return (
      <div style={{ maxWidth: '560px', margin: '24px auto', padding: '16px 20px 60px' }}>
        {onBack && (
          <div style={{ marginBottom: '18px' }}>
            <button
              type="button"
              className="back-link"
              onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Retour à l’accueil
            </button>
          </div>
        )}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #eee7e0',
            padding: '36px 30px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                lock
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b1716', margin: '0 0 8px' }}>
              {authMode === 'login' ? 'Connexion à votre espace client' : 'Créer votre compte client'}
            </h1>
            <p style={{ color: '#706966', fontSize: '14px', margin: 0 }}>
              {authMode === 'login'
                ? 'Renseignez votre numéro de téléphone et votre code PIN pour accéder à votre profil et vos cagnottes.'
                : 'Créez votre compte en quelques instants pour gérer vos cotisations et vos commandes.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'signup' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="fl" htmlFor="profile-signup-nom" style={{ marginTop: 0 }}>Nom *</label>
                    <input
                      id="profile-signup-nom"
                      type="text"
                      required
                      className="fi"
                      placeholder="Ex: DOSSOU"
                      value={signupNom}
                      onChange={(e) => setSignupNom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="fl" htmlFor="profile-signup-prenom" style={{ marginTop: 0 }}>Prénom *</label>
                    <input
                      id="profile-signup-prenom"
                      type="text"
                      required
                      className="fi"
                      placeholder="Ex: Koffi"
                      value={signupPrenom}
                      onChange={(e) => setSignupPrenom(e.target.value)}
                    />
                  </div>
                </div>

                <label className="fl" htmlFor="profile-signup-phone">Numéro de téléphone (Mobile Money) *</label>
                <input
                  id="profile-signup-phone"
                  type="tel"
                  required
                  className="fi"
                  placeholder="Ex: +229 97 00 00 00"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                />

                <label className="fl" htmlFor="profile-signup-email">Email (facultatif)</label>
                <input
                  id="profile-signup-email"
                  type="email"
                  className="fi"
                  placeholder="koffi@exemple.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="fl" htmlFor="profile-signup-pin">Code PIN (6 chiffres) *</label>
                    <input
                      id="profile-signup-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      className="fi"
                      placeholder="••••••"
                      value={signupPin}
                      onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                  <div>
                    <label className="fl" htmlFor="profile-signup-pin-confirm">Confirmez le PIN *</label>
                    <input
                      id="profile-signup-pin-confirm"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      className="fi"
                      placeholder="••••••"
                      value={signupConfirmPin}
                      onChange={(e) => setSignupConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>

                <label className="terms-check" style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: '#555' }}>
                  <input
                    type="checkbox"
                    checked={signupTerms}
                    onChange={(e) => setSignupTerms(e.target.checked)}
                  />
                  <span>
                    J'accepte les conditions d'utilisation Takapay.
                  </span>
                </label>
              </>
            ) : (
              <>
                <label className="fl" htmlFor="profile-login-id" style={{ marginTop: 0 }}>Téléphone ou email</label>
                <input
                  id="profile-login-id"
                  type="text"
                  required
                  className="fi"
                  placeholder="Ex: +229 97 00 00 00"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                />

                <label className="fl" htmlFor="profile-login-pin">Code PIN personnel (6 chiffres)</label>
                <input
                  id="profile-login-pin"
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

            {authError && (
              <div style={{ color: 'var(--r)', fontSize: '13px', margin: '12px 0 6px', fontWeight: 600 }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="client-btn w100"
              style={{ marginTop: '20px', padding: '14px', fontSize: '15px' }}
              disabled={isSubmittingAuth}
            >
              {isSubmittingAuth
                ? 'Traitement en cours...'
                : authMode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </button>
          </form>

          <p className="auth-alternate" style={{ textAlign: 'center', marginTop: '18px', fontSize: '14px', color: '#706966' }}>
            {authMode === 'login' ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'}{' '}
            <button
              type="button"
              style={{
                color: 'var(--r)',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => {
                setAuthError('');
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
              }}
            >
              {authMode === 'login' ? 'Créer un compte' : 'Connectez-vous'}
            </button>
          </p>

          <div className="auth-separator" style={{ margin: '20px 0 16px' }}>
            <span>ou</span>
          </div>

          <button
            type="button"
            className="google-auth-btn"
            onClick={handleGoogleAuth}
            disabled={isSubmittingAuth}
            style={{ marginTop: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isSubmittingAuth ? 'Connexion...' : 'Continuer avec Google'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. SI CONNECTÉ : Afficher le profil complet de l'utilisateur
  const profileUser = user;
  const userDisplayName = (profileUser.prenom && profileUser.nom
    ? `${profileUser.prenom} ${profileUser.nom}`
    : profileUser.nom || profileUser.n || profileUser.prenom || 'Client Takapay').trim();
  const userInitial = (profileUser.nom || profileUser.prenom || profileUser.n || 'T').trim().charAt(0).toUpperCase() || 'T';
  const hasUserPhoto = Boolean(profileUser.photo_profil || profileUser.avatar);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* 1. Bouton retour & Titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1.5px solid #ece5de',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#1b1716',
              fontWeight: 800,
            }}
          >
            ‹
          </button>
        )}

        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1b1716', margin: 0, letterSpacing: '-0.5px' }}>
            Profil
          </h1>
          <p style={{ margin: '4px 0 0', color: '#706966', fontSize: '13.5px' }}>
            Gérez vos coordonnées, vos options de sécurité et vos préférences.
          </p>
        </div>
      </div>

      {/* 2. Carte principale de Profil (Photo 2) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #eee7e0',
          padding: '24px',
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {/* Avatar avec cercle photo ou initiale du nom, liseré doré et bouton d'édition orange */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: '98px',
              height: '98px',
              borderRadius: '50%',
              border: '3.5px solid #f59e0b',
              overflow: 'hidden',
              background: hasUserPhoto ? '#fef3c7' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {hasUserPhoto ? (
              <img
                src={profileUser.photo_profil || profileUser.avatar}
                alt={userDisplayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div style="display:grid;place-items:center;height:100%;font-size:38px;font-weight:800;color:#ffffff;background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);width:100%;">${userInitial}</div>`;
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 800,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {userInitial}
              </span>
            )}
          </div>

          {/* Bouton d'édition d'avatar */}
          <button
            type="button"
            title="Modifier la photo de profil"
            onClick={() => {
              if (onShowToast) onShowToast('Prêt pour sélection photo : importez votre nouvel avatar.');
            }}
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f59e0b',
              border: '2.5px solid #ffffff',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        {/* Détails utilisateur */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b1716', margin: '0 0 6px' }}>
              {userDisplayName}
            </h2>

            {/* Crayon rouge d'édition */}
            <button
              type="button"
              title="Modifier mes informations"
              onClick={() => setActiveModal('edit_profile')}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                padding: '4px',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>

          {/* Numéro de téléphone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#2b2624', marginBottom: '5px' }}>
            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
              </svg>
            </span>
            <span style={{ fontWeight: 600 }}>{profileUser.telephone || profileUser.phone || 'Non renseigné'}</span>
          </div>

          {/* Adresse Email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#2b2624', marginBottom: '10px' }}>
            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </span>
            <span style={{ fontWeight: 500 }}>{profileUser.email || 'Non renseigné'}</span>
          </div>

          {/* Badge de compte vérifié */}
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '99px',
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '11.5px',
                fontWeight: 700,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Compte vérifié
            </span>
          </div>
        </div>
      </div>

      {/* 3. Menu Groupe 1 (Photo 2) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '22px',
          border: '1px solid #eee7e0',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          marginBottom: '20px',
        }}
      >
        {/* Item 1 : Historique */}
        <button
          type="button"
          onClick={() => setActiveModal('history')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #f2ece6',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="11" x2="15" y2="11" />
              <line x1="9" y1="15" x2="13" y2="15" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#1b1716' }}>
            Historique
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>

        {/* Item 2 : Préférences de notification */}
        <button
          type="button"
          onClick={() => setActiveModal('notifications')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #f2ece6',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#1b1716' }}>
            Préférences de notification
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>

        {/* Item 3 : Aide et assistance */}
        <button
          type="button"
          onClick={() => setActiveModal('help')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #f2ece6',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#1b1716' }}>
            Aide et assistance
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>

        {/* Item 4 : Paramètres de compte */}
        <button
          type="button"
          onClick={() => setActiveModal('settings')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#1b1716' }}>
            Paramètres de compte
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>
      </div>

      {/* 4. Menu Groupe 2 (Photo 2) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '22px',
          border: '1px solid #eee7e0',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          marginBottom: '26px',
        }}
      >
        {/* Item 1 : CGU */}
        <button
          type="button"
          onClick={() => setActiveModal('terms')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #f2ece6',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '14.5px', fontWeight: 600, color: '#1b1716' }}>
            Conditions générales d’utilisation
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>

        {/* Item 2 : Confidentialité */}
        <button
          type="button"
          onClick={() => setActiveModal('privacy')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 22px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#2b2624', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: '14.5px', fontWeight: 600, color: '#1b1716' }}>
            Politique de confidentialité
          </span>
          <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
        </button>
      </div>

      {/* 5. Bouton Déconnexion (Photo 2) */}
      <button
        type="button"
        onClick={onLogout}
        style={{
          width: '100%',
          padding: '16px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: '16px',
          border: 'none',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fee2e2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fef2f2';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Se déconnecter</span>
      </button>

      {/* --- MODALS DEV INTERACTIFS --- */}

      {/* Modal Édition Profil */}
      {activeModal === 'edit_profile' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Modifier mon profil</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
                  Téléphone Mobile Money *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
                  Adresse Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
                  Ville de livraison
                </label>
                <select
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#ffffff',
                  }}
                >
                  <option value="Cotonou">Cotonou</option>
                  <option value="Abomey-Calavi">Abomey-Calavi</option>
                  <option value="Porto-Novo">Porto-Novo</option>
                  <option value="Parakou">Parakou</option>
                  <option value="Ouidah">Ouidah</option>
                  <option value="Bohicon">Bohicon</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
                  Adresse de livraison
                </label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '13px',
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Enregistrer les modifications
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {activeModal === 'history' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Historique de compte</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px', maxHeight: '360px', overflowY: 'auto' }}>
              {(() => {
                let savedCag = null;
                try {
                  const raw = localStorage.getItem('takapay-demo-cagnotte');
                  if (raw) savedCag = JSON.parse(raw);
                } catch {}
                const cagProdName = savedCag?.product?.n || 'en cours';
                const cagDate = savedCag?.dateCommande || 'Récemment';
                const cagPaid = savedCag ? `${Number(savedCag.montantVerse).toLocaleString()} FCFA` : '100 000 FCFA';
                const cagPercent = savedCag?.pourcentage !== undefined ? savedCag.pourcentage : 25;
                const isFinished = cagPercent >= 100;
                return (
                  <div style={{ padding: '12px', background: '#faf6f3', borderRadius: '12px', border: '1px solid #f0e8e0' }}>
                    <b style={{ fontSize: '13.5px', color: '#1b1716', display: 'block' }}>Cagnotte {cagProdName}</b>
                    <span style={{ fontSize: '11px', color: '#706966' }}>{cagDate} · Acompte {cagPaid}</span>
                    <span style={{ display: 'inline-block', fontSize: '11px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '99px', marginTop: '6px' }}>
                      {isFinished ? 'Financée (100%)' : `En cours (${cagPercent}%)`}
                    </span>
                  </div>
                );
              })()}

              <div style={{ padding: '12px', background: '#faf6f3', borderRadius: '12px', border: '1px solid #f0e8e0' }}>
                <b style={{ fontSize: '13.5px', color: '#1b1716', display: 'block' }}>Versement MoMo +50 000 FCFA</b>
                <span style={{ fontSize: '11px', color: '#706966' }}>10 nov 2026 · Reçu #TK-MM-950244</span>
                <span style={{ display: 'inline-block', fontSize: '11px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '99px', marginTop: '6px' }}>
                  Validé
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '12px',
                background: '#1b1716',
                color: '#ffffff',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Préférences de notification */}
      {activeModal === 'notifications' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Préférences de notification</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNotifications}>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
                  />
                  <div>
                    <b style={{ fontSize: '13.5px', display: 'block' }}>Rappels par SMS</b>
                    <span style={{ fontSize: '11.5px', color: '#706966' }}>Recevoir un SMS 2 jours avant l’échéance</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
                  />
                  <div>
                    <b style={{ fontSize: '13.5px', display: 'block' }}>Alertes WhatsApp</b>
                    <span style={{ fontSize: '11.5px', color: '#706966' }}>Reçus de versement et suivi de livraison</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
                  />
                  <div>
                    <b style={{ fontSize: '13.5px', display: 'block' }}>Factures par Email</b>
                    <span style={{ fontSize: '11.5px', color: '#706966' }}>Attestations d'échelonnement et reçus</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '13px',
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Enregistrer mes préférences
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aide et Assistance */}
      {activeModal === 'help' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Centre d’assistance Takapay</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
              <a
                href="https://wa.me/2290162180290"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#dcfce7',
                  color: '#15803d',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                }}
              >
                <span>💬</span>
                <span>Assistance WhatsApp 7j/7</span>
              </a>

              <a
                href="tel:+2290162180290"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#faf6f3',
                  color: '#1b1716',
                  border: '1px solid #f0e8e0',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                }}
              >
                <span>📞</span>
                <span>Support téléphonique : +229 01 62 18 02 90</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1b1716',
                color: '#ffffff',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Sécurité & Code PIN */}
      {activeModal === 'settings' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Code PIN & Sécurité</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePin}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Code PIN actuel
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '15px',
                    letterSpacing: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Nouveau code PIN (6 chiffres) *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '15px',
                    letterSpacing: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Confirmer le nouveau code PIN *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1.5px solid #ded6ce',
                    fontSize: '15px',
                    letterSpacing: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={newPin.length !== 6 || confirmPin.length !== 6}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: newPin.length === 6 && confirmPin.length === 6 ? '#dc2626' : '#ded6ce',
                  color: '#ffffff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: 800,
                  cursor: newPin.length === 6 && confirmPin.length === 6 ? 'pointer' : 'not-allowed',
                }}
              >
                Mettre à jour mon PIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal CGU */}
      {activeModal === 'terms' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Conditions Générales</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', fontSize: '13px', color: '#4b443f', lineHeight: 1.6 }}>
              <p><b>1. Objet du service Takapay</b> : Paiement fractionné et cotisations progressives sécurisées pour l’acquisition d’équipements au Bénin.</p>
              <p><b>2. Versements</b> : L’utilisateur choisit son rythme de versement. Le bien est livré dès que la cagnotte atteint 100%.</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: '#1b1716',
                color: '#ffffff',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Confidentialité */}
      {activeModal === 'privacy' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Protection des données</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', fontSize: '13px', color: '#4b443f', lineHeight: 1.6 }}>
              <p><b>1. Confidentialité</b> : Vos coordonnées et numéros Mobile Money sont cryptés et protégés.</p>
              <p><b>2. Transactions sécurisées</b> : Opérées conformément aux régulations financières de l'UEMOA.</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: '#1b1716',
                color: '#ffffff',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
