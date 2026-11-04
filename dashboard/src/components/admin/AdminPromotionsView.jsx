import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';
import { resolveImageUrl } from '../../data/clientStore';

const buildDefaultForm = () => {
  const now = new Date();
  const future = new Date(now.getTime() + 15 * 86400000);
  return {
    titre: '',
    description: '',
    pourcentage_promo: 15,
    produit_id: '',
    image_popup: '',
    afficher_popup: true,
    date_debut: now.toISOString().slice(0, 16),
    date_fin: future.toISOString().slice(0, 16),
    statut: 'actif',
  };
};

export default function AdminPromotionsView({ onShowToast }) {
  const [promotions, setPromotions] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [form, setForm] = useState(buildDefaultForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminService.getPromotions(),
      adminService.getAdminProduits().catch(() => []),
    ]).then(([promoData, prodData]) => {
      if (isMounted) {
        setPromotions(Array.isArray(promoData) ? promoData : []);
        setProduits(Array.isArray(prodData) ? prodData : []);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingPromoId(null);
    setForm(buildDefaultForm());
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromoId(promo.id);
    setForm({
      titre: promo.titre || '',
      description: promo.description || '',
      pourcentage_promo: promo.pourcentage_promo ?? 0,
      produit_id: promo.produit_id ? String(promo.produit_id) : '',
      image_popup: promo.image_popup_url || promo.image_popup || '',
      afficher_popup: Boolean(promo.afficher_popup),
      date_debut: promo.date_debut ? new Date(promo.date_debut).toISOString().slice(0, 16) : '',
      date_fin: promo.date_fin ? new Date(promo.date_fin).toISOString().slice(0, 16) : '',
      statut: promo.statut || 'actif',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handlePopupImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        image_popup: ev.target.result,
        afficher_popup: true,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    const errs = {};
    const pct = Number(form.pourcentage_promo);
    if (form.pourcentage_promo === '' || isNaN(pct) || pct < 0 || pct > 100) {
      errs.pourcentage_promo = 'Le pourcentage doit être compris entre 0 et 100 %.';
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
      const payload = {
        titre: form.titre.trim() || null,
        description: form.description.trim() || null,
        pourcentage_promo: pct,
        produit_id: form.produit_id ? Number(form.produit_id) : null,
        afficher_popup: Boolean(form.afficher_popup),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        statut: form.statut,
      };

      if (form.image_popup && form.image_popup.startsWith('data:')) {
        payload.image_popup = form.image_popup;
      } else if (!form.image_popup) {
        payload.image_popup = null;
      }

      if (editingPromoId) {
        const res = await adminService.updatePromotion(editingPromoId, payload);
        if (res.success) {
          setPromotions((prev) => prev.map((p) => (p.id === editingPromoId ? res.data : p)));
          setShowModal(false);
          if (onShowToast) onShowToast('Promotion mise à jour avec succès');
        }
      } else {
        const res = await adminService.createPromotion(payload);
        if (res.success) {
          setPromotions((prev) => [res.data, ...prev]);
          setShowModal(false);
          if (onShowToast) onShowToast('Promotion créée avec succès');
        }
      }
      window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
    } catch (err) {
      setFormErrors({ global: err.message || "Erreur lors de l'enregistrement de la promotion." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette promotion ?')) {
      await adminService.deletePromotion(promoId);
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      if (onShowToast) onShowToast('Promotion supprimée');
      window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
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
  const popupActiveCount = promotions.filter((p) => computeStatus(p).label === 'En cours' && p.afficher_popup && (p.image_popup_url || p.image_popup)).length;

  const lastPage = Math.max(1, Math.ceil(promotions.length / perPage));
  const currentPage = Math.min(page, lastPage);
  const paginated = promotions.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div>
      {/* En-tête de section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="admin-header-title">Campagnes, Promotions & Popups</h1>
          <p className="admin-header-sub">
            Gérez vos remises ainsi que les visuels de Popups promotionnels (liés ou non à un produit)
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={handleOpenCreate}
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <AdminIcon name="tag" size={18} />
          <span>+ Nouvelle Promotion / Popup</span>
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
            <span>Popups actifs</span>
            <i><AdminIcon name="image" size={16} /></i>
          </div>
          <b>{popupActiveCount}</b>
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
            <span>Total des campagnes</span>
            <i><AdminIcon name="cal" size={16} /></i>
          </div>
          <b>{promotions.length}</b>
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
                  <th>Campagne / Visuel Popup</th>
                  <th>Cible</th>
                  <th>Remise</th>
                  <th>Popup Accueil</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const st = computeStatus(p);
                  const dDebut = p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immédiat';
                  const dFin = p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indéterminée';
                  const popupImg = p.image_popup_url || (p.image_popup ? resolveImageUrl(p.image_popup) : null);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenEdit(p)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquer pour modifier cette promotion / popup"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {popupImg ? (
                            <img
                              src={popupImg}
                              alt={p.titre || `Promo #${p.id}`}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                objectFit: 'cover',
                                border: '1px solid var(--line)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: 'var(--soft)',
                                color: 'var(--r)',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <AdminIcon name="tag" size={18} />
                            </div>
                          )}
                          <div>
                            <strong>{p.titre || `Promo #${p.id}`}</strong>
                            <span className="admin-sub-text">
                              {p.description ? p.description.slice(0, 55) : 'Campagne promotionnelle'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                          {p.produit?.nom ? `📦 ${p.produit.nom}` : '🌐 Campagne générale'}
                        </span>
                      </td>
                      <td>
                        {Number(p.pourcentage_promo) > 0 ? (
                          <span
                            className="admin-badge s2"
                            style={{ fontSize: '14px', fontWeight: 800, padding: '4px 12px' }}
                          >
                            -{Number(p.pourcentage_promo)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Popup seul</span>
                        )}
                      </td>
                      <td>
                        {p.afficher_popup && popupImg ? (
                          <span className="admin-badge s1">Popup Actif</span>
                        ) : (
                          <span className="admin-badge">Non affiché</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{dDebut} &rarr; {dFin}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            style={{
                              border: '1px solid var(--line)',
                              background: 'var(--card)',
                              color: 'var(--ink)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(p.id)}
                            className="admin-btn-no"
                            style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Supprimer la promotion"
                          >
                            <AdminIcon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barre de pagination */}
        {!loading && promotions.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              marginTop: '20px',
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--mut)' }}>
              Affichage de <strong>{paginated.length}</strong> sur <strong>{promotions.length}</strong> promotion{promotions.length > 1 ? 's' : ''} (Page {currentPage} sur {lastPage})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: currentPage <= 1 ? 'var(--bg)' : 'var(--card)',
                  color: currentPage <= 1 ? 'var(--mut)' : 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: currentPage <= 1 ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                &larr; Précédent
              </button>

              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'var(--soft)',
                  color: 'var(--r)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {currentPage} / {lastPage}
              </span>

              <button
                type="button"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((prev) => Math.min(prev + 1, lastPage))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: currentPage >= lastPage ? 'var(--bg)' : 'var(--card)',
                  color: currentPage >= lastPage ? 'var(--mut)' : 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: currentPage >= lastPage ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: currentPage >= lastPage ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                Suivant &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal création / modification de promotion & popup */}
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
              maxWidth: '720px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  {editingPromoId ? 'Modifier la Promotion / Popup' : 'Nouvelle Promotion / Popup'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--mut)' }}>
                  Personnalisez le visuel du Popup d'accueil et reliez-le (ou non) à un produit
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
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: 'var(--mut)',
                  padding: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {formErrors.global && (
              <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
                {formErrors.global}
              </div>
            )}

            <form onSubmit={handleSavePromo} noValidate>
              {/* Visuel du Popup */}
              <div
                style={{
                  marginBottom: '18px',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1.5px dashed var(--line)',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                    Image du Popup promotionnel (affiche envoyée au client)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={form.afficher_popup}
                      onChange={(e) => setForm({ ...form, afficher_popup: e.target.checked })}
                    />
                    Afficher en Popup à l'ouverture du site
                  </label>
                </div>

                {form.image_popup ? (
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <img
                      src={form.image_popup.startsWith('data:') || form.image_popup.startsWith('http') ? form.image_popup : resolveImageUrl(form.image_popup)}
                      alt="Aperçu Popup"
                      style={{
                        maxHeight: '200px',
                        maxWidth: '100%',
                        borderRadius: '12px',
                        objectFit: 'contain',
                        border: '1px solid var(--line)',
                        display: 'block',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <label
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remplacer l'image
                        <input type="file" accept="image/*" onChange={handlePopupImageChange} style={{ display: 'none' }} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_popup: '', afficher_popup: false })}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Retirer l'image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '22px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: 'var(--mut)',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    <AdminIcon name="image" size={26} />
                    <span style={{ marginTop: '6px', fontWeight: 600, color: 'var(--ink)' }}>
                      Cliquez pour choisir une image d'affiche pour le Popup
                    </span>
                    <span style={{ fontSize: '12px', marginTop: '2px' }}>PNG, JPG ou WEBP</span>
                    <input type="file" accept="image/*" onChange={handlePopupImageChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Titre et Produit lié (optionnels) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                    Titre du Popup / Campagne (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Grande Promo Tabaski"
                    value={form.titre}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                    Lier à un produit (optionnel)
                  </label>
                  <select
                    value={form.produit_id}
                    onChange={(e) => setForm({ ...form, produit_id: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">🌐 Aucun produit spécifique (Campagne générale)</option>
                    {produits.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        📦 {prod.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description optionnelle */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Message / Description du Popup (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Texte affiché sous l'image du popup..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Taux de réduction & Statut */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                    Pourcentage de réduction (%) — mettre 0 si affiche seule
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.pourcentage_promo}
                    onChange={(e) => {
                      setForm({ ...form, pourcentage_promo: e.target.value });
                      if (formErrors.pourcentage_promo) setFormErrors((prev) => ({ ...prev, pourcentage_promo: null }));
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: formErrors.pourcentage_promo ? '2px solid #dc2626' : '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                  {formErrors.pourcentage_promo && (
                    <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                      ⚠ {formErrors.pourcentage_promo}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                    Statut de la campagne
                  </label>
                  <select
                    value={form.statut}
                    onChange={(e) => setForm({ ...form, statut: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="actif">Actif (immédiatement disponible)</option>
                    <option value="inactif">Inactif (brouillon)</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
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
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: formErrors.date_debut ? '2px solid #dc2626' : '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                    }}
                  />
                  {formErrors.date_debut && (
                    <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                      ⚠ {formErrors.date_debut}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
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
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: formErrors.date_fin ? '2px solid #dc2626' : '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                    }}
                  />
                  {formErrors.date_fin && (
                    <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                      ⚠ {formErrors.date_fin}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormErrors({});
                  }}
                  style={{
                    padding: '11px 22px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'none',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="admin-btn"
                  disabled={submitting}
                  style={{ padding: '11px 24px', fontSize: '14px', fontWeight: 700 }}
                >
                  {submitting ? 'Enregistrement...' : (editingPromoId ? 'Enregistrer les modifications' : 'Créer la promotion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
