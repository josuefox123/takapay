import { useState, useEffect } from 'react';
import { FeexPayProvider, FeexPayButton } from '@feexpay/react-sdk';
import '@feexpay/react-sdk/style.css';
import { formatFCFA, getStoredCagnottes, mapBackendCagnotteToClient } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

// ---------- Styles partagés ----------
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

const backButtonStyle = {
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
};

const primaryButtonStyle = {
  border: 'none',
  background: '#dc2626',
  color: '#ffffff',
  fontWeight: 800,
  cursor: 'pointer',
};

const FILTERS = ['Tous', "Aujourd'hui", 'Il y a 7 jours', 'Il y a 30 jours'];

export default function ClientCagnotteView({ onBack, onShowToast, onGoCatalog, user = null, onGoLogin }) {
  // ---------- TOUS les hooks sont déclarés AVANT tout return ----------
  const [cagnottesList, setCagnottesList] = useState(() => {
    const stored = getStoredCagnottes(user);
    return Array.isArray(stored) ? stored : [];
  });
  const [selectedCagnotteId, setSelectedCagnotteId] = useState(null);
  const [depositTargetId, setDepositTargetId] = useState(null);

  const [activeFilter, setActiveFilter] = useState('Tous');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositProvider, setDepositProvider] = useState('MTN');
  const [depositPhone, setDepositPhone] = useState(user?.telephone || user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [depositError, setDepositError] = useState('');

  // Synchronisation directe avec l'API / le dashboard admin
  useEffect(() => {
    let isMounted = true;
    adminService.getCagnottes().then((live) => {
      if (!isMounted) return;
      if (Array.isArray(live)) {
        const converted = live.map(mapBackendCagnotteToClient).filter(Boolean);
        try {
          localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(converted));
        } catch { /* ignore */ }
        setCagnottesList(converted);
      }
    }).catch(() => {
      if (isMounted) setCagnottesList(getStoredCagnottes(user));
    });
    return () => { isMounted = false; };
  }, [user]);

  // Resynchronise la liste quand une cagnotte est créée ailleurs (ex. AppHome)
  useEffect(() => {
    const sync = () => {
      const next = getStoredCagnottes(user);
      setCagnottesList(Array.isArray(next) ? next : []);
    };
    window.addEventListener('takapay_cagnotte_updated', sync);
    return () => window.removeEventListener('takapay_cagnotte_updated', sync);
  }, [user]);

  // ---------- Écran de connexion ----------
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

  // ---------- Données dérivées ----------
  const clientName =
    user?.n || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Client TakaPay';
  const firstName = user?.prenom || (user?.n ? user.n.split(' ')[0] : '');

  const activeCagnotte = selectedCagnotteId
    ? cagnottesList.find((c) => String(c.id) === String(selectedCagnotteId)) || null
    : null;

  const targetCagnotte =
    (depositTargetId ? cagnottesList.find((c) => String(c.id) === String(depositTargetId)) : null) ||
    activeCagnotte ||
    cagnottesList[0] ||
    {};

  const cagnotte = activeCagnotte || {};
  const p = cagnotte.product || {};
  const pct = cagnotte.pourcentage || 0;
  const isFinished = pct >= 100;

  const targetRemaining = Number(targetCagnotte.resteAPayer) || 0;
  const targetName = targetCagnotte.product?.n || 'votre article';

  // Raccourcis de montants : fixes (inférieurs au reste) + solde total
  const quickAmounts = [
    ...[25000, 50000, 100000]
      .filter((v) => v < targetRemaining)
      .map((v) => ({ label: `${v / 1000}k`, value: v })),
    ...(targetRemaining > 0 ? [{ label: 'Solde total', value: targetRemaining }] : []),
  ];

  const transactions = cagnotte.transactions || [];
  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === "Aujourd'hui") return t.periode === 'aujourdhui';
    if (activeFilter === 'Il y a 7 jours') return t.periode === 'aujourdhui' || t.periode === '7_jours';
    if (activeFilter === 'Il y a 30 jours') {
      return t.periode === 'aujourdhui' || t.periode === '7_jours' || t.periode === '30_jours';
    }
    return true;
  });

  // ---------- Actions ----------
  const openDeposit = (cagnotteId) => {
    const target = cagnottesList.find((c) => String(c.id) === String(cagnotteId)) || {};
    const remaining = Number(target.resteAPayer) || 0;
    setDepositTargetId(cagnotteId);
    setDepositAmount(String(remaining > 0 ? Math.min(50000, remaining) : ''));
    setDepositError('');
    setPaymentData(null);
    setShowDepositModal(true);
  };

  const closeDeposit = () => {
    setShowDepositModal(false);
    setDepositTargetId(null);
    setPaymentData(null);
    setDepositError('');
  };

  const handleMakeDeposit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountNum = parseInt(depositAmount, 10);
    if (!amountNum || amountNum <= 0) {
      setDepositError('Veuillez renseigner un montant valide.');
      return;
    }
    if (!targetCagnotte.id) {
      setDepositError("Aucune cagnotte sélectionnée pour ce versement.");
      return;
    }
    if (amountNum > targetRemaining) {
      setDepositError(`Le montant ne peut pas dépasser le reste à payer (${formatFCFA(targetRemaining)}).`);
      return;
    }

    const isEchelonne = targetCagnotte.product?.payment?.mode === 'echelonne' || targetCagnotte.mode === 'echelonne';
    const minInstallment = Number(targetCagnotte.product?.payment?.installmentAmount || targetCagnotte.prochainVersement?.montant) || 0;
    if (isEchelonne && minInstallment > 0 && targetRemaining >= minInstallment && amountNum < minInstallment) {
      setDepositError(`Pour une cagnotte échelonnée, chaque versement doit être d'au moins ${formatFCFA(minInstallment)}.`);
      return;
    }

    setDepositError('');
    setIsSubmitting(true);
    try {
      const initRes = await adminService.initiatePayment({
        amount: amountNum,
        produit_id: targetCagnotte.product?.id ? Number(targetCagnotte.product.id) : undefined,
        cagnotte_id: typeof targetCagnotte.id === 'number' ? targetCagnotte.id : undefined,
        type_paiement: 'cagnotte',
        moyen_paiement: depositProvider,
        user_id: user?.id,
      });
      setPaymentData(initRes);
    } catch (err) {
      setDepositError(err.message || 'Impossible d’initialiser le paiement avec FeexPay.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeexpayCallback = async (response) => {
    console.log('FeexPay callback reçu (cagnotte) :', response);
    const isSuccess = response && (
      response.status?.toUpperCase() === 'SUCCESSFUL' ||
      response.status?.toUpperCase() === 'SUCCESS' ||
      response.status?.toUpperCase() === 'PAID'
    );

    if (isSuccess) {
      const orderRef = paymentData?.reference || response.reference;
      const amountNum = parseInt(depositAmount, 10) || Number(response.amount) || 0;
      const customerEmail = response.email || user?.email || null;

      try {
        await adminService.confirmPayment({
          reference: orderRef,
          status: 'successful',
          transaction_id: response.transaction_id || response.reference || orderRef,
          amount: amountNum,
          reseau: response.reseau || depositProvider,
          user_id: user?.id,
          client_email: customerEmail,
        });
      } catch (err) {
        console.warn('Erreur confirmation backend :', err);
      }

      // Mise à jour de la cagnotte en local
      const target = targetCagnotte;
      const targetTotal = Number(target.prixTotal) || 1;
      const newPaid = (Number(target.montantVerse) || 0) + amountNum;
      const newRemaining = Math.max(0, targetTotal - newPaid);
      const newPercent = Math.min(100, Math.round((newPaid / targetTotal) * 100));

      const now = new Date();
      const dateFormatted =
        now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const newTx = {
        id: `tx-${Date.now()}`,
        reference: orderRef,
        titre: 'Versement',
        methode: response.reseau || (depositProvider === 'MTN' ? 'MTN Mobile Money' : 'Moov Money'),
        date: dateFormatted,
        montant: amountNum,
        statut: 'Réussi',
        type: 'versement',
        periode: 'aujourdhui',
        telephone: depositPhone,
        client: clientName,
      };

      const isCompleted = newPercent >= 100;
      const updatedCagnotte = {
        ...target,
        montantVerse: newPaid,
        resteAPayer: newRemaining,
        pourcentage: newPercent,
        statut: isCompleted ? 'completed' : 'active',
        transactions: [newTx, ...(target.transactions || [])],
      };

      const updatedList = cagnottesList.map((c) =>
        String(c.id) === String(target.id) ? updatedCagnotte : c
      );
      setCagnottesList(updatedList);
      try {
        localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedList));
        window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated'));
      } catch {
        // Ignorer
      }

      closeDeposit();
      onShowToast?.(
        isCompleted
          ? `🎉 Bravo ! Votre cagnotte "${target.product?.n}" est désormais financée à 100% !`
          : `Versement de ${formatFCFA(amountNum)} validé avec succès par FeexPay !`
      );
    } else {
      setDepositError(response?.message || 'Le paiement FeexPay a été annulé ou n’a pas abouti.');
    }
  };

  // ---------- Rendu ----------
  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* VUE 1 : LISTE DE TOUTES LES CAGNOTTES */}
      {!activeCagnotte && (
        <>
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
                <button type="button" onClick={onBack} aria-label="Retour" style={backButtonStyle}>
                  ‹
                </button>
              )}

              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1b1716', margin: 0, letterSpacing: '-0.5px' }}>
                  Mes cagnottes
                </h1>
                <p style={{ margin: '4px 0 0', color: '#706966', fontSize: '13.5px' }}>
                  {cagnottesList.length} cagnotte{cagnottesList.length > 1 ? 's' : ''} en cours ou complétée{cagnottesList.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {onGoCatalog && (
              <button
                type="button"
                onClick={onGoCatalog}
                style={{
                  ...primaryButtonStyle,
                  padding: '11px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
                }}
              >
                + Démarrer une nouvelle cagnotte
              </button>
            )}
          </div>

          {cagnottesList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 24px',
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #eee7e0',
                maxWidth: '560px',
                margin: '20px auto',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>🛍️</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b1716', margin: '0 0 10px' }}>
                Aucune cagnotte pour le moment
              </h2>
              <p style={{ color: '#706966', fontSize: '14px', lineHeight: 1.6, margin: '0 0 22px' }}>
                Vous n'avez pas encore initié de cagnotte. Parcourez notre catalogue et choisissez un article à financer à votre rythme.
              </p>
              {onGoCatalog && (
                <button
                  type="button"
                  onClick={onGoCatalog}
                  className="client-btn"
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  Découvrir les articles
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                gap: '20px',
              }}
            >
              {cagnottesList.map((item) => {
                const prod = item.product || {};
                const itemPct = item.pourcentage || 0;
                const isItemFinished = itemPct >= 100;
                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      border: '1.5px solid #eee7e0',
                      padding: '20px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div>
                      {/* Statut & Date */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '14px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '99px',
                            background: isItemFinished ? '#dcfce7' : '#fee2e2',
                            color: isItemFinished ? '#15803d' : '#b91c1c',
                            fontSize: '11.5px',
                            fontWeight: 800,
                          }}
                        >
                          {isItemFinished ? '🎉 Complétée' : `● En cours (${itemPct}%)`}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#8c8580' }}>{item.dateCommande}</span>
                      </div>

                      {/* Visuel et Titre */}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                        <div
                          style={{
                            width: '74px',
                            height: '74px',
                            borderRadius: '14px',
                            background: '#f7f2ed',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <img
                            src={prod.im || '/assets/category-phones.jpg'}
                            alt={prod.n || 'Article'}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/assets/category-phones.jpg';
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#1b1716', margin: '0 0 3px', lineHeight: 1.3 }}>
                            {prod.n}
                          </h3>
                          <div style={{ fontSize: '12px', color: '#706966' }}>{prod.variant || 'Standard'}</div>
                          <div style={{ fontSize: '13.5px', color: '#dc2626', fontWeight: 800, marginTop: '4px' }}>
                            Total : {formatFCFA(item.prixTotal)}
                          </div>
                        </div>
                      </div>

                      {/* Progression & Chiffres */}
                      <div
                        style={{
                          background: '#faf6f3',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          border: '1px solid #f0e8e0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                          <span style={{ color: '#706966' }}>
                            Cotisé : <b style={{ color: '#15803d' }}>{formatFCFA(item.montantVerse)}</b>
                          </span>
                          <span style={{ color: '#706966' }}>
                            Reste : <b style={{ color: '#b91c1c' }}>{formatFCFA(item.resteAPayer)}</b>
                          </span>
                        </div>

                        <div style={{ width: '100%', height: '8px', background: '#ece5de', borderRadius: '99px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, itemPct)}%`,
                              background: isItemFinished
                                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : 'linear-gradient(90deg, #dc2626, #ef4444)',
                              borderRadius: '99px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions sur chaque carte */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCagnotteId(item.id)}
                        style={{
                          flex: 1,
                          padding: '11px',
                          borderRadius: '12px',
                          border: '1.5px solid #dc2626',
                          background: '#ffffff',
                          color: '#dc2626',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Détails & Versements →
                      </button>

                      {!isItemFinished && (
                        <button
                          type="button"
                          onClick={() => openDeposit(item.id)}
                          style={{ ...primaryButtonStyle, padding: '11px 16px', borderRadius: '12px', fontSize: '13px' }}
                        >
                          Verser
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VUE 2 : DÉTAIL DE LA CAGNOTTE SÉLECTIONNÉE */}
      {activeCagnotte && (
        <>
          {/* Barre d'action supérieure */}
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
              <button
                type="button"
                onClick={() => setSelectedCagnotteId(null)}
                aria-label="Retour à mes cagnottes"
                style={backButtonStyle}
              >
                ‹
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1b1716', margin: 0, letterSpacing: '-0.5px' }}>
                    {p.n || 'Détail de la cagnotte'}
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
                    {isFinished ? '🎉 Financement complété' : `● Échéance en cours (${pct}%)`}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', color: '#706966', fontSize: '13.5px' }}>
                  Suivez l'avancement de vos cotisations et l'ensemble des versements rattachés.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedCagnotteId(null)}
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
                ← Toutes mes cagnottes ({cagnottesList.length})
              </button>

              {!isFinished && (
                <button
                  type="button"
                  onClick={() => openDeposit(cagnotte.id)}
                  style={{
                    ...primaryButtonStyle,
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
                  }}
                >
                  Effectuer un versement
                </button>
              )}
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
                  Félicitations{firstName ? ` ${firstName}` : ''} ! Votre {p.n || 'article'} est entièrement financé !
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.95 }}>
                  L'intégralité des {formatFCFA(cagnotte.prixTotal)} a été versée. Notre équipe prépare votre commande pour la remise en main propre.
                </p>
              </div>
              <span style={{ fontSize: '32px' }}>🎁📦</span>
            </div>
          )}

          {/* Grille à 2 colonnes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* COLONNE GAUCHE */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Résumé produit */}
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
                    src={p.im || '/assets/category-phones.jpg'}
                    alt={p.n || 'Article'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/category-phones.jpg';
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#1b1716', margin: '0 0 3px' }}>{p.n}</h2>
                  <div style={{ fontSize: '12.5px', color: '#706966', marginBottom: '6px' }}>
                    {p.variant || 'Standard'}
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

              {/* Progression */}
              <div
                style={{
                  background: '#faf6f3',
                  borderRadius: '20px',
                  padding: '20px',
                  border: '1px solid #f0e8e0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#2b2624' }}>Progression de remboursement</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>{pct}%</span>
                </div>

                <div style={{ height: '9px', background: '#ece5dc', borderRadius: '99px', overflow: 'hidden', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      height: '100%',
                      background: '#dc2626',
                      borderRadius: '99px',
                      transition: 'width .5s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
                  <div>
                    <small style={{ color: '#8c8580', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Montant déjà versé
                    </small>
                    <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>{formatFCFA(cagnotte.montantVerse)}</b>
                  </div>

                  <div style={{ width: '1px', height: '38px', background: '#ded6cd', margin: '0 16px' }} />

                  <div style={{ textAlign: 'right' }}>
                    <small style={{ color: '#8c8580', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Reste à payer
                    </small>
                    <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>{formatFCFA(cagnotte.resteAPayer)}</b>
                  </div>
                </div>
              </div>

              {/* Échéances (masquées une fois la cagnotte financée) */}
              {!isFinished && (
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
                      <span style={{ fontSize: '11px', color: '#8c8580' }}>{cagnotte.prochainVersement?.date}</span>
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '44px', background: '#ded6cd', margin: '0 12px' }} />

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '22px', marginTop: '1px' }}>🏁</span>
                    <div>
                      <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block' }}>Date de fin estimée</small>
                      <b style={{ fontSize: '15px', fontWeight: 800, color: '#1b1716', display: 'block', marginTop: '2px' }}>
                        {cagnotte.dateFinEstimee}
                      </b>
                      <span style={{ fontSize: '11px', color: '#8c8580' }}>
                        ({cagnotte.moisRestants ?? 0} mois restants)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton principal */}
              {!isFinished && (
                <button
                  type="button"
                  onClick={() => openDeposit(cagnotte.id)}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    fontSize: '15.5px',
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
                  Effectuer un versement
                </button>
              )}
            </div>

            {/* COLONNE DROITE : historique */}
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
                    Versements rattachés à {p.n || 'cette cagnotte'}
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

              {/* Filtres */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {FILTERS.map((filtre) => {
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

              {/* Liste des versements */}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: '14.5px', color: '#1b1716' }}>{tx.titre}</b>
                        <small style={{ fontSize: '11px', color: '#8c8580' }}>{tx.reference || tx.id}</small>
                      </div>
                      <span style={{ fontSize: '12px', color: '#706966', display: 'block', marginTop: '2px' }}>
                        {tx.methode}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9e958f' }}>{tx.date}</span>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <b style={{ fontSize: '15px', color: '#1b1716', display: 'block' }}>+{formatFCFA(tx.montant)}</b>
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
                    {cagnotte.moyenPaiement || 'MTN Mobile Money'}
                    {(user?.telephone || user?.phone || depositPhone) &&
                      ` (${user?.telephone || user?.phone || depositPhone})`}
                  </b>
                </div>

                {!isFinished && (
                  <button
                    type="button"
                    onClick={() => openDeposit(cagnotte.id)}
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
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal 1 : Nouveau versement */}
      {showDepositModal && (
        <div
          style={overlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeposit();
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Nouveau versement</h3>
                <small style={{ color: '#706966', fontSize: '12px' }}>
                  Rattaché à {targetName} · reste {formatFCFA(targetRemaining)}
                </small>
              </div>
              <button
                type="button"
                onClick={closeDeposit}
                aria-label="Fermer"
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            {depositError && (
              <div style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
                {depositError}
              </div>
            )}

            {paymentData ? (
              <FeexPayProvider>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ marginBottom: '14px', padding: '12px', background: 'rgba(22, 163, 74, 0.08)', borderRadius: '10px', fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                    Versement prêt (Réf: {paymentData.reference}). Cliquez ci-dessous pour ouvrir le module sécurisé FeexPay.
                  </div>

                  <FeexPayButton
                    id={paymentData.shop_id}
                    token={paymentData.api_key}
                    amount={paymentData.amount}
                    description={`Takapay - Versement ${targetName}`}
                    mode={paymentData.mode || 'SANDBOX'}
                    currency="XOF"
                    customId={paymentData.reference}
                    callback_info={{
                      first_name: user?.prenom || user?.nom || 'Client',
                      email: user?.email || '',
                    }}
                    callback={handleFeexpayCallback}
                    buttonText={`Payer ${formatFCFA(Number(paymentData.amount))} avec FeexPay`}
                    buttonClass="client-btn w100"
                  />

                  <button
                    type="button"
                    onClick={() => setPaymentData(null)}
                    style={{
                      marginTop: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#706966',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      textDecoration: 'underline',
                    }}
                  >
                    ← Modifier le montant ou l'opérateur
                  </button>
                </div>
              </FeexPayProvider>
            ) : (
              <form onSubmit={handleMakeDeposit}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                Montant du versement (FCFA) *
              </label>

              {quickAmounts.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {quickAmounts.map(({ label, value }) => {
                    const selected = depositAmount === String(value);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setDepositAmount(String(value))}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: '8px',
                          border: selected ? '2px solid #dc2626' : '1px solid #ded6ce',
                          background: selected ? 'rgba(220,38,38,0.06)' : '#faf6f3',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <input
                type="number"
                min="1"
                max={targetRemaining || undefined}
                step="1"
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
                  boxSizing: 'border-box',
                }}
              />

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                Moyen de règlement Mobile Money
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[
                  { id: 'MTN', label: '🟡 MTN MoMo' },
                  { id: 'Moov', label: '🔵 Moov Money' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDepositProvider(opt.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: depositProvider === opt.id ? '2px solid #dc2626' : '1px solid #ded6ce',
                      background: depositProvider === opt.id ? 'rgba(220,38,38,0.06)' : '#faf6f3',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Numéro de débit Mobile Money
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+229 ..."
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
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '15px',
                  opacity: isSubmitting ? 0.8 : 1,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting
                  ? 'Traitement Mobile Money...'
                  : `Confirmer le versement de ${formatFCFA(Number(depositAmount) || 0)}`}
              </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 2 : Reçu numérique */}
      {selectedReceipt && (
        <div
          style={overlayStyle}
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
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 2px' }}>Reçu de versement Takapay</h3>
              <small style={{ color: '#706966', fontSize: '12px' }}>
                Référence : {selectedReceipt.reference || selectedReceipt.id}
              </small>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
              {[
                ['Bénéficiaire :', <b key="b">{selectedReceipt.client || clientName}</b>],
                ['Cagnotte article :', <b key="a">{p.n || '—'}</b>],
                ['Moyen utilisé :', <b key="m">{selectedReceipt.methode}</b>],
                ['Date & heure :', <b key="d">{selectedReceipt.date}</b>],
                ['Statut :', <span key="s" style={{ color: '#15803d', fontWeight: 700 }}>✔ Validé</span>],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#706966' }}>{label}</span>
                  {value}
                </div>
              ))}
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
                onClick={() => window.print()}
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