import { useState, useEffect } from 'react';

export default function FloatingActionButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 240) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(contactSubject || "Demande d'information Takapay");
    const body = encodeURIComponent(
      `Email client: ${contactEmail || 'Non précisé'}\n\nMessage:\n${contactMessage}`
    );
    window.location.href = `mailto:contact@takapay.bj?subject=${subject}&body=${body}`;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setShowContactModal(false);
      setContactSubject('');
      setContactMessage('');
      setContactEmail('');
    }, 2200);
  };

  return (
    <>
      <div
        className="takapay-floating-actions"
        style={{
          position: 'fixed',
          right: 'clamp(12px, 3vw, 20px)',
          bottom: 'clamp(14px, 3vw, 24px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Bouton Contacter Service Clientèle */}
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          title="Contacter le service clientèle"
          aria-label="Contacter le service clientèle"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(198, 40, 40, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            support_agent
          </span>
        </button>

        {/* Bouton Retour en haut (flèche vers le haut quand on est en bas) */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Revenir en haut"
            aria-label="Revenir en haut de page"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#c62828',
              border: '1.5px solid rgba(198, 40, 40, 0.2)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              animation: 'fadeInUp 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.background = '#fff5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', fontWeight: 700 }}>
              arrow_upward
            </span>
          </button>
        )}
      </div>

      {/* Modal / Boîte de dialogue contact service clientèle */}
      {showContactModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 'clamp(10px, 3vw, 24px)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContactModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              border: '1px solid #f0e6e5',
              overflow: 'hidden',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* En-tête */}
            <div
              style={{
                background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                color: '#ffffff',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  support_agent
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Service Clientèle</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Takapay Bénin · À votre écoute</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                title="Fermer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Formulaire & Contacts */}
            <div style={{ padding: '20px' }}>
              {sentSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '48px', color: '#16a34a', display: 'block', marginBottom: '10px' }}
                  >
                    mark_email_read
                  </span>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#16a34a' }}>Email préparé !</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    Votre application de messagerie s'ouvre pour envoyer votre requête.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#444' }}>
                      Votre adresse email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="exemple@email.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#444' }}>
                      Objet de la demande
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Question sur un produit, cagnotte, livraison..."
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#444' }}>
                      Votre message
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Expliquez-nous votre besoin ou préoccupation..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: '#c62828',
                      color: '#ffffff',
                      border: 'none',
                      padding: '11px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      send
                    </span>
                    <span>Envoyer le message par email</span>
                  </button>

                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid #eee',
                      fontSize: '12px',
                      color: '#666',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#c62828' }}>
                        mail
                      </span>
                      <a href="mailto:contact@takapay.bj" style={{ color: '#c62828', textDecoration: 'none' }}>
                        contact@takapay.bj
                      </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#c62828' }}>
                        call
                      </span>
                      <span>+229 90 00 00 00 · Lun-Sam 8h-19h</span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
