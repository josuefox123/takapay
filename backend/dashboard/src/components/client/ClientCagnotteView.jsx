import { useState } from 'react';
import { formatFCFA, DEFAULT_CAGNOTTE } from '../../data/clientStore';

export default function ClientCagnotteView({ onBack, onShowToast, onGoCatalog, user = null, onGoLogin }) {
  if (!user) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '16px 20px', textAlign: 'center' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #eee7e0',
            padding: '48px 32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '38px' }}>
              lock
            </span>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1b1716', margin: '0 0 10px' }}>
            Connectez-vous pour voir votre cagnotte
          </h2>
          <p style={{ color: '#706966', fontSize: '14.5px', lineHeight: 1.6, margin: '0 0 28px' }}>
            Renseignez votre numéro de téléphone et votre code PIN pour accéder à vos cotisations, suivre vos échéances et consulter l'historique de vos versements.
          </p>

          <button
            type="button"
            className="client-btn"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            onClick={onGoLogin}
          >
            Se connecter avec mon numéro et code PIN
          </button>
        </div>
      </div>
    );
  }

  const [cagnotte, setCagnotte] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay-demo-cagnotte');
      return saved ? JSON.parse(saved) : DEFAULT_CAGNOTTE;
    } catch {
      return DEFAULT_CAGNOTTE;
    }
  });

  const [activeFilter, setActiveFilter] = useState('Tous'); // 'Tous' | "Aujourd'hui" | 'Il y a 7 jours' | 'Il y a 30 jours'
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('50000');
  const [depositProvider, setDepositProvider] = useState('MTN');
  const [depositPhone, setDepositPhone] = useState('+229 0162180290');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Filtrer les versements rattachés
  const transactions = cagnotte.transactions || [];
  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === 'Tous') return true;
    if (activeFilter === 'Il y a 7 jours') return t.periode === '7_jours' || t.periode === 'aujourdhui';
    if (activeFilter === 'Il y a 30 jours') return true;
    if (activeFilter === "Aujourd'hui") return t.periode === 'aujourdhui';
    return true;
  });

  // Nouveau versement rattaché à la cagnotte
  const handleMakeDeposit = (e) => {
    e.preventDefault();
    const amountNum = parseInt(depositAmount, 10);
    if (!amountNum || amountNum <= 0) {
      alert('Veuillez renseigner un montant valide.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newPaid = cagnotte.montantVerse + amountNum;
      const newRemaining = Math.max(0, cagnotte.prixTotal - newPaid);
      const newPercent = Math.min(100, Math.round((newPaid / cagnotte.prixTotal) * 100));

      const now = new Date();
      const dateFormatted =
        now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const newTx = {
        id: `tx-${Date.now()}`,
        reference: `TK-MM-${Math.floor(100000 + Math.random() * 900000)}`,
        titre: 'Versement',
        methode: depositProvider === 'MTN' ? 'MTN Mobile Money' : 'Moov Money',
        date: dateFormatted,
        montant: amountNum,
        statut: 'Réussi',
        type: 'versement',
        periode: 'aujourdhui',
        telephone: depositPhone,
        client: 'Koffi DOSSOU',
      };

      const isCompleted = newPercent >= 100;
      const updatedCagnotte = {
        ...cagnotte,
        montantVerse: newPaid,
        resteAPayer: newRemaining,
        pourcentage: newPercent,
        statut: isCompleted ? 'completed' : 'active',
        transactions: [newTx, ...cagnotte.transactions],
      };

      setCagnotte(updatedCagnotte);
      try {
        localStorage.setItem('takapay-demo-cagnotte', JSON.stringify(updatedCagnotte));
      } catch {
        // Ignorer
      }

      setIsSubmitting(false);
      setShowDepositModal(false);
      if (onShowToast) {
        onShowToast(
          isCompleted
            ? `🎉 Bravo ! Votre cagnotte est désormais financée à 100% !`
            : `Versement de ${formatFCFA(amountNum)} rattaché à votre cagnotte avec succès !`
        );
      }
    }, 600);
  };

  const p = cagnotte.product || {};
  const isFinished = cagnotte.pourcentage >= 100;

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* 1. Barre d'action supérieure */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1b1716', margin: 0, letterSpacing: '-0.5px' }}>
                Ma cagnotte
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '99px',
                  background: isFinished ? '#dcfce7' : '#fee2e2',
                  color: isFinished ? '#15803d' : '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {isFinished ? '🎉 Financement complété' : `● Échéance en cours (${cagnotte.pourcentage}%)`}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#706966', fontSize: '13.5px' }}>
              Suivez l'avancement de vos cotisations et l'ensemble des versements rattachés.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onGoCatalog && (
            <button
              type="button"
              onClick={onGoCatalog}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid #e2dad0',
                background: '#ffffff',
                color: '#1b1716',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              + Autre article
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
            }}
          >
            Effectuer un versement
          </button>
        </div>
      </div>

      {/* Bannière de félicitations si complétée */}
      {isFinished && (
        <div
          style={{
            background: 'linear-gradient(135deg, #15803d, #166534)',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(21,128,61,0.2)',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
              Félicitations Koffi ! Votre iPhone 16 Pro Max est entièrement financé !
            </h3>
            <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.95 }}>
              L'intégralité des 450 000 FCFA a été versée. Notre équipe prépare votre appareil pour la remise en main propre.
            </p>
          </div>
          <span style={{ fontSize: '32px' }}>🎁📦</span>
        </div>
      )}

      {/* 2. Grille Web à 2 colonnes (Synthèse de la cagnotte & Versements rattachés) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* === COLONNE GAUCHE : Détails Produit, Jauge & Échéances (Inspiré de la Photo 1) === */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Carte Résumé Produit */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #eee7e0',
              padding: '18px 20px',
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: '94px',
                height: '94px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#f7f2ed',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <img
                src={p.im || '/assets/product-iphone-16.jpg'}
                alt={p.n}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.src = '/assets/category-phones.jpg';
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#1b1716', margin: '0 0 3px' }}>
                {p.n}
              </h2>
              <div style={{ fontSize: '12.5px', color: '#706966', marginBottom: '6px' }}>
                {p.variant || 'noir . 128 Go . 1 unité'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1b1716', marginBottom: '4px' }}>
                {formatFCFA(cagnotte.prixTotal)}
              </div>
              <div style={{ fontSize: '12px', color: '#8c8580', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>📅</span>
                <span>Débuté le {cagnotte.dateCommande}</span>
              </div>
            </div>
          </div>

          {/* Carte Progression de Remboursement */}
          <div
            style={{
              background: '#faf6f3',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #f0e8e0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#2b2624' }}>
                Progression de remboursement
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>
                {cagnotte.pourcentage}%
              </span>
            </div>

            {/* Barre de progression rouge */}
            <div style={{ height: '9px', background: '#ece5dc', borderRadius: '99px', overflow: 'hidden', marginBottom: '18px' }}>
              <div
                style={{
                  width: `${cagnotte.pourcentage}%`,
                  height: '100%',
                  background: '#dc2626',
                  borderRadius: '99px',
                  transition: 'width .5s ease',
                }}
              />
            </div>

            {/* Colonnes Versé | Reste */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
              <div>
                <small style={{ color: '#8c8580', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  Montant déjà versé
                </small>
                <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>
                  {formatFCFA(cagnotte.montantVerse)}
                </b>
              </div>

              <div style={{ width: '1px', height: '38px', background: '#ded6cd', margin: '0 16px' }} />

              <div style={{ textAlign: 'right' }}>
                <small style={{ color: '#8c8580', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  Reste à payer
                </small>
                <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>
                  {formatFCFA(cagnotte.resteAPayer)}
                </b>
              </div>
            </div>
          </div>

          {/* Carte Échéances / Prochain versement & Fin estimée */}
          <div
            style={{
              background: '#faf6f3',
              borderRadius: '20px',
              padding: '18px 20px',
              border: '1px solid #f0e8e0',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1.1fr',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '22px', marginTop: '1px' }}>📅</span>
              <div>
                <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block' }}>Prochain versement</small>
                <b style={{ fontSize: '15px', fontWeight: 800, color: '#1b1716', display: 'block', marginTop: '2px' }}>
                  {formatFCFA(cagnotte.prochainVersement?.montant)}
                </b>
                <span style={{ fontSize: '11px', color: '#8c8580' }}>
                  {cagnotte.prochainVersement?.date}
                </span>
              </div>
            </div>

            <div style={{ width: '1px', height: '44px', background: '#ded6cd', margin: '0 12px' }} />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '22px', marginTop: '1px' }}>📅</span>
              <div>
                <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block' }}>Date de fin estimée</small>
                <b style={{ fontSize: '15px', fontWeight: 800, color: '#1b1716', display: 'block', marginTop: '2px' }}>
                  {cagnotte.dateFinEstimee}
                </b>
                <span style={{ fontSize: '11px', color: '#8c8580' }}>
                  ({cagnotte.moisRestants} mois restants)
                </span>
              </div>
            </div>
          </div>

          {/* Bouton d'action principal */}
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            style={{
              width: '100%',
              padding: '16px',
              background: '#dc2626',
              color: '#ffffff',
              borderRadius: '16px',
              border: 'none',
              fontSize: '15.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.28)',
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#dc2626';
            }}
          >
            Effectuer un virement
          </button>
        </div>

        {/* === COLONNE DROITE : Versements rattachés à la cagnotte (Inspiré de la Photo 1) === */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #eee7e0',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1b1716', margin: 0 }}>
                Historique de transactions
              </h3>
              <small style={{ color: '#706966', fontSize: '12px' }}>
                Versements rattachés à l'iPhone 16 pro max
              </small>
            </div>

            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#706966',
                background: '#faf6f3',
                padding: '4px 10px',
                borderRadius: '99px',
                border: '1px solid #eee7e0',
              }}
            >
              {filteredTransactions.length} versement{filteredTransactions.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Puces de filtre temporel (Photo 1) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['Tous', "Aujourd'hui", 'Il y a 7 jours', 'Il y a 30 jours'].map((filtre) => {
              const isActive = activeFilter === filtre;
              return (
                <button
                  key={filtre}
                  type="button"
                  onClick={() => setActiveFilter(filtre)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '99px',
                    border: isActive ? 'none' : '1px solid #e8e0d6',
                    background: isActive ? '#dc2626' : '#ffffff',
                    color: isActive ? '#ffffff' : '#2b2624',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {filtre}
                </button>
              );
            })}
          </div>

          {/* Liste des versements rattachés */}
          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedReceipt(tx)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #ece5df',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'transform .15s, border-color .15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderColor = '#d9d0c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#ece5df';
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#f3ece6',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '18px',
                    color: '#4b443f',
                    flexShrink: 0,
                  }}
                >
                  💳
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b style={{ fontSize: '14.5px', color: '#1b1716' }}>{tx.titre}</b>
                    <small style={{ fontSize: '11px', color: '#8c8580' }}>
                      {tx.reference || 'TK-MM-948102'}
                    </small>
                  </div>
                  <span style={{ fontSize: '12px', color: '#706966', display: 'block', marginTop: '2px' }}>
                    {tx.methode}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9e958f' }}>{tx.date}</span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <b style={{ fontSize: '15px', color: '#1b1716', display: 'block' }}>
                      +{formatFCFA(tx.montant)}
                    </b>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        marginTop: '3px',
                      }}
                    >
                      ✔ Réussi
                    </span>
                  </div>
                  <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8c8580', fontSize: '13.5px' }}>
                Aucun versement enregistré pour cette période.
              </div>
            )}
          </div>

          {/* Synthèse des règlements */}
          <div
            style={{
              background: '#faf6f3',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1px solid #f0e8e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <small style={{ color: '#706966', fontSize: '11.5px', display: 'block' }}>
                Mode de prélèvement privilégié
              </small>
              <b style={{ fontSize: '13.5px', color: '#1b1716' }}>
                MTN Mobile Money (+229 01 62 18 02 90)
              </b>
            </div>

            <button
              type="button"
              onClick={() => setShowDepositModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              + Ajouter un acompte
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1 : Nouveau virement interactif */}
      {showDepositModal && (
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
            if (e.target === e.currentTarget) setShowDepositModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Nouveau versement cagnotte</h3>
                <small style={{ color: '#706966', fontSize: '12px' }}>
                  Rattaché à votre iPhone 16 pro max
                </small>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMakeDeposit}>
              {/* Raccourcis de montants */}
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                Montant du versement (FCFA) *
              </label>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {['25000', '50000', '100000', String(cagnotte.resteAPayer)].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: depositAmount === amt ? '2px solid #dc2626' : '1px solid #ded6ce',
                      background: depositAmount === amt ? 'rgba(220,38,38,0.06)' : '#faf6f3',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {amt === String(cagnotte.resteAPayer) ? 'Solde total' : `${parseInt(amt, 10) / 1000}k`}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #ded6ce',
                  fontSize: '16px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                Moyen de règlement Mobile Money
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setDepositProvider('MTN')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: depositProvider === 'MTN' ? '2px solid #dc2626' : '1px solid #ded6ce',
                    background: depositProvider === 'MTN' ? 'rgba(220,38,38,0.06)' : '#faf6f3',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🟡 MTN MoMo
                </button>

                <button
                  type="button"
                  onClick={() => setDepositProvider('Moov')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: depositProvider === 'Moov' ? '2px solid #dc2626' : '1px solid #ded6ce',
                    background: depositProvider === 'Moov' ? 'rgba(220,38,38,0.06)' : '#faf6f3',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🔵 Moov Money
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Numéro de débit Mobile Money
                </label>
                <input
                  type="tel"
                  required
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(e.target.value)}
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
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '14px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting ? 'Traitement Mobile Money...' : `Confirmer le versement de ${formatFCFA(depositAmount)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2 : Reçu numérique officiel du versement */}
      {selectedReceipt && (
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
            if (e.target === e.currentTarget) setSelectedReceipt(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px dashed #ded6cd', paddingBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>🧾</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 2px' }}>
                Reçu de versement Takapay
              </h3>
              <small style={{ color: '#706966', fontSize: '12px' }}>
                Référence : {selectedReceipt.reference || selectedReceipt.id}
              </small>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#706966' }}>Bénéficiaire :</span>
                <b>Koffi DOSSOU</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#706966' }}>Cagnotte article :</span>
                <b>iPhone 16 pro max</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#706966' }}>Moyen utilisé :</span>
                <b>{selectedReceipt.methode}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#706966' }}>Date & heure :</span>
                <b>{selectedReceipt.date}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#706966' }}>Statut :</span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✔ Validé</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #eee7e0',
                  fontSize: '15px',
                }}
              >
                <span>Montant versé :</span>
                <b style={{ color: '#dc2626' }}>+{formatFCFA(selectedReceipt.montant)}</b>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #ded6cd',
                  background: '#faf6f3',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Imprimer le reçu
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1b1716',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
