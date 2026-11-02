import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminPromotionsView({ onShowToast }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire nouvelle promotion
  const [form, setForm] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 15 * 86400000);
    return {
      pourcentage_promo: 15,
      date_debut: now.toISOString().slice(0, 16),
      date_fin: future.toISOString().slice(0, 16),
      statut: 'actif',
    };
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    adminService.getPromotions().then((data) => {
      if (isMounted) {
        setPromotions(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    const errs = {};
    const pct = Number(form.pourcentage_promo);
    if (!form.pourcentage_promo || isNaN(pct) || pct < 1 || pct > 100) {
      errs.pourcentage_promo = 'Le pourcentage doit être un nombre compris entre 1 et 100 %.';
    }
    if (!form.date_debut) {
      errs.date_debut = 'La date de début est requise.';
    }
    if (!form.date_fin) {
      errs.date_fin = 'La date de fin est requise.';
    } else if (form.date_debut && new Date(form.date_fin) <= new Date(form.date_debut)) {
      errs.date_fin = 'La date de fin doit être postérieure à la date de début.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      const res = await adminService.createPromotion(form);
      if (res.success) {
        setPromotions((prev) => [res.data, ...prev]);
        setShowModal(false);
        onShowToast(`Promotion -${form.pourcentage_promo}% créée avec succès`);
      }
    } catch {
      alert('Erreur lors de la création de la promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (confirm('Voulez-vous vraiment supprimer cette promotion ?')) {
      await adminService.deletePromotion(promoId);
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      onShowToast('Promotion supprimée');
    }
  };

  const computeStatus = (promo) => {
    const now = new Date();
    const debut = new Date(promo.date_debut);
    const fin = new Date(promo.date_fin);

    if (promo.statut === 'inactif') return { label: 'Inactif', cls: 's3' };
    if (now < debut) return { label: 'À venir', cls: 's2' };
    if (now > fin) return { label: 'Expirée', cls: 's3' };
    return { label: 'En cours', cls: 's1' };
  };

  const activeCount = promotions.filter((p) => computeStatus(p).label === 'En cours').length;

  return (
    <div>
      {/* En-tête de section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="admin-header-title">Campagnes & Promotions</h1>
          <p className="admin-header-sub">
            Définissez les taux de remise, les périodes d’application et suivez les produits concernés
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <AdminIcon name="tag" size={18} />
          <span>+ Nouvelle Promotion</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="admin-kpi-grid" style={{ marginTop: 0 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Promotions actives</span>
            <i><AdminIcon name="tag" size={16} /></i>
          </div>
          <b>{activeCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total des campagnes</span>
            <i><AdminIcon name="cal" size={16} /></i>
          </div>
          <b>{promotions.length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Remise maximale</span>
            <i><AdminIcon name="box" size={16} /></i>
          </div>
          <b>
            {promotions.length > 0
              ? `${Math.max(...promotions.map((p) => parseFloat(p.pourcentage_promo) || 0))}%`
              : '0%'}
          </b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Articles remisés</span>
            <i><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b>
            {promotions.reduce((acc, p) => acc + (p.produits_count || 1), 0)}
          </b>
        </div>
      </div>

      {/* Tableau des promotions */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des promotions...</p>
        ) : promotions.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucune promotion définie.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Taux de remise</th>
                  <th>Date de début</th>
                  <th>Date de fin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => {
                  const st = computeStatus(p);
                  const dDebut = p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immédiat';
                  const dFin = p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indéterminée';

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>Promo #{p.id}</strong>
                        <span className="admin-sub-text">Applicable sur les cagnottes & paramètres produits</span>
                      </td>
                      <td>
                        <span
                          className="admin-badge s2"
                          style={{ fontSize: '14px', fontWeight: 800, padding: '4px 12px' }}
                        >
                          -{p.pourcentage_promo}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{dDebut}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{dFin}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(p.id)}
                          className="admin-btn-no"
                          style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title="Supprimer la promotion"
                        >
                          <AdminIcon name="trash" size={14} />
                          <span style={{ fontSize: '12px' }}>Supprimer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création de promotion */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            backdropFilter: 'blur(5px)',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--line)',
              borderRadius: '24px',
              maxWidth: '780px',
              width: '100%',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  Nouvelle Promotion
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '15px', color: 'var(--mut)' }}>
                  Configurez la remise en pourcentage et la période de validité
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFormErrors({});
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--mut)',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} noValidate>
              <div className="admin-field" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Pourcentage de réduction (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Ex: 15"
                  value={form.pourcentage_promo}
                  onChange={(e) => {
                    setForm({ ...form, pourcentage_promo: e.target.value });
                    if (formErrors.pourcentage_promo) setFormErrors((prev) => ({ ...prev, pourcentage_promo: null }));
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: formErrors.pourcentage_promo ? '2px solid #dc2626' : '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                    display: 'block',
                  }}
                />
                {formErrors.pourcentage_promo && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {formErrors.pourcentage_promo}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div className="admin-field" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Date de début *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.date_debut}
                    onChange={(e) => {
                      setForm({ ...form, date_debut: e.target.value });
                      if (formErrors.date_debut) setFormErrors((prev) => ({ ...prev, date_debut: null }));
                    }}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'block',
                      padding: '13px 16px',
                      borderRadius: '12px',
                      border: formErrors.date_debut ? '2px solid #dc2626' : '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                  {formErrors.date_debut && (
                    <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ {formErrors.date_debut}
                    </span>
                  )}
                </div>

                <div className="admin-field" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Date de fin *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.date_fin}
                    onChange={(e) => {
                      setForm({ ...form, date_fin: e.target.value });
                      if (formErrors.date_fin) setFormErrors((prev) => ({ ...prev, date_fin: null }));
                    }}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'block',
                      padding: '13px 16px',
                      borderRadius: '12px',
                      border: formErrors.date_fin ? '2px solid #dc2626' : '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                  {formErrors.date_fin && (
                    <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ {formErrors.date_fin}
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-field" style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Statut de la promotion
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    display: 'block',
                    padding: '13px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                  }}
                >
                  <option value="actif">Actif (immédiatement disponible)</option>
                  <option value="inactif">Inactif (brouillon)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '30px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormErrors({});
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--line)',
                    background: 'none',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="admin-btn"
                  disabled={submitting}
                  style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 700 }}
                >
                  {submitting ? 'Enregistrement...' : 'Créer la promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
