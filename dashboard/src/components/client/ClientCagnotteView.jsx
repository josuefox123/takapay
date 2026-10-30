import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  MapPin,
  Calendar,
  Banknote,
  Phone,
  Search,
  Handshake,
  AlertTriangle,
  Megaphone,
  Ban,
} from 'lucide-react';
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

const cleanVariantDisplay = (v) => {
  if (!v || typeof v !== 'string') return 'Standard · 1 unité';
  if (v.includes('[') || v.includes('{') || v.includes('"nom"') || v.includes('nom:')) {
    try {
      const jsonStr = v.replace(/·.*$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = parsed[0];
        const col = typeof item === 'string' ? item : (item.nom || item.name || 'Standard');
        return `${col} · 1 unité`;
      }
    } catch { /* ignore */ }
  }
  return v;
};

export default function ClientCagnotteView({ onBack, onShowToast, onGoCatalog, user = null, onGoLogin }) {
  // ---------- TOUS les hooks sont déclarés AVANT tout return ----------
  const [cagnottesList, setCagnottesList] = useState(() => {
    const stored = getStoredCagnottes(user);
    return Array.isArray(stored) ? stored : [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    const stored = getStoredCagnottes(user);
    return !Array.isArray(stored) || stored.length === 0;
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [dismissCancelledBanner, setDismissCancelledBanner] = useState(false);
  const [cancelPhone, setCancelPhone] = useState(user?.telephone || user?.phone || '');
  const [showConfirmReceiptModal, setShowConfirmReceiptModal] = useState(false);
  const [confirmReceiptStep, setConfirmReceiptStep] = useState(1);
  const [receiptCheckbox, setReceiptCheckbox] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [deletingCagnotteId, setDeletingCagnotteId] = useState(null);

  useEffect(() => {
    setDismissCancelledBanner(false);
  }, [selectedCagnotteId]);

  // Synchronisation directe avec l'API / le dashboard admin
  useEffect(() => {
    let isMounted = true;
    if (!user?.id) {
      setCagnottesList([]);
      setIsLoading(false);
      return;
    }
    adminService.getCagnottes(user.id).then((live) => {
      if (!isMounted) return;
      if (Array.isArray(live)) {
        const converted = live.map(mapBackendCagnotteToClient).filter(Boolean);
        try {
          localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(converted));
        } catch { /* ignore */ }
        const merged = getStoredCagnottes(user);
        setCagnottesList(merged);
      }
    }).catch(() => {
      if (isMounted) setCagnottesList(getStoredCagnottes(user));
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [user]);

  // Resynchronise la liste quand une cagnotte est créée ailleurs (ex. AppHome)
  useEffect(() => {
    const sync = () => {
      const next = getStoredCagnottes(user);
      setCagnottesList(Array.isArray(next) ? next : []);
      setIsLoading(false);
    };
    window.addEventListener('takapay_cagnotte_updated', sync);
    return () => window.removeEventListener('takapay_cagnotte_updated', sync);
  }, [user]);

  const handleDeleteUnpaidCagnotte = async (item) => {
    if (!item?.backendId || !item.canDelete) return;
    const productName = item.product?.n || 'cette cagnotte';
    if (!window.confirm(`Supprimer ${productName} ? Cette cagnotte n’a aucun paiement confirmé.`)) return;

    setDeletingCagnotteId(item.id);
    try {
      await adminService.deleteUnpaidCagnotte(item.backendId);
      const updated = cagnottesList.filter((c) => String(c.backendId) !== String(item.backendId));
      setCagnottesList(updated);
      if (String(selectedCagnotteId) === String(item.id)) setSelectedCagnotteId(null);
      localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated', { detail: updated }));
      onShowToast?.('Cagnotte non payée supprimée.');
    } catch (err) {
      onShowToast?.(err.message || 'Impossible de supprimer cette cagnotte.');
    } finally {
      setDeletingCagnotteId(null);
    }
  };

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
  const isCash = Boolean(cagnotte.isCash || cagnotte.mode === 'cash' || cagnotte.mode === 'cash_cod');
  const isCod = Boolean(cagnotte.isCod || cagnotte.mode === 'cash_cod');
  const isPaymentFailed = Boolean(cagnotte.isPaymentFailed || cagnotte.statut === 'payment_failed');
  const isArticleReceived = Boolean(cagnotte.articleRecu || cagnotte.statut === 'recu');
  const isFinished = pct >= 100 || cagnotte.statut === 'completed' || isArticleReceived;
  const isCancelled =
    cagnotte.statut === 'cancelled' ||
    cagnotte.statut === 'annulee' ||
    cagnotte.statut === 'annulation_demandee' ||
    cagnotte.rawStatut === 'annulee' ||
    cagnotte.rawStatut === 'annulation_demandee';

  const isRefundCompleted =
    isCancelled &&
    cagnotte.statut !== 'annulation_demandee' &&
    cagnotte.rawStatut !== 'annulation_demandee' &&
    !(cagnotte.transactions || []).some(
      (t) =>
        (t.type === 'remboursement' || t.type === 'annulation') &&
        (t.statut === 'en_attente' || t.statut === 'En attente')
    ) &&
    (cagnotte.rawStatut === 'annulee' ||
      cagnotte.statut === 'annulee' ||
      (cagnotte.transactions || []).some(
        (t) =>
          (t.type === 'remboursement' ||
            t.type === 'annulation' ||
            t.titre?.toLowerCase().includes('renvoyé')) &&
          (t.statut === 'succes' ||
            t.statut === 'reussi' ||
            t.statut === 'Argent renvoyé' ||
            t.statut === 'Réussi' ||
            t.statut === 'effectue')
      ));
  const isLibre =
    cagnotte.mode === 'libre' ||
    cagnotte.product?.payment?.mode === 'libre' ||
    cagnotte.product?.mode_paiement === 'libre';

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

  const openCancelModal = () => {
    setCancelPhone(user?.telephone || user?.phone || activeCagnotte?.deliveryPhone || '');
    setShowCancelModal(true);
  };

  const handleCancelCagnotte = async () => {
    if (!activeCagnotte) return;
    setIsCancelling(true);

    const targetId = activeCagnotte.id;
    const paidAmount = Number(activeCagnotte.montantVerse) || 0;
    const penaltyPercent = 5;
    const penaltyAmount = Math.round((paidAmount * penaltyPercent) / 100);
    const refundAmount = Math.max(0, paidAmount - penaltyAmount);
    const effectivePhone = (cancelPhone || '').trim() || user?.telephone || user?.phone || activeCagnotte.deliveryPhone || 'Mobile Money';

    const now = new Date();
    const dateFormatted =
      now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const updatedCagnotte = {
      ...activeCagnotte,
      statut: 'annulation_demandee',
      rawStatut: 'annulation_demandee',
      montantRemboursement: refundAmount,
      fraisAnnulation: penaltyAmount,
      telephoneRemboursement: effectivePhone,
      dateDemandeAnnulation: dateFormatted,
      transactions: activeCagnotte.transactions || [],
    };

    const updatedList = cagnottesList.map((c) =>
      String(c.id) === String(targetId) ? updatedCagnotte : c
    );

    setCagnottesList(updatedList);

    try {
      localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated'));
    } catch {
      // Ignorer
    }

    const backendCagnotteId = activeCagnotte.backendId || (String(activeCagnotte.id).startsWith('cag-') ? String(activeCagnotte.id).replace('cag-', '') : activeCagnotte.id);
    if (backendCagnotteId) {
      try {
        await adminService.cancelCagnotte(backendCagnotteId, {
          telephone: effectivePhone,
          email: user?.email || '',
        });
      } catch (err) {
        console.warn('Erreur API annulation:', err);
      }
    }

    setIsCancelling(false);
    setShowCancelModal(false);

    onShowToast?.(
      paidAmount > 0
        ? `Demande d'annulation prise en compte. Un virement de ${formatFCFA(refundAmount)} (déduit de 5% de frais) vous sera renvoyé dans un délai de 24H sur le ${effectivePhone}.`
        : 'Cagnotte annulée avec succès.'
    );
  };

  const handleReactivateCagnotte = async () => {
    if (!activeCagnotte) return;
    setIsReactivating(true);

    const targetId = activeCagnotte.id;
    const isTargetCash = Boolean(activeCagnotte.isCash || activeCagnotte.mode === 'cash' || activeCagnotte.mode === 'cash_cod');
    const newStatut = isTargetCash ? 'en_attente' : 'en_cours';

    const updatedCagnotte = {
      ...activeCagnotte,
      statut: newStatut,
      rawStatut: newStatut,
      montantRemboursement: null,
      fraisAnnulation: null,
      telephoneRemboursement: null,
      transactions: (activeCagnotte.transactions || []).filter(
        (t) => t.type !== 'annulation' && t.type !== 'remboursement' && t.type !== 'reactivation'
      ),
    };

    const updatedList = cagnottesList.map((c) =>
      String(c.id) === String(targetId) ? updatedCagnotte : c
    );

    setCagnottesList(updatedList);
    setDismissCancelledBanner(false);

    try {
      localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated'));
    } catch {
      // Ignorer
    }

    const backendCagnotteId = activeCagnotte.backendId || (String(activeCagnotte.id).startsWith('cag-') ? String(activeCagnotte.id).replace('cag-', '') : activeCagnotte.id);
    if (backendCagnotteId) {
      try {
        await adminService.reactivateCagnotte(backendCagnotteId, { statut: newStatut });
      } catch (err) {
        console.warn('Erreur API réactivation:', err);
      }
    }

    setIsReactivating(false);

    onShowToast?.(
      isTargetCash
        ? 'Votre commande a bien été rétablie.'
        : 'Votre cagnotte a été rétablie avec succès. Vous pouvez continuer vos versements !'
    );
  };

  const handleConfirmReceipt = async () => {
    if (!activeCagnotte) return;
    setIsConfirmingReceipt(true);

    const targetId = activeCagnotte.id;
    const now = new Date();
    const dateFormatted =
      now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const deliveryTx = {
      id: `tx-received-${Date.now()}`,
      reference: `TK-RECU-${Date.now()}`,
      titre: 'Réception confirmée par le client',
      methode: activeCagnotte.isCod ? 'Espèces à la livraison' : 'Remise en main propre',
      date: dateFormatted,
      montant: activeCagnotte.prixTotal,
      statut: 'Article reçu',
      type: 'reception',
      periode: 'aujourdhui',
      client: clientName,
    };

    const updatedCagnotte = {
      ...activeCagnotte,
      articleRecu: true,
      statut: 'recu',
      dateReception: dateFormatted,
      montantVerse: activeCagnotte.prixTotal,
      resteAPayer: 0,
      pourcentage: 100,
      transactions: [deliveryTx, ...(activeCagnotte.transactions || [])],
    };

    const updatedList = cagnottesList.map((c) =>
      String(c.id) === String(targetId) ? updatedCagnotte : c
    );

    setCagnottesList(updatedList);

    try {
      localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated'));
    } catch {
      // Ignorer
    }

    const orderIdToConfirm = activeCagnotte.commandeId || activeCagnotte.backendId;
    if (orderIdToConfirm) {
      try {
        await adminService.confirmOrderReception(orderIdToConfirm);
      } catch {
        // Ignorer
      }
    }
    if (activeCagnotte.backendId) {
      try {
        await adminService.confirmCagnotteReception(activeCagnotte.backendId);
      } catch {
        // Ignorer
      }
    }

    setIsConfirmingReceipt(false);
    setShowConfirmReceiptModal(false);
    setConfirmReceiptStep(1);
    setReceiptCheckbox(false);

    onShowToast?.('🎉 Merci ! Vous avez confirmé la bonne réception de votre article.');
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
      let amountNum = parseInt(depositAmount, 10) || Number(response.amount) || 0;
      const customerEmail = response.email || user?.email || null;

      try {
        const confirmation = await adminService.confirmPayment({
          reference: orderRef,
          status: 'successful',
          transaction_id: response.transaction_id || response.id || response.reference || orderRef,
          amount: amountNum,
          reseau: response.reseau || depositProvider,
          user_id: user?.id,
          client_email: customerEmail,
        });
        if (confirmation?.status !== 'success') {
          throw new Error(confirmation?.message || 'FeexPay n’a pas confirmé le paiement.');
        }
        amountNum = Number(confirmation.amount) || amountNum;
      } catch (err) {
        setDepositError(err.message || 'Impossible de confirmer le paiement auprès de FeexPay.');
        return;
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
                  {isLoading
                    ? 'Chargement de vos cagnottes...'
                    : `${cagnottesList.length} cagnotte${cagnottesList.length > 1 ? 's' : ''} en cours ou complétée${cagnottesList.length > 1 ? 's' : ''}`}
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

          {isLoading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                gap: '20px',
              }}
            >
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #eee7e0',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ height: '140px', background: '#f5f0eb', borderRadius: '14px' }} />
                  <div style={{ height: '18px', width: '60%', background: '#f5f0eb', borderRadius: '6px' }} />
                  <div style={{ height: '14px', width: '40%', background: '#f5f0eb', borderRadius: '6px' }} />
                  <div style={{ height: '38px', background: '#f5f0eb', borderRadius: '10px', marginTop: 'auto' }} />
                </div>
              ))}
            </div>
          ) : cagnottesList.length === 0 ? (
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
                const isItemCash = Boolean(item.isCash || item.mode === 'cash' || item.mode === 'cash_cod');
                const isItemCod = Boolean(item.isCod || item.mode === 'cash_cod');
                const isItemReceived = Boolean(item.articleRecu || item.statut === 'recu');
                const isItemFinished = itemPct >= 100 || item.statut === 'completed' || isItemReceived;
                const isItemCancelled =
                  item.statut === 'cancelled' ||
                  item.statut === 'annulee' ||
                  item.statut === 'annulation_demandee' ||
                  item.rawStatut === 'annulee' ||
                  item.rawStatut === 'annulation_demandee';

                const isItemPaymentFailed = Boolean(item.isPaymentFailed || item.statut === 'payment_failed');
                const hasNoConfirmedPayment = Boolean(item.canDelete && !isItemPaymentFailed);
                const isItemRefundCompleted =
                  isItemCancelled &&
                  item.statut !== 'annulation_demandee' &&
                  item.rawStatut !== 'annulation_demandee' &&
                  !(item.transactions || []).some(
                    (t) =>
                      (t.type === 'remboursement' || t.type === 'annulation') &&
                      (t.statut === 'en_attente' || t.statut === 'En attente')
                  ) &&
                  (item.rawStatut === 'annulee' ||
                    item.statut === 'annulee' ||
                    (item.transactions || []).some(
                      (t) =>
                        (t.type === 'remboursement' ||
                          t.type === 'annulation' ||
                          t.titre?.toLowerCase().includes('renvoyé')) &&
                        (t.statut === 'succes' ||
                          t.statut === 'reussi' ||
                          t.statut === 'Argent renvoyé' ||
                          t.statut === 'Réussi')
                    ));
                return (
                  <div
                    key={item.id}
                    style={{
                      background: isItemCancelled ? '#fcfbf9' : '#ffffff',
                      borderRadius: '20px',
                      border: isItemCancelled ? '1.5px dashed #ded6cd' : '1.5px solid #eee7e0',
                      padding: '20px',
                      boxShadow: isItemCancelled ? 'none' : '0 4px 16px rgba(0,0,0,0.03)',
                      opacity: isItemCancelled ? 0.8 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'all 0.2s ease',
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
                            background: isItemCancelled
                              ? '#fee2e2'
                              : isItemPaymentFailed
                              ? '#fee2e2'
                              : hasNoConfirmedPayment
                              ? '#fff7ed'
                              : isItemReceived
                              ? '#dcfce7'
                              : isItemCod
                              ? '#fef3c7'
                              : isItemCash
                              ? '#f0fdf4'
                              : isItemFinished
                              ? '#dcfce7'
                              : '#fef3c7',
                            color: isItemCancelled
                              ? '#b91c1c'
                              : isItemPaymentFailed
                              ? '#b91c1c'
                              : hasNoConfirmedPayment
                              ? '#c2410c'
                              : isItemReceived
                              ? '#15803d'
                              : isItemCod
                              ? '#b45309'
                              : isItemCash
                              ? '#166534'
                              : isItemFinished
                              ? '#15803d'
                              : '#b45309',
                            fontSize: '11.5px',
                            fontWeight: 800,
                          }}
                        >
                          {isItemCancelled
                            ? '✕ Annulée'
                            : isItemPaymentFailed
                            ? '✕ Paiement échoué'
                            : hasNoConfirmedPayment
                            ? '⚠ Aucun paiement confirmé'
                            : isItemReceived
                            ? '✔ Article reçu'
                            : isItemCod
                            ? '🚚 Paiement à la livraison'
                            : isItemCash
                            ? '💵 Achat comptant'
                            : isItemFinished
                            ? '🎉 Complétée'
                            : `● En cours (${itemPct}%)`}
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
                            src={prod.im || ''}
                            alt={prod.n || 'Article'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              filter: isItemCancelled ? 'grayscale(40%)' : 'none',
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.opacity = '0';
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: isItemCancelled ? '#57534e' : '#1b1716', margin: '0 0 3px', lineHeight: 1.3 }}>
                            {prod.n}
                          </h3>
                          <div style={{ fontSize: '12px', color: '#706966' }}>{cleanVariantDisplay(prod.variant)}</div>
                          <div style={{ fontSize: '13.5px', color: isItemCancelled ? '#78716c' : '#dc2626', fontWeight: 800, marginTop: '4px' }}>
                            Total : {formatFCFA(item.prixTotal)}
                          </div>
                        </div>
                      </div>

                      {/* Progression & Chiffres */}
                      <div
                        style={{
                          background: isItemCancelled ? '#f5f0eb' : '#faf6f3',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          border: '1px solid #f0e8e0',
                        }}
                      >
                        {isItemCancelled ? (
                          <div style={{ fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ color: '#706966' }}>Statut :</span>
                              <b style={{ color: '#b91c1c' }}>
                                {isItemCod ? 'Commande annulée' : 'Cagnotte interrompue'}
                              </b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#706966' }}>
                                {isItemCod ? 'Frais d’annulation :' : 'Cotisations :'}
                              </span>
                              <b style={{ color: '#1b1716' }}>
                                {isItemCod
                                  ? '0 FCFA (Sans frais)'
                                  : Number(item.montantVerse) > 0
                                  ? `${formatFCFA(item.montantVerse)} (${isItemRefundCompleted ? 'Argent renvoyé' : 'Remboursement sous 24H'})`
                                  : '0 FCFA'}
                              </b>
                            </div>
                          </div>
                        ) : isItemCash ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                              <span style={{ color: '#706966' }}>{isItemCod ? 'Modalité :' : 'Règlement :'}</span>
                              <b style={{ color: isItemPaymentFailed ? '#b91c1c' : hasNoConfirmedPayment ? '#c2410c' : isItemReceived ? '#15803d' : isItemCod ? '#0369a1' : '#166534' }}>
                                {isItemPaymentFailed
                                  ? 'Paiement échoué'
                                  : hasNoConfirmedPayment
                                  ? 'Aucun paiement confirmé'
                                  : isItemReceived
                                  ? 'Colis livré & réceptionné'
                                  : isItemCod
                                  ? 'À régler au livreur'
                                  : 'Payé au comptant'}
                              </b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ color: '#706966' }}>Montant :</span>
                              <b style={{ color: '#1b1716' }}>{formatFCFA(isItemCod ? item.prixTotal : item.montantVerse)}</b>
                            </div>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
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
                          border: isItemCancelled ? '1px solid #ded6cd' : '1.5px solid #dc2626',
                          background: isItemCancelled ? '#f5f0eb' : '#ffffff',
                          color: isItemCancelled ? '#57534e' : '#dc2626',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {isItemCancelled
                          ? 'Voir l’annulation →'
                          : isItemCash
                          ? 'Détails & Suivi →'
                          : 'Détails & Versements →'}
                      </button>

                      {!isItemCash && !isItemFinished && !isItemCancelled && (
                        <button
                          type="button"
                          onClick={() => openDeposit(item.id)}
                          style={{ ...primaryButtonStyle, padding: '11px 16px', borderRadius: '12px', fontSize: '13px' }}
                        >
                          Verser
                        </button>
                      )}
                      {item.canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUnpaidCagnotte(item)}
                          disabled={deletingCagnotteId === item.id}
                          style={{
                            padding: '11px 12px',
                            borderRadius: '12px',
                            border: '1px solid #fecaca',
                            background: '#fff1f2',
                            color: '#b91c1c',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: deletingCagnotteId === item.id ? 'wait' : 'pointer',
                            opacity: deletingCagnotteId === item.id ? 0.65 : 1,
                          }}
                        >
                          {deletingCagnotteId === item.id ? 'Suppression…' : 'Supprimer'}
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
                      background: isCancelled
                        ? '#fee2e2'
                        : isPaymentFailed
                        ? '#fee2e2'
                        : cagnotte.canDelete
                        ? '#fff7ed'
                        : isArticleReceived
                        ? '#dcfce7'
                        : isCod
                        ? '#fef3c7'
                        : isCash
                        ? '#f0fdf4'
                        : isFinished
                        ? '#dcfce7'
                        : '#fee2e2',
                      color: isCancelled
                        ? '#b91c1c'
                        : isPaymentFailed
                        ? '#b91c1c'
                        : cagnotte.canDelete
                        ? '#c2410c'
                        : isArticleReceived
                        ? '#15803d'
                        : isCod
                        ? '#b45309'
                        : isCash
                        ? '#166534'
                        : isFinished
                        ? '#15803d'
                        : '#b91c1c',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {isCancelled
                      ? (isRefundCompleted
                        ? '✕ Cagnotte annulée · Remboursée'
                        : (cagnotte.statut === 'annulation_demandee' || cagnotte.rawStatut === 'annulation_demandee'
                          ? '✕ Annulation demandée · Remboursement sous 24H'
                          : '✕ Cagnotte annulée'))
                      : isPaymentFailed
                      ? '✕ Paiement échoué'
                      : cagnotte.canDelete
                      ? '⚠ Aucun paiement confirmé'
                      : isArticleReceived
                      ? '✔ Article reçu'
                      : isCod
                      ? '🚚 Paiement à la livraison'
                      : isCash
                      ? '💵 Achat comptant'
                      : isFinished
                      ? '🎉 Financement complété'
                      : isLibre
                      ? `● Cotisation libre (${pct}%)`
                      : `● Échéance en cours (${pct}%)`}
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

              {isCash && !isArticleReceived && (isCod || cagnotte.hasConfirmedPayment) && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReceiptStep(1);
                    setReceiptCheckbox(false);
                    setShowConfirmReceiptModal(true);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Oui, article reçu
                </button>
              )}

              {!isFinished && !isArticleReceived && !isCancelled && (
                <button
                  type="button"
                  onClick={openCancelModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #fecaca',
                    background: '#fff1f2',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff1f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                  {isCash ? 'Annuler la commande' : 'Annuler la cagnotte'}
                </button>
              )}
            </div>
          </div>

          {/* Bannière commande paiement à la livraison */}
          {isCod && !isArticleReceived && !isCancelled && (
            <div
              style={{
                background: 'linear-gradient(135deg, #1b1716 0%, #2a2321 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                border: '1.5px solid rgba(245, 158, 11, 0.25)',
                boxShadow: '0 8px 24px rgba(27, 23, 22, 0.15)',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
                  Commande en mode Cash (Paiement à la livraison)
                </h3>
                <p style={{ margin: '0 0 6px', fontSize: '14px', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Megaphone size={16} color="#fbbf24" />
                  <span><b style={{ color: '#fbbf24' }}>La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.</b></span>
                </p>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                  Vous réglerez <b style={{ color: '#fbbf24' }}>{formatFCFA(cagnotte.prixTotal)}</b> en espèces directement au livreur lors de la réception.
                </p>
              </div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Truck size={28} color="#fbbf24" />
              </div>
            </div>
          )}

          {/* Bannière d'annulation : uniquement tant que le remboursement n'a pas encore été retourné */}
          {isCancelled && !isRefundCompleted && !dismissCancelledBanner && (
            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecaca',
                color: '#991b1b',
                borderRadius: '20px',
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(220,38,38,0.08)',
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '22px', color: '#dc2626' }}>info</span>
                  <span>{isCash ? 'Commande annulée' : 'Cagnotte annulée · Remboursement sous 24H'}</span>
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '13.5px', opacity: 0.95, lineHeight: 1.5 }}>
                  {isCash
                    ? 'Cette commande a été annulée à votre demande. Aucun montant ne vous sera réclamé et la livraison ne sera pas effectuée.'
                    : "Cette cagnotte fait l'objet d'une demande d'annulation. Conformément aux CGU, une retenue forfaitaire de 5% est déduite pour frais de gestion. Le montant restant (95%) vous sera renvoyé dans un délai maximal de 24 heures sur votre numéro Mobile Money."}
                </p>

                {/* Bouton fonctionnel pour rétablir la cagnotte et annuler l'annulation */}
                <button
                  type="button"
                  onClick={handleReactivateCagnotte}
                  disabled={isReactivating}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #dc2626',
                    background: '#ffffff',
                    color: '#dc2626',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: isReactivating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(220,38,38,0.12)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dc2626';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#dc2626';
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>
                    replay
                  </span>
                  <span>
                    {isReactivating
                      ? 'Rétablissement...'
                      : isCash
                      ? 'Rétablir ma commande'
                      : 'Rétablir ma cagnotte'}
                  </span>
                </button>
              </div>

              {/* Croix fonctionnelle pour fermer/masquer la bannière */}
              <button
                type="button"
                onClick={() => setDismissCancelledBanner(true)}
                title="Masquer cette alerte"
                aria-label="Fermer l'alerte"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid #fecaca',
                  background: '#fee2e2',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '17px',
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fca5a5';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Bannière de félicitations */}
          {(isFinished || isArticleReceived) && !isCancelled && (
            <div
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '22px 26px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 10px 28px -6px rgba(6, 78, 59, 0.28)',
              }}
            >
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      background: 'rgba(255, 255, 255, 0.16)',
                      padding: '3px 10px',
                      borderRadius: '99px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {isArticleReceived ? 'Livraison effectuée' : 'Financement complété'}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                  {isArticleReceived
                    ? `Félicitations${firstName ? ` ${firstName}` : ''} ! Votre article a bien été réceptionné`
                    : `Félicitations${firstName ? ` ${firstName}` : ''} ! Votre ${p.n || 'article'} est entièrement financé !`}
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.92, lineHeight: 1.5 }}>
                  {isArticleReceived
                    ? 'La réception en main propre a été confirmée et la commande est désormais clôturée avec succès. Merci pour votre confiance !'
                    : `L'intégralité des ${formatFCFA(cagnotte.prixTotal)} a été versée. Notre équipe prépare votre commande pour la remise en main propre.`}
                </p>
              </div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <PackageCheck size={30} color="#ffffff" />
              </div>
            </div>
          )}

          {/* AFFICHAGE PAIEMENT À LA LIVRAISON VS CAGNOTTE CLASSIQUE */}
          {isCod ? (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Grille principale : Produit + Infos de Livraison */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                  gap: '24px',
                  alignItems: 'start',
                }}
              >
                {/* CARTE 1 : Récapitulatif Article & Règlement Cash */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '1.5px solid #eee7e0',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        background: '#f7f2ed',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <img
                        src={p.im || ''}
                        alt={p.n || 'Article'}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.opacity = '0';
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#706966',
                          background: '#f3ece6',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {p.c || p.subcategory || 'Article commandé'}
                      </span>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b1716', margin: '0 0 4px', lineHeight: 1.25 }}>
                        {p.n}
                      </h2>
                      <div style={{ fontSize: '13px', color: '#706966' }}>
                        {cleanVariantDisplay(p.variant)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8580', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} style={{ color: '#8c8580' }} />
                        <span>Commandé le {cagnotte.dateCommande}</span>
                      </div>
                    </div>
                  </div>

                  {/* Encadré Montant à payer en espèces */}
                  <div
                    style={{
                      background: isArticleReceived ? '#fdf8ea' : '#faf6f2',
                      border: isArticleReceived ? '1.5px solid #fde68a' : '1.5px solid #ece5e0',
                      borderRadius: '18px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                        Montant à régler au livreur :
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          color: isCancelled ? '#b91c1c' : '#b45309',
                          background: isCancelled ? '#fee2e2' : '#fef3c7',
                          border: isCancelled ? '1px solid #fecaca' : '1px solid #fde68a',
                          padding: '3px 10px',
                          borderRadius: '99px',
                        }}
                      >
                        {isCancelled ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ✕ Commande annulée
                          </span>
                        ) : isArticleReceived ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} color="#b45309" /> Réceptionné & Payé
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Banknote size={12} color="#b45309" /> Espèces à la livraison
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: isCancelled ? '#78716c' : '#1b1716', letterSpacing: '-0.5px' }}>
                      {formatFCFA(cagnotte.prixTotal)}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                      {isCancelled
                        ? 'Cette commande a été annulée. Aucun règlement ne sera perçu et le livreur ne sera pas déployé.'
                        : isArticleReceived
                        ? 'Le règlement a été effectué en totalité auprès du coursier.'
                        : 'Aucun paiement en ligne requis. Vous réglerez cette somme directement au coursier à la réception.'}
                    </p>
                  </div>

                  {/* Bouton d'action principal */}
                  {isCancelled ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        background: '#fef2f2',
                        border: '1.5px solid #fecaca',
                        color: '#991b1b',
                        fontWeight: 700,
                        fontSize: '13.5px',
                      }}
                    >
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: '#dc2626' }}>cancel</span>
                      <span>Commande annulée. Livraison et paiement désactivés.</span>
                    </div>
                  ) : !isArticleReceived ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReceiptStep(1);
                        setReceiptCheckbox(false);
                        setShowConfirmReceiptModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        border: 'none',
                        background: '#1b1716',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '15.5px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(27, 23, 22, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all .15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#2b2422'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#1b1716'; }}
                    >
                      <CheckCircle2 size={20} color="#f59e0b" />
                      Oui, j'ai reçu l'article
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        color: '#92400e',
                        fontWeight: 700,
                        fontSize: '13.5px',
                      }}
                    >
                      <CheckCircle2 size={20} color="#b45309" />
                      <span>Article réceptionné & commande clôturée avec succès.</span>
                    </div>
                  )}
                </div>

                {/* CARTE 2 : Coordonnées de livraison */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '1.5px solid #eee7e0',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <MapPin size={20} color="#b45309" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1b1716', margin: 0 }}>
                        Détails de la livraison
                      </h3>
                      <small style={{ color: '#706966', fontSize: '12px' }}>
                        Coordonnées transmises au service de livraison
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Adresse */}
                    <div
                      style={{
                        background: '#faf6f3',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        border: '1px solid #f0e8e0',
                      }}
                    >
                      <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Adresse de destination
                      </small>
                      <b style={{ fontSize: '14px', color: '#1b1716', lineHeight: 1.4 }}>
                        {cagnotte.deliveryAddress || user?.adresse || 'Position convenue avec le coursier'}
                      </b>
                    </div>

                    {/* Contact téléphone */}
                    <div
                      style={{
                        background: '#faf6f3',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        border: '1px solid #f0e8e0',
                      }}
                    >
                      <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Numéro à contacter par le livreur
                      </small>
                      <b style={{ fontSize: '15px', color: '#1b1716' }}>
                        {cagnotte.deliveryPhone || user?.telephone || user?.phone || 'Numéro client'}
                      </b>
                    </div>

                    {/* Note d'information si présente */}
                    {cagnotte.deliveryNote && (
                      <div
                        style={{
                          background: '#faf6f3',
                          borderRadius: '14px',
                          padding: '14px 16px',
                          border: '1px solid #f0e8e0',
                        }}
                      >
                        <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                          Note pour le livreur
                        </small>
                        <span style={{ fontSize: '13.5px', color: '#2b2624', lineHeight: 1.4 }}>
                          {cagnotte.deliveryNote}
                        </span>
                      </div>
                    )}

                    {/* Mode de règlement */}
                    <div
                      style={{
                        background: '#faf6f3',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        border: '1px solid #f0e8e0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                          Mode de règlement
                        </small>
                        <b style={{ fontSize: '13.5px', color: '#1b1716' }}>Espèces à la réception</b>
                      </div>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'grid', placeItems: 'center' }}>
                        <Handshake size={18} color="#b45309" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARTE 3 : Étapes et suivi de la commande (Timeline) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #eee7e0',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Truck size={20} color="#b45309" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1b1716', margin: 0 }}>
                      Étapes de votre commande
                    </h3>
                    <small style={{ color: '#706966', fontSize: '12px' }}>
                      Progression en temps réel de votre livraison
                    </small>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* Étape 1 */}
                  <div
                    style={{
                      background: '#faf6f2',
                      border: '1.5px solid #ece5e0',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ background: '#1b1716', color: '#fbbf24', width: '24px', height: '24px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 800 }}>
                        1
                      </span>
                      <b style={{ fontSize: '13.5px', color: '#1b1716' }}>Commande passée</b>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      Votre commande a bien été enregistrée le {cagnotte.dateCommande}.
                    </p>
                  </div>

                  {/* Étape 2 */}
                  <div
                    style={{
                      background: isArticleReceived ? '#faf6f2' : '#fffbeb',
                      border: isArticleReceived ? '1.5px solid #ece5e0' : '1.5px solid #fde68a',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          background: isArticleReceived ? '#1b1716' : '#f59e0b',
                          color: isArticleReceived ? '#fbbf24' : '#1b1716',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        2
                      </span>
                      <b style={{ fontSize: '13.5px', color: isArticleReceived ? '#1b1716' : '#92400e' }}>
                        Confirmation stock
                      </b>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {isArticleReceived
                        ? 'Disponibilité confirmée avec succès.'
                        : 'L’équipe vérifie la disponibilité et vous contactera sous peu.'}
                    </p>
                  </div>

                  {/* Étape 3 */}
                  <div
                    style={{
                      background: isArticleReceived ? '#faf6f2' : '#faf6f3',
                      border: isArticleReceived ? '1.5px solid #ece5e0' : '1.5px solid #f0e8e0',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          background: isArticleReceived ? '#1b1716' : '#706966',
                          color: isArticleReceived ? '#fbbf24' : '#ffffff',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        3
                      </span>
                      <b style={{ fontSize: '13.5px', color: isArticleReceived ? '#1b1716' : '#2b2624' }}>
                        Acheminement
                      </b>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {isArticleReceived
                        ? 'Le colis a été acheminé à destination.'
                        : 'Le coursier est déployé pour acheminer votre colis à votre adresse.'}
                    </p>
                  </div>

                  {/* Étape 4 */}
                  <div
                    style={{
                      background: isArticleReceived ? '#fdf8ea' : '#faf6f3',
                      border: isArticleReceived ? '1.5px solid #fde68a' : '1.5px solid #f0e8e0',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          background: isArticleReceived ? '#f59e0b' : '#706966',
                          color: isArticleReceived ? '#1b1716' : '#ffffff',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        4
                      </span>
                      <b style={{ fontSize: '13.5px', color: isArticleReceived ? '#92400e' : '#2b2624' }}>
                        Réception & Cash
                      </b>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {isArticleReceived
                        ? 'Réceptionné et réglé en espèces.'
                        : `Contrôle de l’article et paiement de ${formatFCFA(cagnotte.prixTotal)} en espèces.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARTE 4 : Consignes utiles pour le client */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '20px 24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Banknote size={20} color="#b45309" />
                  </div>
                  <div>
                    <b style={{ fontSize: '13.5px', color: '#1e293b', display: 'block', marginBottom: '3px' }}>
                      Préparez la somme exacte
                    </b>
                    <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                      Afin de faciliter l’échange avec le coursier, veuillez préparer <b>{formatFCFA(cagnotte.prixTotal)}</b> en espèces.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Phone size={20} color="#b45309" />
                  </div>
                  <div>
                    <b style={{ fontSize: '13.5px', color: '#1e293b', display: 'block', marginBottom: '3px' }}>
                      Restez joignable au téléphone
                    </b>
                    <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                      Le livreur vous contactera sur le <b>{cagnotte.deliveryPhone || user?.telephone || 'votre numéro'}</b> avant de se présenter.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Search size={20} color="#b45309" />
                  </div>
                  <div>
                    <b style={{ fontSize: '13.5px', color: '#1e293b', display: 'block', marginBottom: '3px' }}>
                      Vérifiez l’article à la remise
                    </b>
                    <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                      Inspectez le colis en présence du livreur avant de remettre le paiement et de valider la réception.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Grille à 2 colonnes classique pour les cagnottes */
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
                    src={p.im || ''}
                    alt={p.n || 'Article'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.opacity = '0';
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#1b1716', margin: '0 0 3px' }}>{p.n}</h2>
                  <div style={{ fontSize: '12.5px', color: '#706966', marginBottom: '6px' }}>
                    {cleanVariantDisplay(p.variant)}
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

              {/* Progression active OU Bilan d'annulation */}
              <div
                style={{
                  background: isCancelled ? '#fffaf5' : '#faf6f3',
                  borderRadius: '20px',
                  padding: '20px',
                  border: isCancelled ? '1.5px solid #fed7aa' : '1px solid #f0e8e0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: isCancelled ? '#9a3412' : '#2b2624' }}>
                    {isCancelled
                      ? 'Bilan financier de l’annulation'
                      : isLibre
                      ? 'Progression de la cagnotte (Objectif 100%)'
                      : 'Progression du financement'}
                  </span>
                  {!isCancelled && <span style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>{pct}%</span>}
                </div>

                {!isCancelled ? (
                  <>
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
                          Versement cagnotte (Total cotisé)
                        </small>
                        <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>{formatFCFA(cagnotte.montantVerse)}</b>
                      </div>

                      <div style={{ width: '1px', height: '38px', background: '#ded6cd', margin: '0 16px' }} />

                      <div style={{ textAlign: 'right' }}>
                        <small style={{ color: '#8c8580', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                          Reste à verser
                        </small>
                        <b style={{ fontSize: '17px', fontWeight: 800, color: '#1b1716' }}>{formatFCFA(cagnotte.resteAPayer)}</b>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#706966' }}>1. Versement cagnotte (Total cotisé) :</span>
                      <b style={{ color: '#1b1716', fontSize: '14.5px' }}>{formatFCFA(cagnotte.montantVerse || 0)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#b91c1c' }}>2. Frais de retenue gestion (5%) :</span>
                      <b style={{ color: '#b91c1c' }}>
                        - {formatFCFA(cagnotte.fraisAnnulation || Math.round(((cagnotte.montantVerse || 0) * 5) / 100))}
                      </b>
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid #fed7aa',
                        paddingTop: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <b style={{ color: '#c2410c', fontSize: '14px', display: 'block' }}>
                          {isRefundCompleted
                            ? '3. Argent renvoyé au client (95%) :'
                            : '3. Argent à renvoyer sous 24H (95%) :'}
                        </b>
                        <small style={{ color: '#706966', fontSize: '11.5px' }}>
                          {isRefundCompleted
                            ? `Viré sur le compte Mobile Money : ${cagnotte.telephoneRemboursement || user?.telephone || user?.phone || 'renseigné'}`
                            : `Sera reversé sous 24H sur le compte Mobile Money : ${cagnotte.telephoneRemboursement || user?.telephone || user?.phone || 'renseigné'}`}
                        </small>
                      </div>
                      <b style={{ color: '#c2410c', fontSize: '17px', fontWeight: 900 }}>
                        {formatFCFA(
                          cagnotte.montantRemboursement ||
                            Math.max(
                              0,
                              (cagnotte.montantVerse || 0) -
                                Math.round(((cagnotte.montantVerse || 0) * 5) / 100)
                            )
                        )}
                      </b>
                    </div>
                  </div>
                )}
              </div>

              {/* Information Cagnotte Libre : récupération à 100% */}
              {!isFinished && isLibre && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '12px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <div style={{ fontSize: '12.5px', color: '#991b1b', lineHeight: 1.4 }}>
                    <b>Modalité Cagnotte Libre :</b> Vous cotisez à votre rythme. Votre article est débloqué et expédié dès que votre jauge atteint <b>100%</b> ({formatFCFA(cagnotte.montantTotal || cagnotte.product?.p)}).
                  </div>
                </div>
              )}

              {/* Échéances (masquées en mode libre, une fois financée OU si cagnotte annulée) */}
              {!isFinished && !isLibre && !isCancelled && (
                <div className="cagnotte-detail-schedule-grid">
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

                  <div className="cagnotte-detail-schedule-divider" style={{ width: '1px', height: '44px', background: '#ded6cd', margin: '0 12px' }} />

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '22px', marginTop: '1px' }}>🏁</span>
                    <div>
                      <small style={{ color: '#8c8580', fontSize: '11.5px', display: 'block' }}>Date de fin estimée</small>
                      <b style={{ fontSize: '15px', fontWeight: 800, color: '#1b1716', display: 'block', marginTop: '2px' }}>
                        {cagnotte.dateFinEstimee}
                      </b>
                      <span style={{ fontSize: '11px', color: '#8c8580' }}>
                        ({cagnotte.moisRestants ?? 0} {cagnotte.moisRestants > 1 ? 'mois restants' : 'mois restant'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Coordonnées de livraison si commande cash / livraison */}
              {isCash && (
                <div
                  style={{
                    background: '#faf6f3',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f0e8e0',
                    marginTop: '16px',
                  }}
                >
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#1b1716', margin: '0 0 10px' }}>
                    📦 Coordonnées de livraison
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div>
                      <span style={{ color: '#706966' }}>Adresse : </span>
                      <b>{cagnotte.deliveryAddress || user?.adresse || 'À convenir avec le livreur'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#706966' }}>Contact livreur : </span>
                      <b>{cagnotte.deliveryPhone || user?.telephone || user?.phone || 'Numéro du profil'}</b>
                    </div>
                    {cagnotte.deliveryNote && (
                      <div>
                        <span style={{ color: '#706966' }}>Note : </span>
                        <span>{cagnotte.deliveryNote}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#706966' }}>Statut réception : </span>
                      <b style={{ color: isArticleReceived ? '#15803d' : '#b45309' }}>
                        {isArticleReceived ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Article remis & reçu
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Truck size={13} /> En attente de livraison
                          </span>
                        )}
                      </b>
                    </div>
                  </div>
                </div>
              )}


              {/* Bouton principal si Cagnotte : Effectuer un versement */}
              {!isCash && !isFinished && !isCancelled && (
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
                  {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
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
                {filteredTransactions.map((tx, idx) => {
                  const isRefund =
                    tx.type === 'annulation' ||
                    tx.type === 'remboursement' ||
                    tx.titre?.toLowerCase().includes('annulation') ||
                    tx.titre?.toLowerCase().includes('remboursement') ||
                    tx.titre?.toLowerCase().includes('renvoyé') ||
                    tx.reference?.startsWith('REM-') ||
                    tx.reference?.includes('ANNUL');

                  const isRefundExecuted =
                    isRefund &&
                    (isRefundCompleted ||
                      tx.statut === 'succes' ||
                      tx.statut === 'reussi' ||
                      tx.statut === 'Argent renvoyé');

                  const isReactivate = tx.type === 'reactivation' || tx.titre?.toLowerCase().includes('rétablie');

                  let displayTitle = 'Versement cagnotte (Cotisation)';
                  if (isRefund) {
                    displayTitle = isRefundExecuted
                      ? 'Argent renvoyé (Remboursement)'
                      : 'Remboursement programmé (sous 24H)';
                  } else if (isReactivate) {
                    displayTitle = 'Cagnotte rétablie';
                  } else if (
                    tx.titre &&
                    tx.titre !== 'Versement cagnotte' &&
                    !tx.titre.toLowerCase().includes('demande d’annulation')
                  ) {
                    displayTitle = tx.titre;
                  } else {
                    displayTitle = 'Versement cagnotte (Cotisation)';
                  }

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedReceipt(tx)}
                      style={{
                        background: isRefund ? '#fffcf9' : '#ffffff',
                        border: isRefund ? '1.5px solid #fed7aa' : '1px solid #ece5df',
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
                        e.currentTarget.style.borderColor = isRefund ? '#f97316' : '#d9d0c7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = isRefund ? '#fed7aa' : '#ece5df';
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: isRefund ? (isRefundExecuted ? '#ffedd5' : '#fef3c7') : isReactivate ? '#fef3c7' : '#f3ece6',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '18px',
                          color: isRefund ? (isRefundExecuted ? '#c2410c' : '#b45309') : isReactivate ? '#b45309' : '#4b443f',
                          flexShrink: 0,
                        }}
                      >
                        {isRefund ? (isRefundExecuted ? '↩️' : '⏳') : isReactivate ? '🔄' : '💳'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <b style={{ fontSize: '14.5px', color: isRefund ? (isRefundExecuted ? '#c2410c' : '#b45309') : '#1b1716' }}>
                            {displayTitle}
                          </b>
                          <small style={{ fontSize: '11px', color: '#8c8580' }}>{tx.reference || tx.id}</small>
                        </div>
                        <span style={{ fontSize: '12px', color: '#706966', display: 'block', marginTop: '2px' }}>
                          {isRefund
                            ? (isRefundExecuted ? 'Virement Mobile Money sortant (Remboursement)' : 'Remboursement Mobile Money programmé sous 24H')
                            : tx.methode}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9e958f' }}>{tx.date}</span>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <b style={{ fontSize: '15px', color: isRefund ? (isRefundExecuted ? '#c2410c' : '#b45309') : '#1b1716', display: 'block' }}>
                            {isRefund
                              ? `- ${formatFCFA(tx.montant)}`
                              : isReactivate
                              ? '—'
                              : `+ ${formatFCFA(tx.montant)}`}
                          </b>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isRefund ? (isRefundExecuted ? '#c2410c' : '#b45309') : isReactivate ? '#b45309' : '#15803d',
                              background: isRefund ? (isRefundExecuted ? '#ffedd5' : '#fef3c7') : isReactivate ? '#fef3c7' : '#dcfce7',
                              padding: '2px 8px',
                              borderRadius: '99px',
                              marginTop: '3px',
                            }}
                          >
                            {isRefund
                              ? (isRefundExecuted ? '↩ Argent renvoyé' : '⏳ En attente sous 24H')
                              : isReactivate
                              ? '✔ Rétablie'
                              : '✔ Validé'}
                          </span>
                        </div>
                        <span style={{ color: '#a09895', fontSize: '18px', fontWeight: 600 }}>›</span>
                      </div>
                    </div>
                  );
                })}

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

                {!isFinished && !isCancelled && (
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
        )}
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
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              padding: 'clamp(18px, 4vw, 26px)',
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
                      fullname: `${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.nom || 'Client',
                      first_name: user?.prenom || user?.nom || 'Client',
                      last_name: user?.nom || '',
                      email: (user?.email && !user.email.endsWith('@client.takapay.bj')) ? user.email : '',
                      phone: user?.telephone || user?.phone || '',
                      phoneNumber: user?.telephone || user?.phone || '',
                      reseau: depositProvider === 'Moov' ? 'MOOV' : 'MTN',
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
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              padding: 'clamp(18px, 4vw, 28px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
          {(() => {
            const isReceiptRefund =
              selectedReceipt.type === 'annulation' ||
              selectedReceipt.type === 'remboursement' ||
              selectedReceipt.titre?.toLowerCase().includes('annulation') ||
              selectedReceipt.titre?.toLowerCase().includes('remboursement') ||
              selectedReceipt.titre?.toLowerCase().includes('renvoyé') ||
              selectedReceipt.reference?.startsWith('REM-') ||
              selectedReceipt.reference?.includes('ANNUL');

            const isReceiptExecuted =
              isReceiptRefund &&
              (isRefundCompleted ||
                selectedReceipt.statut === 'succes' ||
                selectedReceipt.statut === 'reussi' ||
                selectedReceipt.statut === 'Argent renvoyé');

            return (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px dashed #ded6cd', paddingBottom: '16px' }}>
                  <span style={{ fontSize: '28px' }}>
                    {isReceiptRefund ? (isReceiptExecuted ? '↩️' : '⏳') : '🧾'}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 2px' }}>
                    {isReceiptRefund
                      ? (isReceiptExecuted ? 'Avis d’argent renvoyé (Remboursement)' : 'Demande de remboursement (sous 24H)')
                      : 'Reçu de versement Takapay'}
                  </h3>
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
                    [
                      'Statut :',
                      <span
                        key="s"
                        style={{
                          color: isReceiptRefund ? (isReceiptExecuted ? '#c2410c' : '#b45309') : '#15803d',
                          fontWeight: 700,
                        }}
                      >
                        {isReceiptRefund ? (isReceiptExecuted ? '↩ Argent renvoyé' : '⏳ En attente de virement') : '✔ Validé'}
                      </span>,
                    ],
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
                    <span>
                      {isReceiptRefund
                        ? (isReceiptExecuted ? 'Argent renvoyé au client :' : 'Argent à renvoyer sous 24H :')
                        : 'Montant versé (Cotisation) :'}
                    </span>
                    <b style={{ color: isReceiptRefund ? (isReceiptExecuted ? '#c2410c' : '#b45309') : '#dc2626' }}>
                      {isReceiptRefund
                        ? `- ${formatFCFA(selectedReceipt.montant)}`
                        : `+ ${formatFCFA(selectedReceipt.montant)}`}
                    </b>
                  </div>
                </div>
              </>
            );
          })()}

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
      {/* Modal 3 : Confirmation d'annulation de cagnotte */}
      {showCancelModal && (
        <div
          style={overlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) setShowCancelModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: 'clamp(20px, 4vw, 28px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  warning
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px' }}>
                  {isCash ? 'Annuler cette commande ?' : 'Annuler cette cagnotte ?'}
                </h3>
                <small style={{ color: '#706966', fontSize: '12px' }}>
                  {p.n || 'Article TakaPay'}
                </small>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#4b443f', lineHeight: 1.5, margin: '0 0 16px' }}>
              {isCash
                ? 'Êtes-vous sûr de vouloir annuler votre commande en paiement à la livraison ?'
                : 'Êtes-vous vraiment sûr de vouloir annuler votre cagnotte en cours ?'}
            </p>

            {isCash || (cagnotte.montantVerse || 0) === 0 ? (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: '#d97706', flexShrink: 0 }}>info</span>
                  <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.5 }}>
                    <b>Annulation sans frais :</b>
                    <br />
                    Comme aucun versement en ligne n'a été effectué pour cette commande, son annulation est <b>immédiate et totalement gratuite</b>. La livraison ne sera pas effectuée.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Avertissement CGU et pourcentage */}
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fef3c7',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: '#d97706', flexShrink: 0 }}>warning</span>
                    <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.5 }}>
                      <b>Conditions d’annulation :</b>
                      <br />
                      Une retenue forfaitaire de <b>5%</b> sera déduite du montant total cotisé au titre des frais de dossier et de gestion. Les <b>95% restants</b> vous seront renvoyés sous <b>24 heures</b> par virement Mobile Money.
                    </div>
                  </div>
                </div>

                {/* Détail du calcul financier */}
                <div
                  style={{
                    background: '#faf6f3',
                    border: '1px solid #eee7e0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#706966' }}>Montant total cotisé :</span>
                    <b style={{ color: '#1b1716' }}>{formatFCFA(cagnotte.montantVerse || 0)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#b91c1c' }}>Frais retenus (5%) :</span>
                    <b style={{ color: '#b91c1c' }}>
                      - {formatFCFA(Math.round(((cagnotte.montantVerse || 0) * 5) / 100))}
                    </b>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #e5ded7',
                      paddingTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#15803d' }}>Montant net remboursé (95%) :</span>
                    <b style={{ fontWeight: 800, color: '#15803d' }}>
                      {formatFCFA(
                        Math.max(
                          0,
                          (cagnotte.montantVerse || 0) -
                            Math.round(((cagnotte.montantVerse || 0) * 5) / 100)
                        )
                      )}
                    </b>
                  </div>
                </div>

                {/* Numéro pour le remboursement */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: '#1b1716' }}>
                    Numéro Mobile Money pour recevoir le remboursement *
                  </label>
                  <input
                    type="tel"
                    required
                    value={cancelPhone}
                    onChange={(e) => setCancelPhone(e.target.value)}
                    placeholder="Ex: 97000000 ou 61000000"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #ded6cd',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ color: '#706966', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '14px', color: '#16a34a' }}>schedule</span>
                    <span>Remboursement garanti dans un délai maximal de <b>24 heures</b>.</span>
                  </small>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #ded6cd',
                  background: '#ffffff',
                  color: '#1b1716',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                }}
              >
                {isCash ? 'Non, conserver' : 'Non, garder ma cagnotte'}
              </button>

              <button
                type="button"
                onClick={handleCancelCagnotte}
                disabled={isCancelling}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
                  opacity: isCancelling ? 0.7 : 1,
                }}
              >
                {isCancelling ? 'Traitement...' : isCash ? 'Oui, annuler la commande' : 'Oui, confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal 4 : Confirmation et Reconfirmation de réception d'article (Paiement Cash / Livraison) */}
      {showConfirmReceiptModal && (
        <div
          style={overlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isConfirmingReceipt) {
              setShowConfirmReceiptModal(false);
              setConfirmReceiptStep(1);
              setReceiptCheckbox(false);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: 'clamp(20px, 4vw, 28px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
              textAlign: 'center',
            }}
          >
            {/* Indicateur de progression (Étape 1 sur 2 / Étape 2 sur 2) */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '32px',
                  height: '6px',
                  borderRadius: '99px',
                  background: '#1b1716',
                }}
              />
              <span
                style={{
                  width: '32px',
                  height: '6px',
                  borderRadius: '99px',
                  background: confirmReceiptStep === 2 ? '#f59e0b' : '#e2e8f0',
                  transition: 'background .2s ease',
                }}
              />
            </div>

            {confirmReceiptStep === 1 ? (
              /* ÉTAPE 1 : PREMIÈRE CONFIRMATION */
              <>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    color: '#b45309',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Truck size={30} color="#b45309" />
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Étape 1 sur 2 · Confirmation de réception
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px', color: '#1b1716' }}>
                  Avez-vous bien reçu cet article ?
                </h3>

                <p style={{ fontSize: '14px', color: '#4b443f', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Vous confirmez que le livreur s'est présenté à votre adresse et vous a remis votre commande :
                </p>

                <div
                  style={{
                    background: '#faf6f3',
                    border: '1px solid #f0e8e0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <img
                      src={p.im || ''}
                      alt={p.n}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.opacity = '0'; }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '14.5px', color: '#1b1716', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.n}
                    </b>
                    <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 800 }}>
                      Montant : {formatFCFA(cagnotte.prixTotal)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmReceiptModal(false);
                      setConfirmReceiptStep(1);
                      setReceiptCheckbox(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '13px',
                      borderRadius: '12px',
                      border: '1px solid #ded6cd',
                      background: '#ffffff',
                      color: '#1b1716',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Non, pas encore
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmReceiptStep(2)}
                    style={{
                      flex: 1,
                      padding: '13px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#1b1716',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(27,23,22,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Oui, continuer</span>
                    <span style={{ fontSize: '15px', color: '#f59e0b' }}>→</span>
                  </button>
                </div>
              </>
            ) : (
              /* ÉTAPE 2 : RECONFIRMATION FINALE */
              <>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    color: '#b45309',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <CheckCircle2 size={32} color="#b45309" />
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Étape 2 sur 2 · Reconfirmation définitive
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px', color: '#1b1716' }}>
                  Êtes-vous absolument certain(e) ?
                </h3>

                <p style={{ fontSize: '13.5px', color: '#4b443f', lineHeight: 1.5, margin: '0 0 16px' }}>
                  Cette confirmation est <b>irréversible</b> et atteste de la bonne livraison de votre colis.
                </p>

                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '16px',
                    padding: '14px',
                    textAlign: 'left',
                    marginBottom: '18px',
                    fontSize: '13px',
                    color: '#92400e',
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <AlertTriangle size={18} color="#b45309" />
                    <b>Points à vérifier impérativement :</b>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Le produit a été examiné et est conforme à vos attentes.</li>
                    <li>La somme de <b>{formatFCFA(cagnotte.prixTotal)}</b> a bien été remise en espèces au livreur.</li>
                  </ul>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#1e293b',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={receiptCheckbox}
                    onChange={(e) => setReceiptCheckbox(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#1b1716', cursor: 'pointer' }}
                  />
                  <span>
                    Je certifie avoir reçu l'article conforme et avoir réglé la totalité en espèces au livreur.
                  </span>
                </label>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmReceiptStep(1)}
                    disabled={isConfirmingReceipt}
                    style={{
                      flex: 1,
                      padding: '13px',
                      borderRadius: '12px',
                      border: '1px solid #ded6cd',
                      background: '#ffffff',
                      color: '#1b1716',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: isConfirmingReceipt ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ‹ Retour
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmReceipt}
                    disabled={!receiptCheckbox || isConfirmingReceipt}
                    style={{
                      flex: 1.5,
                      padding: '13px',
                      borderRadius: '12px',
                      border: 'none',
                      background: !receiptCheckbox || isConfirmingReceipt ? '#ded6cd' : '#1b1716',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      cursor: !receiptCheckbox || isConfirmingReceipt ? 'not-allowed' : 'pointer',
                      boxShadow: receiptCheckbox ? '0 4px 14px rgba(27, 23, 22, 0.25)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all .15s ease',
                    }}
                  >
                    <CheckCircle2 size={18} color={receiptCheckbox ? '#f59e0b' : '#ffffff'} />
                    {isConfirmingReceipt ? 'Confirmation...' : 'Confirmer définitivement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}