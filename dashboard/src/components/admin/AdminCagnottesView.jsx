import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

const detectNetwork = (phone) => {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  let local = clean;
  if (local.startsWith('00229')) local = local.slice(5);
  else if (local.startsWith('229')) local = local.slice(3);
  if (local.startsWith('01') && local.length === 10) local = local.slice(2);
  const prefix = local.slice(0, 2);
  if (['51', '52', '53', '54', '56', '57', '59', '61', '62', '66', '67', '69', '90', '91', '96', '97'].includes(prefix)) {
    return 'MTN';
  }
  if (['55', '60', '63', '64', '65', '68', '94', '95', '98', '99'].includes(prefix)) {
    return 'MOOV';
  }
  if (['40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '92', '93'].includes(prefix)) {
    return 'CELTIIS';
  }
  return 'MTN';
};

export default function AdminCagnottesView() {
  const [cagnottes, setCagnottes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  // Remboursement FeexPay
  const [selectedCagnotte, setSelectedCagnotte] = useState(null);
  const [refundPhone, setRefundPhone] = useState('');
  const [refundNetwork, setRefundNetwork] = useState('MTN');
  const [refundMode, setRefundMode] = useState('feexpay_api');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [refundSuccess, setRefundSuccess] = useState(null);

  const openRefundModal = (c) => {
    const phone = c.telephone_remboursement || c.client_tel || c.telephone_livraison || c.utilisateur?.telephone || '';
    setSelectedCagnotte(c);
    setRefundPhone(phone);
    setRefundNetwork(detectNetwork(phone));
    setRefundMode('feexpay_api');
    setRefundError(null);
    setRefundSuccess(null);
  };

  const closeRefundModal = () => {
    if (isRefunding) return;
    setSelectedCagnotte(null);
    setRefundError(null);
    setRefundSuccess(null);
  };

  const handleExecRefund = async () => {
    if (!selectedCagnotte) return;
    setIsRefunding(true);
    setRefundError(null);
    setRefundSuccess(null);
    try {
      const res = await adminService.rembourserCagnotteFeexpay(selectedCagnotte.id, {
        mode: refundMode,
        network: refundNetwork,
        telephone: refundPhone,
      });
      setRefundSuccess(res.message || 'Remboursement validé avec succès !');
      setCagnottes((prev) =>
        prev.map((item) =>
          item.id === selectedCagnotte.id ? { ...item, statut: 'annulee' } : item
        )
      );
      setTimeout(() => {
        closeRefundModal();
      }, 1500);
    } catch (err) {
      setRefundError(err.message || 'Échec lors du remboursement FeexPay.');
    } finally {
      setIsRefunding(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    adminService.getCagnottes().then((data) => {
      if (isMounted) {
        setCagnottes(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
    } catch {
      return dateStr;
    }
  };

  const filtered = cagnottes.filter((c) => {
    const s = search.toLowerCase();
    const clientNom = c.client_nom || (c.utilisateur ? `${c.utilisateur.nom || ''} ${c.utilisateur.prenom || ''}`.trim() : '');
    const clientTel = c.telephone_remboursement || c.telephone_livraison || c.utilisateur?.telephone || c.client_tel || '';
    const produitNom = c.produit?.nom || c.produit_nom || '';
    const code = c.code || `CG-${c.id}`;

    const matchSearch =
      code.toLowerCase().includes(s) ||
      clientNom.toLowerCase().includes(s) ||
      clientTel.toLowerCase().includes(s) ||
      produitNom.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'tous' || 
      c.statut === statusFilter || 
      (statusFilter === 'annulee' && (c.statut === 'annulee' || c.statut === 'cancelled'));
    return matchSearch && matchStatus;
  });

  const totalMontant = cagnottes.reduce((acc, c) => acc + (Number(c.montant_verse) || 0), 0);
  const activeCount = cagnottes.filter((c) => c.statut === 'en_cours').length;
  const completedCount = cagnottes.filter((c) => c.statut === 'terminee').length;
  const cancelRequestedCount = cagnottes.filter((c) => c.statut === 'annulation_demandee').length;

  const selClientNom = selectedCagnotte
    ? (selectedCagnotte.client_nom || (selectedCagnotte.utilisateur ? `${selectedCagnotte.utilisateur.prenom || ''} ${selectedCagnotte.utilisateur.nom || ''}`.trim() : 'Client Takapay'))
    : '';
  const selClientTel = selectedCagnotte
    ? (selectedCagnotte.telephone_remboursement || selectedCagnotte.client_tel || selectedCagnotte.telephone_livraison || selectedCagnotte.utilisateur?.telephone || '')
    : '';

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Évolution des Cagnottes</h1>
        <p className="admin-header-sub">
          Suivez la progression des épargnes clients, les montants versés et les échéanciers
        </p>
      </div>

      {/* Cartes récapitulatives */}
      <div className="admin-kpi-grid" style={{ marginTop: 0 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total cagnottes</span>
            <i><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b>{cagnottes.length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>En cours de cotisation</span>
            <i><AdminIcon name="cal" size={16} /></i>
          </div>
          <b>{activeCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Cagnottes atteintes / Prêtes</span>
            <i><AdminIcon name="check" size={16} /></i>
          </div>
          <b>{completedCount}</b>
        </div>
        <div className="admin-kpi-card" style={{ borderColor: cancelRequestedCount > 0 ? '#fca5a5' : 'var(--line)', background: cancelRequestedCount > 0 ? '#fff1f2' : 'var(--surface)' }}>
          <div className="admin-kpi-header">
            <span style={{ color: cancelRequestedCount > 0 ? '#dc2626' : 'inherit' }}>Annulations à rembourser</span>
            <i style={{ color: '#dc2626' }}><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b style={{ color: cancelRequestedCount > 0 ? '#dc2626' : 'inherit' }}>{cancelRequestedCount}</b>
        </div>
      </div>

      {/* Filtres */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par client, article, code, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: '13px',
            font: 'inherit',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: '13px',
            font: 'inherit',
          }}
        >
          <option value="tous">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulation_demandee">Annulation demandée (À rembourser)</option>
          <option value="annulee">Annulée / Remboursée</option>
        </select>
      </div>

      {/* Tableau des cagnottes */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des cagnottes...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucune cagnotte correspondante.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cagnotte</th>
                  <th>Client</th>
                  <th>Article ciblé</th>
                  <th>Montant cotisé</th>
                  <th>Progression</th>
                  <th>Moyen Paiement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const verse = Number(c.montant_verse || 0);
                  const prixUnitaire = Number(c.prix_unitaire || 0);
                  const pct = c.progression !== undefined
                    ? c.progression
                    : Math.min(100, Math.round((verse / (prixUnitaire || 1)) * 100));

                  const clientNom = c.client_nom || (c.utilisateur ? `${c.utilisateur.nom || ''} ${c.utilisateur.prenom || ''}`.trim() : 'Client Takapay');
                  const clientTel = c.telephone_remboursement || c.telephone_livraison || c.utilisateur?.telephone || c.client_tel || '+229 -- -- -- --';
                  const prodNom = c.produit?.nom || c.produit_nom || 'Article';

                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.code || `CG-${c.id}`}</strong>
                        <span className="admin-sub-text">Lancée le {formatDate(c.created_at || c.date_creation)}</span>
                      </td>
                      <td>
                        <strong>{clientNom}</strong>
                        <span className="admin-sub-text">{clientTel}</span>
                        {c.adresse_livraison && (
                          <span className="admin-sub-text" style={{ fontSize: '11px', color: '#0284c7' }}>
                            📍 {c.adresse_livraison}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{prodNom}</span>
                        <span className="admin-sub-text">Objectif: {prixUnitaire.toLocaleString('fr-FR')} F</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--r)' }}>
                          {verse.toLocaleString('fr-FR')} F
                        </strong>
                        <span className="admin-sub-text">
                          Reste: {Math.max(0, prixUnitaire - verse).toLocaleString('fr-FR')} F
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '32px' }}>{pct}%</span>
                          <span className="admin-progress-bar" style={{ width: '80px' }}>
                            <i style={{ width: `${pct}%`, background: pct >= 100 ? '#15803d' : 'var(--r)' }} />
                          </span>
                        </div>
                        <span className="admin-sub-text">
                          {c.echeances_payees !== undefined ? `${c.echeances_payees} / ${c.echeances_total} échéances` : 'Paiement libre'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>
                          {c.moyen_paiement || 'Mobile Money'}
                        </span>
                      </td>
                      <td>
                        {c.statut === 'annulation_demandee' ? (
                          <div>
                            <span className="admin-badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 800 }}>
                              Annulation demandée
                            </span>
                            {c.montant_remboursement && (
                              <span className="admin-sub-text" style={{ color: '#b91c1c', fontWeight: 700, marginTop: '2px' }}>
                                Net à rembourser : {Number(c.montant_remboursement).toLocaleString('fr-FR')} F
                              </span>
                            )}
                            {c.telephone_remboursement && (
                              <span className="admin-sub-text" style={{ color: '#1b1716' }}>
                                Mobile : {c.telephone_remboursement}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openRefundModal(c)}
                              style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                              }}
                            >
                              <AdminIcon name="wallet" size={13} />
                              Valider virement FeexPay
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className={`admin-badge ${c.statut === 'terminee' ? 's1' : c.statut === 'en_cours' ? 's2' : 's3'}`}>
                              {c.statut === 'terminee' ? 'Terminée' : c.statut === 'en_cours' ? 'En cours' : 'Annulée'}
                            </span>
                            {c.statut === 'annulee' && c.montant_remboursement && (
                              <button
                                type="button"
                                onClick={() => openRefundModal(c)}
                                style={{
                                  marginTop: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'transparent',
                                  color: 'var(--mut)',
                                  border: '1px solid var(--line)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <AdminIcon name="swap" size={12} />
                                Relancer virement FeexPay
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Remboursement FeexPay */}
      {selectedCagnotte && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={closeRefundModal}
        >
          <div
            style={{
              background: 'var(--card, #ffffff)',
              color: 'var(--ink, #1c1b22)',
              borderRadius: '16px',
              border: '1.5px solid var(--line, #ebe6dc)',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'flex', padding: '8px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                  <AdminIcon name="wallet" size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink, #1c1b22)' }}>
                  Valider le Remboursement FeexPay
                </h3>
              </div>
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={isRefunding}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--mut, #6b6a75)',
                  padding: '4px',
                }}
              >
                <AdminIcon name="x" size={18} />
              </button>
            </div>

            {/* Récapitulatif Client & Financier */}
            <div
              style={{
                background: 'var(--bg, #fffdf8)',
                border: '1.5px solid var(--line, #ebe6dc)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              {/* Client & Numéro bien visibles */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: 'var(--mut, #6b6a75)', fontWeight: 600 }}>Client :</span>
                <strong style={{ color: 'var(--ink, #1c1b22)', fontSize: '14px' }}>{selClientNom}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: 'var(--mut, #6b6a75)', fontWeight: 600 }}>Numéro du client :</span>
                <span style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.12)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px' }}>
                  {selClientTel || 'Non renseigné'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: 'var(--mut, #6b6a75)', fontWeight: 600 }}>Cagnotte :</span>
                <strong style={{ color: 'var(--ink, #1c1b22)' }}>{selectedCagnotte.code || `CG-${selectedCagnotte.id}`} — {selectedCagnotte.produit_nom || selectedCagnotte.produit?.nom || 'Article'}</strong>
              </div>

              <div style={{ height: '1px', background: 'var(--line, #ebe6dc)', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--mut, #6b6a75)' }}>Montant total cotisé :</span>
                <strong style={{ color: 'var(--ink, #1c1b22)' }}>{(Number(selectedCagnotte.montant_verse) || 0).toLocaleString('fr-FR')} FCFA</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--mut, #6b6a75)' }}>Frais TakaPay conservés (5%) :</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                  + {(Number(selectedCagnotte.frais_annulation) || Math.round((Number(selectedCagnotte.montant_verse) || 0) * 0.05)).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div style={{ height: '1px', background: 'var(--line, #ebe6dc)', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink, #1c1b22)' }}>Net à virer au client (95%) :</span>
                <strong style={{ fontSize: '20px', color: '#dc2626', fontWeight: 800 }}>
                  {(Number(selectedCagnotte.montant_remboursement) || Math.round((Number(selectedCagnotte.montant_verse) || 0) * 0.95)).toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>

            {/* Formulaire de virement */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink, #1c1b22)', marginBottom: '6px' }}>
                  Numéro Mobile Money pour le transfert :
                </label>
                <input
                  type="text"
                  value={refundPhone}
                  onChange={(e) => {
                    setRefundPhone(e.target.value);
                    setRefundNetwork(detectNetwork(e.target.value));
                  }}
                  placeholder="Ex: +229 01 61 74 14 02"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line, #ebe6dc)',
                    background: 'var(--bg, #fffdf8)',
                    color: 'var(--ink, #1c1b22)',
                    fontSize: '15px',
                    fontWeight: 700,
                    font: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--mut, #6b6a75)', marginTop: '4px' }}>
                  Numéro pré-rempli avec les coordonnées du client ({selClientTel || 'automatique'}). Modifiez-le si nécessaire.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink, #1c1b22)', marginBottom: '6px' }}>
                  Opérateur Mobile Money (Bénin) :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['MTN', 'MOOV', 'CELTIIS'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setRefundNetwork(net)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: refundNetwork === net ? '2px solid #dc2626' : '1.5px solid var(--line, #ebe6dc)',
                        background: refundNetwork === net ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg, #fffdf8)',
                        color: refundNetwork === net ? '#dc2626' : 'var(--ink, #1c1b22)',
                        fontWeight: refundNetwork === net ? 800 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink, #1c1b22)', marginBottom: '6px' }}>
                  Mode d'exécution :
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: refundMode === 'feexpay_api' ? '1.5px solid #dc2626' : '1px solid var(--line, #ebe6dc)',
                      background: refundMode === 'feexpay_api' ? 'rgba(220, 38, 38, 0.05)' : 'var(--bg, #fffdf8)',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundMode"
                      value="feexpay_api"
                      checked={refundMode === 'feexpay_api'}
                      onChange={() => setRefundMode('feexpay_api')}
                      style={{ marginTop: '2px', accentColor: '#dc2626' }}
                    />
                    <div>
                      <strong style={{ color: 'var(--ink, #1c1b22)', fontSize: '13px' }}>API FeexPay Payout (Automatique)</strong>
                      <div style={{ fontSize: '11px', color: 'var(--mut, #6b6a75)', marginTop: '2px' }}>
                        Déclenche le virement immédiat depuis votre solde FeexPay vers le compte Mobile Money du client.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: refundMode === 'manuel' ? '1.5px solid #dc2626' : '1px solid var(--line, #ebe6dc)',
                      background: refundMode === 'manuel' ? 'rgba(220, 38, 38, 0.05)' : 'var(--bg, #fffdf8)',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundMode"
                      value="manuel"
                      checked={refundMode === 'manuel'}
                      onChange={() => setRefundMode('manuel')}
                      style={{ marginTop: '2px', accentColor: '#dc2626' }}
                    />
                    <div>
                      <strong style={{ color: 'var(--ink, #1c1b22)', fontSize: '13px' }}>Virement manuel déjà effectué</strong>
                      <div style={{ fontSize: '11px', color: 'var(--mut, #6b6a75)', marginTop: '2px' }}>
                        Si vous avez déjà envoyé les fonds directement depuis le portail FeexPay ou hors ligne.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notifications retour */}
            {refundSuccess && (
              <div style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                {refundSuccess}
              </div>
            )}
            {refundError && (
              <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                {refundError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={isRefunding}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line, #ebe6dc)',
                  background: 'var(--bg, #fffdf8)',
                  color: 'var(--ink, #1c1b22)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isRefunding ? 'not-allowed' : 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecRefund}
                disabled={isRefunding || !refundPhone}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isRefunding ? '#9ca3af' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isRefunding || !refundPhone ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isRefunding ? 'Traitement en cours...' : refundMode === 'feexpay_api' ? 'Confirmer et Envoyer le Virement' : 'Confirmer le remboursement manuel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
