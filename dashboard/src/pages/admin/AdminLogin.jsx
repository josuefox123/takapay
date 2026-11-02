import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminIcon from '../../components/admin/AdminIcon';
import { adminService } from '../../services/adminService';
import logoIcon from '../../assets/logo-icon.png';
import './admin.css';

const QUOTES = [
  'Gérez la plateforme en toute sécurité',
  'Validez les documents en un clic',
  'Suivez chaque cagnotte en temps réel',
];

const BRAND_LETTERS = [
  { char: 'T', color: '#1c1b22' },
  { char: 'A', color: '#1c1b22' },
  { char: 'K', color: '#1c1b22' },
  { char: 'A', color: '#1c1b22' },
  { char: 'P', color: 'var(--r)' },
  { char: 'A', color: 'var(--r)' },
  { char: 'Y', color: 'var(--r)' },
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteOpacity, setQuoteOpacity] = useState(1);

  // Animation d'écriture lettre par lettre du nom Takapay
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    if (!isDeleting && displayedChars < BRAND_LETTERS.length) {
      // Frappe d'une lettre toutes les 160ms
      timer = setTimeout(() => {
        setDisplayedChars((prev) => prev + 1);
      }, 160);
    } else if (!isDeleting && displayedChars === BRAND_LETTERS.length) {
      // Pause de 4 secondes lorsque le nom est complet
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 4000);
    } else if (isDeleting && displayedChars > 0) {
      // Effacement fluide (70ms par lettre)
      timer = setTimeout(() => {
        setDisplayedChars((prev) => prev - 1);
      }, 70);
    } else if (isDeleting && displayedChars === 0) {
      // Courte pause avant de recommencer l'écriture
      timer = setTimeout(() => {
        setIsDeleting(false);
      }, 600);
    }

    return () => clearTimeout(timer);
  }, [displayedChars, isDeleting]);

  // Rotation des citations toutes les 3.5s avec fondu
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteOpacity(0);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setQuoteOpacity(1);
      }, 400);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifiant.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await adminService.login(identifiant.trim(), password);
      // Navigation fluide vers le tableau de bord
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-scope">
      <div className="admin-login-grid">
        {/* Volet Gauche Stylisé */}
        <div className="admin-login-left">
          {/* Cercles flottants animés */}
          <div
            className="admin-dot"
            style={{
              width: '260px',
              height: '260px',
              right: '-70px',
              top: '90px',
            }}
          />
          <div
            className="admin-dot"
            style={{
              width: '150px',
              height: '150px',
              left: '30px',
              bottom: '110px',
              animationDelay: '-3s',
            }}
          />

          {/* Logo officiel Takapay animé (Emblème agrandi + nom écrit lettre par lettre) */}
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '14px',
              background: '#ffffff',
              padding: '10px 22px 10px 16px',
              borderRadius: '18px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)',
              maxWidth: 'fit-content',
            }}
          >
            <img
              src={logoIcon}
              alt="Logo Takapay"
              style={{ height: '52px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                minWidth: '155px',
                lineHeight: 1,
              }}
              aria-label="TAKAPAY"
            >
              {BRAND_LETTERS.slice(0, displayedChars).map((item, idx) => (
                <span key={idx} style={{ color: item.color }}>
                  {item.char}
                </span>
              ))}
              <span className="admin-typewriter-cursor">|</span>
            </div>
          </div>

          {/* Citation dynamique */}
          <div style={{ position: 'relative' }}>
            <h2
              className="admin-quote-title"
              style={{ opacity: quoteOpacity }}
            >
              {QUOTES[quoteIndex]}
            </h2>
            <div className="admin-gold-bar" />
          </div>

          <small style={{ opacity: 0.75, position: 'relative', fontSize: '13px' }}>
            Espace réservé à l'équipe Takapay
          </small>
        </div>

        {/* Formulaire de Connexion */}
        <div className="admin-login-right">
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <h1>Connexion</h1>
            <p>Entrez vos identifiants pour accéder au back-office.</p>

            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: 'var(--r)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <div className="admin-field">
              <label htmlFor="admin-identifiant">Identifiant</label>
              <input
                id="admin-identifiant"
                type="text"
                autoComplete="username"
                placeholder="Email ou numéro de téléphone"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="admin-password">Mot de passe</label>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="admin-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <AdminIcon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </div>

            <p style={{ margin: '-6px 0 20px', fontSize: '13px' }}>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Pour réinitialiser votre mot de passe, contactez l’administrateur système.');
                }}
                style={{ color: 'var(--r)', textDecoration: 'none', fontWeight: 600 }}
              >
                Mot de passe oublié ?
              </a>
            </p>

            <button
              type="submit"
              className="admin-btn"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading && <span className="admin-spinner" />}
              <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
