import { useState, useEffect, useMemo } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';
import { resolveImageUrl, formatFCFA } from '../../data/clientStore';

const buildDefaultForm = (mode = 'promotion', defaultProductId = '') => {
  const now = new Date();
  const future = new Date(now.getTime() + 15 * 86400000);
  return {
    titre: '',
    description: '',
    pourcentage_promo: mode === 'promotion' ? 15 : 0,
    produit_id: mode === 'promotion' ? defaultProductId : '',
    image_popup: '',
    afficher_popup: mode === 'popup',
    date_debut: now.toISOString().slice(0, 16),
    date_fin: future.toISOString().slice(0, 16),
    statut: 'actif',
  };
};

export default function AdminPromotionsView({ onShowToast }) {
  const [promotions, setPromotions] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('promotions'); // 'promotions' | 'popups'
  const [modalMode, setModalMode] = useState('promotion'); // 'promotion' | 'popup'
  const [showModal, setShowModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [form, setForm] = useState(() => buildDefaultForm('promotion'));
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

  // Séparation nette des promotions produits et des popups d'accueil
  const { productPromos, popupPromos } = useMemo(() => {
    const prodList = [];
    const popupList = [];
    promotions.forEach((p) => {
      const isPopup = Boolean(p.afficher_popup || (p.image_popup && !p.produit_id));
      if (isPopup) {
        popupList.push(p);
      } else {
        prodList.push(p);
      }
    });
    return { productPromos: prodList, popupPromos: popupList };
  }, [promotions]);

  const currentItems = activeTab === 'popups' ? popupPromos : productPromos;

  const handleOpenCreate = (mode) => {
    const targetMode = mode || (activeTab === 'popups' ? 'popup' : 'promotion');
    setModalMode(targetMode);
    setEditingPromoId(null);
    const defaultProdId = produits.length > 0 ? String(produits[0].id) : '';
    setForm(buildDefaultForm(targetMode, defaultProdId));
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromoId(promo.id);
    const isPopup = Boolean(promo.afficher_popup || (promo.image_popup && !promo.produit_id));
    setModalMode(isPopup ? 'popup' : 'promotion');
    setForm({
      titre: promo.titre || '',
      description: promo.description || '',
      pourcentage_promo: promo.pourcentage_promo ?? (isPopup ? 0 : 15),
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
      if (formErrors.image_popup) {
        setFormErrors((prev) => ({ ...prev, image_popup: null }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    const errs = {};

    if (modalMode === 'promotion') {
      if (!form.produit_id) {
        errs.produit_id = 'Veuillez sélectionner le produit à mettre en promotion.';
      }
      const pct = Number(form.pourcentage_promo);
      if (form.pourcentage_promo === '' || isNaN(pct) || pct <= 0 || pct > 100) {
        errs.pourcentage_promo = 'Le pourcentage de remise doit être compris entre 1 et 100 %.';
      }
    } else {
      // Mode Popup : l'image est obligatoire pour un nouveau popup
      if (!editingPromoId && !form.image_popup) {
        errs.image_popup = 'Veuillez sélectionner une image / affiche pour le popup.';
      }
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
      let payload;
      if (modalMode === 'promotion') {
        payload = {
          titre: form.titre.trim() || null,
          description: form.description.trim() || null,
          pourcentage_promo: Number(form.pourcentage_promo),
          produit_id: Number(form.produit_id),
          afficher_popup: false,
          image_popup: null,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          statut: form.statut,
        };
      } else {
        // Mode Popup d'accueil
        payload = {
          titre: form.titre.trim() || 'Affiche Popup',
          description: form.description.trim() || null,
          pourcentage_promo: 0,
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
      }

      if (editingPromoId) {
        const res = await adminService.updatePromotion(editingPromoId, payload);
        if (res.success) {
          setPromotions((prev) => prev.map((p) => (p.id === editingPromoId ? res.data : p)));
          setShowModal(false);
          if (onShowToast) {
            onShowToast(modalMode === 'popup' ? 'Popup d’accueil mis à jour' : 'Promotion mise à jour avec succès');
          }
        }
      } else {
        const res = await adminService.createPromotion(payload);
        if (res.success) {
          setPromotions((prev) => [res.data, ...prev]);
          setShowModal(false);
          if (onShowToast) {
            onShowToast(modalMode === 'popup' ? 'Popup d’accueil créé avec succès' : 'Promotion créée avec succès');
          }
        }
      }
      window.dispatchEvent(new CustomEvent('takapay_promotions_updated'));
    } catch (err) {
      setFormErrors({ global: err.message || "Erreur lors de l'enregistrement." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    const isPop = activeTab === 'popups';
    const msg = isPop
      ? 'Voulez-vous vraiment supprimer ce popup d’accueil ?'
      : 'Voulez-vous vraiment supprimer cette promotion produit ?';

    if (window.confirm(msg)) {
      await adminService.deletePromotion(promoId);
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      if (onShowToast) onShowToast(isPop ? 'Popup supprimé' : 'Promotion supprimée');
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

  const activeCount = productPromos.filter((p) => computeStatus(p).label === 'En cours').length;
  const popupActiveCount = popupPromos.filter((p) => computeStatus(p).label === 'En cours' && p.afficher_popup).length;

  const lastPage = Math.max(1, Math.ceil(currentItems.length / perPage));
  const currentPage = Math.min(page, lastPage);
  const paginated = currentItems.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div>
      {/* En-tête de section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="admin-header-title">Promotions & Popups d'Accueil</h1>
          <p className="admin-header-sub">
            Gérez séparément vos remises sur les articles et vos affiches publicitaires popups
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn"
            onClick={() => handleOpenCreate('promotion')}
            style={{ padding: '10px 18px', fontSize: '13.5px', background: activeTab === 'promotions' ? 'var(--r)' : '#334155' }}
          >
            <AdminIcon name="tag" size={17} />
            <span>+ Nouvelle Promotion</span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => handleOpenCreate('popup')}
            style={{ padding: '10px 18px', fontSize: '13.5px', background: activeTab === 'popups' ? 'var(--r)' : '#0f766e' }}
          >
            <AdminIcon name="image" size={17} />
            <span>+ Nouveau Popup</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="admin-kpi-grid" style={{ marginTop: 0, marginBottom: '20px' }}>
        <div className="admin-kpi-card" onClick={() => setActiveTab('promotions')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-header">
            <span>Promotions actives</span>
            <i><AdminIcon name="tag" size={16} /></i>
          </div>
          <b>{activeCount}</b>
        </div>
        <div className="admin-kpi-card" onClick={() => setActiveTab('popups')} style={{ cursor: 'pointer' }}>
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
            {productPromos.length > 0
              ? `${Math.max(...productPromos.map((p) => parseFloat(p.pourcentage_promo) || 0))}%`
              : '0%'}
          </b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total configuré</span>
            <i><AdminIcon name="cal" size={16} /></i>
          </div>
          <b>{promotions.length}</b>
        </div>
      </div>

      {/* Onglets de navigation : Promotions Produits vs Popups d'Accueil */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1.5px solid var(--line)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('promotions'); setPage(1); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: activeTab === 'promotions' ? '2px solid var(--r)' : '1px solid var(--line)',
            background: activeTab === 'promotions' ? 'var(--soft)' : 'var(--card)',
            color: activeTab === 'promotions' ? 'var(--r)' : 'var(--ink)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <AdminIcon name="tag" size={16} />
          <span>🏷️ Promotions Produits ({productPromos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('popups'); setPage(1); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: activeTab === 'popups' ? '2px solid var(--r)' : '1px solid var(--line)',
            background: activeTab === 'popups' ? 'var(--soft)' : 'var(--card)',
            color: activeTab === 'popups' ? 'var(--r)' : 'var(--ink)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <AdminIcon name="image" size={16} />
          <span>🖼️ Popups d’Accueil ({popupPromos.length})</span>
        </button>
      </div>

      {/* Tableau des données */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement en cours...</p>
        ) : currentItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--mut)' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>
              {activeTab === 'promotions' ? 'Aucune promotion produit enregistrée.' : 'Aucun popup d’accueil enregistré.'}
            </p>
            <button
              type="button"
              className="admin-btn"
              onClick={() => handleOpenCreate(activeTab === 'popups' ? 'popup' : 'promotion')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              {activeTab === 'promotions' ? '+ Créer une promotion' : '+ Créer un popup d’accueil'}
            </button>
          </div>
        ) : activeTab === 'promotions' ? (
          /* TABLEAU 1 : PROMOTIONS PRODUITS */
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit ciblé</th>
                  <th>Remise (%)</th>
                  <th>Prix d'origine &amp; Remisé</th>
                  <th>Période de validité</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const st = computeStatus(p);
                  const dDebut = p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immédiat';
                  const dFin = p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indéterminée';
                  const prod = p.produit;
                  const initialPrice = Number(prod?.prix_unitaire || prod?.prix || 0);
                  const discountPct = Number(p.pourcentage_promo) || 0;
                  const discountedPrice = initialPrice > 0 ? Math.round(initialPrice * (1 - discountPct / 100)) : 0;
                  const prodImg = prod?.image_url || (prod?.imageProduits?.[0]?.image ? resolveImageUrl(prod.imageProduits[0].image) : null);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenEdit(p)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquer pour modifier cette promotion produit"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {prodImg ? (
                            <img
                              src={prodImg}
                              alt={prod?.nom || 'Produit'}
                              style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--line)', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--soft)', color: 'var(--r)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              <AdminIcon name="box" size={18} />
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{prod?.nom || `Produit #${p.produit_id}`}</strong>
                            <span className="admin-sub-text">
                              {p.titre || 'Remise directe catalogue'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge s2" style={{ fontSize: '13.5px', fontWeight: 800, padding: '4px 12px' }}>
                          -{discountPct}%
                        </span>
                      </td>
                      <td>
                        {initialPrice > 0 ? (
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ textDecoration: 'line-through', color: 'var(--mut)', marginRight: '6px' }}>
                              {formatFCFA(initialPrice)}
                            </span>
                            <b style={{ color: '#16a34a', fontWeight: 700 }}>
                              {formatFCFA(discountedPrice)}
                            </b>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Non défini</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{dDebut} &rarr; {dFin}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
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
        ) : (
          /* TABLEAU 2 : POPUPS D'ACCUEIL (AFFICHES) */
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Affiche Popup</th>
                  <th>Titre &amp; Message</th>
                  <th>Redirection Produit</th>
                  <th>Affichage à l'ouverture</th>
                  <th>Période de diffusion</th>
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
                      title="Cliquer pour modifier ce popup"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {popupImg ? (
                            <img
                              src={popupImg}
                              alt={p.titre || 'Affiche'}
                              style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'contain', background: '#f8fafc', border: '1px solid var(--line)', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'var(--soft)', color: 'var(--mut)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              <AdminIcon name="image" size={20} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{p.titre || 'Affiche Popup'}</strong>
                          <span className="admin-sub-text" style={{ maxWidth: '280px', display: 'block' }}>
                            {p.description ? p.description.slice(0, 70) + (p.description.length > 70 ? '...' : '') : 'Affiche publicitaire sans texte'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: p.produit?.nom ? 'var(--ink)' : 'var(--mut)' }}>
                          {p.produit?.nom ? `📦 ${p.produit.nom}` : '🌐 Aucun (Affiche seule)'}
                        </span>
                      </td>
                      <td>
                        {p.afficher_popup ? (
                          <span className="admin-badge s1">Popup Actif</span>
                        ) : (
                          <span className="admin-badge">Désactivé</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{dDebut} &rarr; {dFin}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(p.id)}
                            className="admin-btn-no"
                            style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Supprimer ce popup"
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
        {!loading && currentItems.length > 0 && (
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
              Affichage de <strong>{paginated.length}</strong> sur <strong>{currentItems.length}</strong> {activeTab === 'popups' ? 'popup(s)' : 'promotion(s)'} (Page {currentPage} sur {lastPage})
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

      {/* Modal création / modification séparé et clair */}
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
              maxWidth: '680px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* En-tête du modal avec sélecteur de mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  {editingPromoId
                    ? (modalMode === 'popup' ? 'Modifier le Popup d’Accueil' : 'Modifier la Promotion Produit')
                    : (modalMode === 'popup' ? 'Nouveau Popup d’Accueil' : 'Nouvelle Promotion Produit')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                  {modalMode === 'popup'
                    ? 'Ajoutez une affiche ou annonce visuelle qui s’ouvre à l’arrivée sur l’application'
                    : 'Appliquez une remise en pourcentage (%) sur un article de votre catalogue'}
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
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Sélecteur de type : Promotion vs Popup */}
            {!editingPromoId && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg)', padding: '5px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('promotion');
                    setForm((prev) => ({ ...prev, afficher_popup: false, pourcentage_promo: prev.pourcentage_promo || 15 }));
                    setFormErrors({});
                  }}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '9px',
                    border: 'none',
                    background: modalMode === 'promotion' ? 'var(--card)' : 'transparent',
                    color: modalMode === 'promotion' ? 'var(--r)' : 'var(--mut)',
                    fontWeight: modalMode === 'promotion' ? 800 : 600,
                    boxShadow: modalMode === 'promotion' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <AdminIcon name="tag" size={15} />
                  <span>🏷️ Promotion Produit (Remise %)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalMode('popup');
                    setForm((prev) => ({ ...prev, afficher_popup: true, pourcentage_promo: 0 }));
                    setFormErrors({});
                  }}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '9px',
                    border: 'none',
                    background: modalMode === 'popup' ? 'var(--card)' : 'transparent',
                    color: modalMode === 'popup' ? 'var(--r)' : 'var(--mut)',
                    fontWeight: modalMode === 'popup' ? 800 : 600,
                    boxShadow: modalMode === 'popup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <AdminIcon name="image" size={15} />
                  <span>🖼️ Popup d’Accueil (Affiche)</span>
                </button>
              </div>
            )}

            {formErrors.global && (
              <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
                {formErrors.global}
              </div>
            )}

            <form onSubmit={handleSavePromo} noValidate>
              {modalMode === 'promotion' ? (
                /* ========================================================
                   FORMULAIRE 1 : PROMOTION PRODUIT (REMISE %)
                   ======================================================== */
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                      Article concerné par la promotion *
                    </label>
                    <select
                      value={form.produit_id}
                      onChange={(e) => {
                        setForm({ ...form, produit_id: e.target.value });
                        if (formErrors.produit_id) setFormErrors((prev) => ({ ...prev, produit_id: null }));
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: formErrors.produit_id ? '2px solid #dc2626' : '1.5px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      <option value="">Sélectionnez un article du catalogue...</option>
                      {produits.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          📦 {prod.nom} ({formatFCFA(Number(prod.prix_unitaire || prod.prix || 0))})
                        </option>
                      ))}
                    </select>
                    {formErrors.produit_id && (
                      <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        ⚠ {formErrors.produit_id}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
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
                          boxSizing: 'border-box',
                          padding: '11px 14px',
                          borderRadius: '10px',
                          border: formErrors.pourcentage_promo ? '2px solid #dc2626' : '1.5px solid var(--line)',
                          background: 'var(--card)',
                          color: 'var(--ink)',
                          fontSize: '14px',
                          fontWeight: 700,
                        }}
                      />
                      {formErrors.pourcentage_promo && (
                        <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                          ⚠ {formErrors.pourcentage_promo}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                        Statut
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
                        <option value="actif">Actif (en cours)</option>
                        <option value="inactif">Inactif (brouillon)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                      Titre de l'opération promotionnelle (optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Vente Flash Week-end, Rentrée..."
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

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                      Description / Remarques (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Détails de la remise..."
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
                </>
              ) : (
                /* ========================================================
                   FORMULAIRE 2 : POPUP D'ACCUEIL (AFFICHE SEULE OU LIÉE)
                   ======================================================== */
                <>
                  <div
                    style={{
                      marginBottom: '18px',
                      padding: '18px',
                      borderRadius: '14px',
                      border: formErrors.image_popup ? '2px dashed #dc2626' : '1.5px dashed var(--line)',
                      background: 'var(--bg)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                        Affiche publicitaire du Popup *
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink)' }}>
                        <input
                          type="checkbox"
                          checked={form.afficher_popup}
                          onChange={(e) => setForm({ ...form, afficher_popup: e.target.checked })}
                        />
                        Activer l’affichage à l’ouverture du site
                      </label>
                    </div>

                    {form.image_popup ? (
                      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                        <img
                          src={form.image_popup.startsWith('data:') || form.image_popup.startsWith('http') ? form.image_popup : resolveImageUrl(form.image_popup)}
                          alt="Aperçu Popup"
                          style={{
                            maxHeight: '220px',
                            maxWidth: '100%',
                            borderRadius: '12px',
                            objectFit: 'contain',
                            border: '1px solid var(--line)',
                            display: 'block',
                            background: '#ffffff',
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
                            Remplacer l'affiche
                            <input type="file" accept="image/*" onChange={handlePopupImageChange} style={{ display: 'none' }} />
                          </label>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image_popup: '' })}
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
                            Supprimer l'image
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
                          padding: '24px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          color: 'var(--mut)',
                          fontSize: '13px',
                          textAlign: 'center',
                        }}
                      >
                        <AdminIcon name="image" size={30} />
                        <span style={{ marginTop: '8px', fontWeight: 700, color: 'var(--ink)' }}>
                          Cliquez pour choisir l'affiche / flyer du Popup
                        </span>
                        <span style={{ fontSize: '12px', marginTop: '2px' }}>Formats acceptés : PNG, JPG, WEBP (recommandé : format vertical ou carré)</span>
                        <input type="file" accept="image/*" onChange={handlePopupImageChange} style={{ display: 'none' }} />
                      </label>
                    )}

                    {formErrors.image_popup && (
                      <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '8px', display: 'block' }}>
                        ⚠ {formErrors.image_popup}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                        Titre du Popup / Nom de campagne
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Jeu Concours TakaPay, Offres Tabaski..."
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
                      <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                        Lier à un produit au clic (Optionnel)
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
                        <option value="">🌐 Aucun produit (Affiche publicitaire seule)</option>
                        {produits.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            📦 {prod.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                      Message affiché sous l'affiche (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Texte explicatif affiché au client..."
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

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
                      Statut de diffusion
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
                      <option value="actif">Actif (diffusé selon les dates)</option>
                      <option value="inactif">Inactif (archivé / brouillon)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Dates de validité (communes aux deux) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
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
                  <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--ink)' }}>
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

              {/* Boutons d'action */}
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
                  {submitting
                    ? 'Enregistrement...'
                    : editingPromoId
                    ? 'Enregistrer les modifications'
                    : (modalMode === 'popup' ? 'Créer le popup' : 'Créer la promotion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
