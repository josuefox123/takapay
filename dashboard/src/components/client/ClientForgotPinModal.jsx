import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function ClientForgotPinModal({
  isOpen,
  onClose,
  initialIdentifiant = '',
  onSuccess,
}) {
  // Étapes séparées : 'request' -> 'verify_code' -> 'new_pin' -> 'success'
  const [step, setStep] = useState('request');
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [destinationInfo, setDestinationInfo] = useState('');

  // Détection en temps réel du type de saisie (Email vs Téléphone)
  const isEmailInput = identifiant.includes('@');
  const hasLetters = /[a-zA-Z]/.test(identifiant);
  const hasLetterInPhone = !isEmailInput && hasLetters;

  let detectedType = null;
  if (identifiant.trim().length > 0) {
    if (isEmailInput) {
      detectedType = 'email';
    } else if (!hasLetters) {
      detectedType = 'phone';
    }
  }

  const handleIdentifiantChange = (e) => {
    let val = e.target.value;
    // Si la saisie commence par '+' (indicatif pays), refuser les lettres à la frappe
    if (val.startsWith('+')) {
      val = val.replace(/[a-zA-Z]/g, '');
    }
    setError('');
    setIdentifiant(val);
  };

  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setIdentifiant(initialIdentifiant || '');
      setCode('');
      setNewPin('');
      setConfirmPin('');
      setError('');
      setDestinationInfo('');
    }
  }, [isOpen, initialIdentifiant]);

  if (!isOpen) return null;

  // 1. Demande d'envoi du code
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifiant.trim();
    if (!cleanId) {
      setError('Veuillez renseigner votre adresse email ou votre numéro de téléphone.');
      return;
    }

    if (!cleanId.includes('@')) {
      if (/[a-zA-Z]/.test(cleanId)) {
        setError('Le numéro de téléphone ne doit pas comporter de lettres. Veuillez saisir uniquement des chiffres.');
        return;
      }
      const digitsOnly = cleanId.replace(/\D/g, '');
      if (digitsOnly.length < 8) {
        setError('Le numéro de téléphone doit comporter au moins 8 chiffres (ex: +229 97000000).');
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanId)) {
        setError('Veuillez saisir une adresse email valide (ex: client@gmail.com).');
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await adminService.forgotPin(cleanId);
      setDestinationInfo(res.message || 'Code envoyé avec succès !');
      setStep('verify_code');
    } catch (err) {
      setError(err.message || "Impossible d'envoyer le code de vérification.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Vérification du code reçu
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError('Le code de vérification doit comporter exactement 6 chiffres.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await adminService.verifyPinCode(identifiant.trim(), cleanCode);
      setStep('new_pin');
    } catch (err) {
      setError(err.message || 'Code de vérification incorrect ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Définition du nouveau code PIN
  const handleSaveNewPin = async (e) => {
    if (e) e.preventDefault();
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError('Le nouveau code PIN doit comporter exactement 6 chiffres numériques.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('Les deux codes PIN saisis ne correspondent pas.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await adminService.resetPin(identifiant.trim(), code.trim(), newPin, confirmPin);
      setStep('success');
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(identifiant.trim(), res?.message);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Échec de la réinitialisation du code PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="takapay-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 12, 11, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="takapay-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1px solid #f0e6e5',
          position: 'relative',
        }}
      >
        {/* En-tête de la modale */}
        <div
          style={{
            background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '26px' }}>
              {step === 'new_pin' ? 'pin' : step === 'success' ? 'check_circle' : 'lock_reset'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                {step === 'request' && 'Code PIN oublié'}
                {step === 'verify_code' && 'Étape 1 : Vérification'}
                {step === 'new_pin' && 'Étape 2 : Nouveau code PIN'}
                {step === 'success' && 'Réinitialisation réussie !'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                {step === 'request' && 'Envoi automatique par Email ou SMS'}
                {step === 'verify_code' && 'Entrez le code reçu'}
                {step === 'new_pin' && 'Créez votre code secret à 6 chiffres'}
                {step === 'success' && 'Redirection vers la connexion...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Indicateur de progression (3 étapes) */}
        {step !== 'success' && (
          <div style={{ display: 'flex', height: '4px', background: '#f3f4f6' }}>
            <div
              style={{
                height: '100%',
                background: '#c62828',
                transition: 'width 0.3s ease',
                width: step === 'request' ? '33.3%' : step === 'verify_code' ? '66.6%' : '100%',
              }}
            />
          </div>
        )}

        {/* Corps de la modale */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* ================================================================
              ÉTAPE 1 : DEMANDE D'ENVOI DU CODE
              ================================================================ */}
          {step === 'request' && (
            <form onSubmit={handleSendCode}>
              <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#4b5563', lineHeight: 1.45 }}>
                Entrez votre <strong>adresse email</strong> (pour recevoir le code par email) ou votre <strong>numéro de téléphone</strong> (pour recevoir le code par SMS) :
              </p>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                Adresse Email ou Numéro de téléphone *
              </label>
              <div style={{ position: 'relative', marginBottom: hasLetterInPhone ? '8px' : '22px' }}>
                <input
                  type="text"
                  required
                  className="fi"
                  placeholder="Ex: client@gmail.com ou +229 97 00 00 00"
                  value={identifiant}
                  onChange={handleIdentifiantChange}
                  style={{
                    width: '100%',
                    paddingRight: '38px',
                    borderColor: hasLetterInPhone ? '#ef4444' : undefined,
                  }}
                  autoFocus
                />
                <span
                  className="material-symbols-outlined notranslate"
                  translate="no"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '20px',
                    color: detectedType === 'email' ? '#2563eb' : detectedType === 'phone' ? '#16a34a' : '#9ca3af',
                    pointerEvents: 'none',
                  }}
                >
                  {detectedType === 'email' ? 'mail' : detectedType === 'phone' ? 'sms' : 'contact_mail'}
                </span>
              </div>

              {hasLetterInPhone && (
                <div style={{ margin: '0 0 16px', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                  <span>Un numéro de téléphone ne doit pas comporter de lettres. S'il s'agit d'un email, veillez à inclure le '@'.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || hasLetterInPhone}
                className="client-btn w100"
                style={{
                  padding: '14px',
                  fontSize: '15px',
                  opacity: hasLetterInPhone ? 0.6 : 1,
                  cursor: hasLetterInPhone ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Envoi en cours...' : 'Envoyer le code →'}
              </button>
            </form>
          )}

          {/* ================================================================
              ÉTAPE 2 : VÉRIFICATION DU CODE REÇU
              ================================================================ */}
          {step === 'verify_code' && (
            <form onSubmit={handleVerifyCode}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '18px',
                  lineHeight: 1.4,
                }}
              >
                {destinationInfo}
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#4b5563', lineHeight: 1.45 }}>
                Veuillez saisir le <strong>code de sécurité à 6 chiffres</strong> que vous venez de recevoir :
              </p>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                Code de vérification (6 chiffres) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className="fi"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontWeight: 800,
                  marginBottom: '20px',
                }}
                autoFocus
              />

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="client-btn w100"
                style={{
                  padding: '14px',
                  fontSize: '15px',
                  marginBottom: '14px',
                  opacity: code.length === 6 ? 1 : 0.6,
                }}
              >
                {isLoading ? 'Vérification en cours...' : 'Vérifier le code →'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep('request');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Renvoyer un code ou changer d'identifiant
                </button>
              </div>
            </form>
          )}

          {/* ================================================================
              ÉTAPE 3 : DÉFINITION DU NOUVEAU CODE PIN (UNE FOIS LE CODE VALIDÉ)
              ================================================================ */}
          {step === 'new_pin' && (
            <form onSubmit={handleSaveNewPin}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                <span>Code vérifié avec succès ! Définissez maintenant votre nouveau code PIN.</span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                  Nouveau code PIN (6 chiffres) *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  className="fi"
                  placeholder="••••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 700 }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                  Confirmer le nouveau code PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  className="fi"
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 700 }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="client-btn w100"
                style={{ padding: '14px', fontSize: '15px' }}
              >
                {isLoading ? 'Enregistrement en cours...' : 'Enregistrer mon nouveau code PIN'}
              </button>
            </form>
          )}

          {/* ================================================================
              ÉTAPE 4 : SUCCÈS
              ================================================================ */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '28px',
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#15803d' }}>
                Code PIN modifié avec succès !
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                Redirection vers la page de connexion...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
