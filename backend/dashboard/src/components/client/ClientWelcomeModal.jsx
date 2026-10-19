import { formatFCFA, discountPercentage, PRODUCTS } from '../../data/clientStore';

export default function ClientWelcomeModal({ isOpen, onClose, onSelectProduct, onShowAllPromos }) {
  if (!isOpen) return null;

  const deals = PRODUCTS.filter((p) => p.o).slice(0, 3);

  return (
    <div
      className="welcome-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 12, 11, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="welcome-card"
        style={{
          background: '#ffffff',
          color: '#1b1716',
          borderRadius: '24px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Photo de campagne */}
        <div
          className="welcome-photo"
          role="img"
          aria-label="Sélection d'articles en promotion"
          style={{
            minHeight: '260px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.25)), url("/assets/campaign-deals.jpg") center/cover no-repeat',
          }}
        />

        {/* Contenu et offres avec contraste garanti */}
        <div
          className="welcome-copy"
          style={{
            padding: '28px 32px',
            background: '#ffffff',
            color: '#1b1716',
            position: 'relative',
          }}
        >
          <button
            type="button"
            className="welcome-close"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f3ece7',
              border: 'none',
              fontSize: '22px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              color: '#1b1716',
            }}
          >
            ×
          </button>

          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--r)',
              marginBottom: '6px',
            }}
          >
            🔥 OFFRES DU MOMENT
          </span>

          <h2
            id="welcome-title"
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#1b1716',
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}
          >
            Des réductions exclusives sur vos articles favoris
          </h2>

          <p
            style={{
              margin: '0 0 16px',
              color: '#4b443f',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            Profitez des prix barrés et commencez votre cagnotte dès aujourd'hui à votre propre rythme.
          </p>

          <div className="welcome-deals" style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
            {deals.map((p) => {
              const disc = discountPercentage(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="welcome-deal"
                  onClick={() => {
                    onClose();
                    onSelectProduct(p.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #ece5df',
                    background: '#fffdfb',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={p.im}
                    alt={p.n}
                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '10px' }}
                  />
                  <div className="welcome-deal-copy" style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '14px', color: '#1b1716', display: 'block' }}>{p.n}</b>
                    <small style={{ color: '#6b6661', fontSize: '12px', marginTop: '2px', display: 'block' }}>
                      <strong style={{ color: 'var(--r)', fontWeight: 800 }}>{formatFCFA(p.p)}</strong>
                      <s style={{ marginLeft: '6px', color: '#9c938f' }}>{formatFCFA(p.o)}</s>
                    </small>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'var(--r)',
                      padding: '4px 10px',
                      borderRadius: '99px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    −{disc}%
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="client-btn"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            onClick={() => {
              onClose();
              onShowAllPromos();
            }}
          >
            Découvrir toutes les promotions
          </button>
        </div>
      </div>
    </div>
  );
}
