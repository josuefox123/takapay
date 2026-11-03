import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import AdminIcon from './AdminIcon';

export default function AdminProfileView({ currentUser, onUserUpdate, onShowToast }) {
  // Informations personnelles
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Changement de mot de passe
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
        telephone: currentUser.telephone || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.nom.trim()) {
      setProfileError('Le nom est obligatoire.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await adminService.updateProfile({
        nom: profileForm.nom,
        prenom: profileForm.prenom,
        telephone: profileForm.telephone,
      });

      const updated = res.user || res.data || res;
      if (onUserUpdate) onUserUpdate(updated);
      setProfileSuccess('Vos informations ont été mises à jour avec succès.');
      if (onShowToast) onShowToast('Profil mis à jour avec succès.');
    } catch (err) {
      const msg = err.message || 'Erreur lors de la mise à jour du profil.';
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!pwdForm.current_password) {
      setPwdError('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (!pwdForm.new_password || pwdForm.new_password.length < 8) {
      setPwdError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setPwdLoading(true);
    try {
      await adminService.updatePassword({
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
        confirm_password: pwdForm.confirm_password,
      });

      setPwdSuccess('Votre mot de passe a été modifié avec succès.');
      setPwdForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      if (onShowToast) onShowToast('Mot de passe modifié avec succès.');
    } catch (err) {
      const msg = err.errors
        ? Object.values(err.errors).flat().join(' ')
        : (err.message || 'Erreur lors de la modification du mot de passe.');
      setPwdError(msg);
    } finally {
      setPwdLoading(false);
    }
  };

  const initialLetter = (profileForm.nom || currentUser?.nom || 'A').charAt(0).toUpperCase();
  const roleLabel = currentUser?.role === 'super_admin' ? 'Super Administrateur' : 'Administrateur';

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Mon Profil</h1>
        <p className="admin-header-sub">
          Gérez vos informations personnelles et la sécurité de votre compte administrateur
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Panneau 1 : Informations personnelles */}
        <div className="admin-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--soft)',
                color: 'var(--r)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {initialLetter}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                {profileForm.prenom} {profileForm.nom}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span
                  className="admin-badge"
                  style={{
                    background: 'var(--soft)',
                    color: 'var(--r)',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                >
                  <AdminIcon name="shield" size={12} />
                  <span>{roleLabel}</span>
                </span>
                <span className="admin-badge s1" style={{ fontSize: '11px' }}>
                  {currentUser?.statut_compte || 'Actif'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px' }}>
              Coordonnées de l'administrateur
            </h3>

            {profileSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ✓ {profileSuccess}
              </div>
            )}

            {profileError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ✕ {profileError}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Adresse e-mail
              </label>
              <input
                type="email"
                disabled
                value={profileForm.email}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--mut)',
                  fontSize: '13px',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                L'adresse email sert d'identifiant de connexion unique.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.nom}
                  onChange={(e) => setProfileForm({ ...profileForm, nom: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Prénom
                </label>
                <input
                  type="text"
                  value={profileForm.prenom}
                  onChange={(e) => setProfileForm({ ...profileForm, prenom: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={profileForm.telephone}
                onChange={(e) => setProfileForm({ ...profileForm, telephone: e.target.value })}
                placeholder="+229 90000000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: profileLoading ? 'not-allowed' : 'pointer',
                opacity: profileLoading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {profileLoading ? 'Enregistrement...' : 'Enregistrer mes informations'}
            </button>
          </form>
        </div>

        {/* Panneau 2 : Sécurité & Changement de mot de passe */}
        <div className="admin-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(225, 29, 72, 0.1)',
                color: 'var(--r)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <AdminIcon name="lock" size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Sécurité & Mot de passe
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--mut)' }}>
                Modifiez régulièrement votre mot de passe pour protéger votre accès
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            {pwdSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ✓ {pwdSuccess}
              </div>
            )}

            {pwdError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ✕ {pwdError}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Mot de passe actuel *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  required
                  value={pwdForm.current_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                  placeholder="Votre mot de passe actuel"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--mut)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AdminIcon name={showCurrentPwd ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Nouveau mot de passe *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  value={pwdForm.new_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--mut)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AdminIcon name={showNewPwd ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                Confirmer le nouveau mot de passe *
              </label>
              <input
                type="password"
                required
                value={pwdForm.confirm_password}
                onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                placeholder="Répétez le nouveau mot de passe"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--r)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: pwdLoading ? 'not-allowed' : 'pointer',
                opacity: pwdLoading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)',
                transition: 'opacity 0.2s',
              }}
            >
              {pwdLoading ? 'Mise à jour en cours...' : 'Mettre à jour mon mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
