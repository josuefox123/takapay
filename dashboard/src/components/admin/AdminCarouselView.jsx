import { useState, useEffect, useRef } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';
import { resolveImageUrl } from '../../data/clientStore';

export default function AdminCarouselView({ onShowToast }) {
  const [carousels, setCarousels] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const initialForm = {
    titre: '',
    description: '',
    kicker: '',
    imageFile: null,
    imagePreview: '',
    texte_bouton: '',
    lien: '',
    produit_id: '',
    ordre: 0,
    is_actif: true,
    hasTextOverlay: false,
  };

  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, prods] = await Promise.all([
        adminService.getCarousels(true),
        adminService.getProduits().catch(() => []),
      ]);
      setCarousels(Array.isArray(list) ? list : []);
      setProduits(Array.isArray(prods) ? prods : []);
    } catch {
      if (onShowToast) onShowToast('Impossible de charger les bannières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      ...initialForm,
      ordre: carousels.length,
      hasTextOverlay: false,
    });
    setFormErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const hasText = Boolean(item.titre || item.description || item.kicker || item.texte_bouton);
    setForm({
      titre: item.titre || '',
      description: item.description || '',
      kicker: item.kicker || '',
      imageFile: null,
      imagePreview: resolveImageUrl(item.image_url) || '',
      texte_bouton: item.texte_bouton || '',
      lien: item.lien || '',
      produit_id: item.produit_id ? String(item.produit_id) : '',
      ordre: typeof item.ordre === 'number' ? item.ordre : 0,
      is_actif: Boolean(item.is_actif),
      hasTextOverlay: hasText,
    });
    setFormErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({ ...prev, image: 'Veuillez sélectionner un fichier image valide.' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));

    if (formErrors.image) {
      setFormErrors((prev) => ({ ...prev, image: null }));
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = !item.is_actif;
    try {
      await adminService.updateCarousel(item.id, { is_actif: newStatus });
      setCarousels((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_actif: newStatus } : c))
      );
      if (onShowToast) {
        onShowToast(newStatus ? 'Bannière activée et visible en vitrine' : 'Bannière masquée de la vitrine');
      }
    } catch (err) {
      alert(err.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (item) => {
    const nom = item.titre ? `"${item.titre}"` : 'cette bannière';
    if (!window.confirm(`Voulez-vous vraiment supprimer ${nom} ?`)) {
      return;
    }

    try {
      await adminService.deleteCarousel(item.id);
      setCarousels((prev) => prev.filter((c) => c.id !== item.id));
      if (onShowToast) onShowToast('Bannière supprimée avec succès.');
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!editingItem && !form.imageFile) {
      errors.image = "L'image de la bannière est requise.";
    }

    if (form.hasTextOverlay && !form.titre?.trim()) {
      errors.titre = 'Le titre est requis lorsque la superposition de texte est activée.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('titre', form.hasTextOverlay && form.titre ? form.titre.trim() : '');
      formData.append('description', form.hasTextOverlay && form.description ? form.description.trim() : '');
      formData.append('kicker', form.hasTextOverlay && form.kicker ? form.kicker.trim() : '');
      formData.append('texte_bouton', form.hasTextOverlay && form.texte_bouton ? form.texte_bouton.trim() : '');
      formData.append('lien', form.lien ? form.lien.trim() : '');
      if (form.produit_id) {
        formData.append('produit_id', form.produit_id);
      }
      formData.append('ordre', form.ordre !== undefined ? form.ordre : 0);
      formData.append('is_actif', form.is_actif ? '1' : '0');

      if (form.imageFile) {
        formData.append('image', form.imageFile);
      }

      if (editingItem) {
        const res = await adminService.updateCarousel(editingItem.id, formData);
        const updated = res.data || res;
        setCarousels((prev) =>
          prev.map((c) => (c.id === editingItem.id ? updated : c))
        );
        if (onShowToast) onShowToast('Bannière mise à jour avec succès.');
      } else {
        const res = await adminService.createCarousel(formData);
        const created = res.data || res;
        setCarousels((prev) => [created, ...prev]);
        if (onShowToast) onShowToast('Nouvelle bannière créée avec succès.');
      }

      setIsFormOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert(err.message || 'Erreur lors de l’enregistrement de la bannière.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = carousels.filter((c) => c.is_actif).length;

  return (
    <div>
      {/* En-tête */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h1 className="admin-header-title">Bannières Carrousel</h1>
          <p className="admin-header-sub">
            Gérez les diapositives panoramiques et messages promotionnels affichés sur la page d'accueil client
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={handleOpenCreate}
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <AdminIcon name="image" size={18} />
          <span>+ Nouvelle Bannière</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="admin-kpi-grid" style={{ marginTop: 0 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Bannières en vitrine</span>
            <i><AdminIcon name="check" size={16} /></i>
          </div>
          <b>{activeCount}</b>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total bannières</span>
            <i><AdminIcon name="image" size={16} /></i>
          </div>
          <b>{carousels.length}</b>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Dimensions bannières</span>
            <i><AdminIcon name="box" size={16} /></i>
          </div>
          <b style={{ fontSize: '17px' }}>Format Adaptatif</b>
          <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px' }}>
            S'adapte à l'image (rec. 1920×600)
          </span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Superposition texte</span>
            <i><AdminIcon name="file" size={16} /></i>
          </div>
          <b style={{ fontSize: '17px' }}>Optionnelle</b>
          <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px' }}>
            Visuel pur ou avec accroche
          </span>
        </div>
      </div>

      {/* Formulaire Intégré (Non-popup) */}
      {isFormOpen && (
        <div
          ref={formRef}
          className="admin-panel"
          style={{
            marginBottom: '28px',
            border: '2px solid var(--r)',
            borderRadius: '18px',
            padding: '28px',
            background: 'var(--card)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Header du formulaire */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '16px',
              marginBottom: '22px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                {editingItem ? 'Modifier la bannière' : 'Ajouter une nouvelle bannière'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                {form.hasTextOverlay
                  ? 'Bannière avec textes et bouton en superposition'
                  : 'Bannière visuelle pure (image seule affichée à ses proportions naturelles)'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingItem(null);
              }}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ✕ Fermer le formulaire
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Image de la bannière */}
            <div className="admin-field" style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                Image de la bannière {editingItem ? '(optionnelle si inchangée)' : '*'}
              </label>

              {form.imagePreview && (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '260px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    border: '1.5px solid var(--line)',
                    background: '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={form.imagePreview}
                    alt="Prévisualisation"
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />

                  {form.hasTextOverlay ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        bottom: '16px',
                        width: '48%',
                        maxWidth: '380px',
                        background: 'rgba(255,255,255,0.92)',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        zIndex: 2,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      }}
                    >
                      {form.kicker && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            background: 'var(--r)',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            width: 'fit-content',
                            marginBottom: '6px',
                          }}
                        >
                          {form.kicker}
                        </span>
                      )}
                      <strong style={{ fontSize: '14px', color: '#111827', lineHeight: 1.2 }}>
                        {form.titre || 'Titre de la bannière'}
                      </strong>
                      {form.description && (
                        <span style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px', lineHeight: 1.3 }}>
                          {form.description}
                        </span>
                      )}
                      {form.texte_bouton && (
                        <span
                          style={{
                            marginTop: '8px',
                            display: 'inline-block',
                            background: 'var(--r)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            width: 'fit-content',
                          }}
                        >
                          {form.texte_bouton}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        zIndex: 2,
                      }}
                    >
                      ✓ Aperçu : Visuel pur (aucun texte superposé)
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, image/jpg"
                onChange={handleFileChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: formErrors.image ? '2px solid #dc2626' : '1.5px solid var(--line)',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--mut)' }}>
                  Format adaptatif libre (recommandé paysage : 1920 × 600 px ou ratio 16:5 / 16:9). Formats : WEBP, PNG, JPG (max 10 Mo).
                </span>
                {formErrors.image && (
                  <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>
                    ⚠ {formErrors.image}
                  </span>
                )}
              </div>
            </div>

            {/* Case à cocher : Option Superposition de texte */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1.5px solid var(--line)',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>
                  Superposer du texte sur l'image ?
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--mut)' }}>
                  Laissez cette case décochée si votre bannière graphique contient déjà ses visuels et messages.
                </span>
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  userSelect: 'none',
                  color: 'var(--ink)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.hasTextOverlay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({ ...prev, hasTextOverlay: checked }));
                    if (!checked && formErrors.titre) {
                      setFormErrors((prev) => ({ ...prev, titre: null }));
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--r)',
                    cursor: 'pointer',
                  }}
                />
                <span>{form.hasTextOverlay ? 'Oui, ajouter du texte' : 'Non, laisser vide (Visuel pur)'}</span>
              </label>
            </div>

            {/* Champs de texte conditionnels si hasTextOverlay est actif */}
            {form.hasTextOverlay && (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1.5px solid var(--line)',
                  borderRadius: '14px',
                  padding: '20px',
                  marginBottom: '22px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                      Badge d'accroche (Kicker)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 🔥 OFFRE LIMITÉE"
                      value={form.kicker}
                      onChange={(e) => setForm({ ...form, kicker: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div className="admin-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                      Titre principal de la bannière *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Épargnez progressivement pour vos achats"
                      value={form.titre}
                      onChange={(e) => {
                        setForm({ ...form, titre: e.target.value });
                        if (formErrors.titre) setFormErrors((prev) => ({ ...prev, titre: null }));
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: formErrors.titre ? '2px solid #dc2626' : '1.5px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                        fontSize: '14px',
                      }}
                    />
                    {formErrors.titre && (
                      <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        ⚠ {formErrors.titre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-field" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Description / Sous-titre
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Ex: Cotisez à votre convenance en toute liberté et sans intérêt. Catalogue en ligne ouvert à tous."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div className="admin-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Texte du bouton
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Découvrir le catalogue →"
                    value={form.texte_bouton}
                    onChange={(e) => setForm({ ...form, texte_bouton: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Redirection / Lien cliquable */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '18px',
              }}
            >
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Lier à un produit (au clic sur la bannière)
                </label>
                <select
                  value={form.produit_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      produit_id: val,
                      lien: val ? '' : form.lien,
                    });
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Aucun produit lié (Lien personnalisé ci-dessous)</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom || p.n} ({p.prix_vente ? `${p.prix_vente} FCFA` : `${p.p} FCFA`})
                    </option>
                  ))}
                </select>
              </div>

              {!form.produit_id && (
                <div className="admin-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Lien personnalisé (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: /catalogue ou https://..."
                    value={form.lien}
                    onChange={(e) => setForm({ ...form, lien: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Ordre & Visibilité */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '26px',
              }}
            >
              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.ordre}
                  onChange={(e) => setForm({ ...form, ordre: parseInt(e.target.value, 10) || 0 })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                  Plus le chiffre est petit, plus la bannière apparaît en premier (0, 1, 2...).
                </span>
              </div>

              <div className="admin-field" style={{ margin: 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Visibilité
                </label>
                <select
                  value={form.is_actif ? '1' : '0'}
                  onChange={(e) => setForm({ ...form, is_actif: e.target.value === '1' })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                  }}
                >
                  <option value="1">Actif (affiché immédiatement en vitrine)</option>
                  <option value="0">Masqué (brouillon / désactivé)</option>
                </select>
              </div>
            </div>

            {/* Actions du formulaire */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '14px',
                borderTop: '1px solid var(--line)',
                paddingTop: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingItem(null);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn"
                style={{
                  padding: '12px 28px',
                  fontSize: '14px',
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting
                  ? 'Enregistrement...'
                  : editingItem
                  ? 'Enregistrer les modifications'
                  : 'Publier la bannière'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des bannières */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>
            Chargement des bannières...
          </p>
        ) : carousels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <AdminIcon name="image" size={48} style={{ color: 'var(--mut)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '8px' }}>
              Aucune bannière configurée
            </h3>
            <p style={{ color: 'var(--mut)', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
              Ajoutez votre première bannière panoramique pour mettre en valeur vos offres et promotions sur la vitrine client.
            </p>
            <button
              type="button"
              className="admin-btn"
              onClick={handleOpenCreate}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              + Créer une bannière
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Visuel</th>
                  <th>Titre & Accroche</th>
                  <th>Description</th>
                  <th>Action du bouton</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Ordre</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Statut</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {carousels.map((item) => {
                  const hasProd = item.produit;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div
                          style={{
                            width: '120px',
                            height: '52px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#f1ede6',
                            border: '1px solid var(--line)',
                            position: 'relative',
                          }}
                        >
                          {item.image_url ? (
                            <img
                              src={resolveImageUrl(item.image_url)}
                              alt={item.titre}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--mut)',
                                fontSize: '11px',
                              }}
                            >
                              Sans image
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {item.kicker && (
                            <span
                              style={{
                                alignSelf: 'flex-start',
                                fontSize: '11px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: 'rgba(220, 38, 38, 0.1)',
                                color: 'var(--r)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {item.kicker}
                            </span>
                          )}
                          <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>
                            {item.titre || <span style={{ color: 'var(--mut)', fontWeight: 400, fontStyle: 'italic' }}>Visuel pur (sans texte)</span>}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            color: 'var(--mut)',
                            maxWidth: '280px',
                            lineHeight: 1.45,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.description || '—'}
                        </p>
                      </td>

                      <td>
                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 600, color: item.texte_bouton ? 'var(--ink)' : 'var(--mut)', fontStyle: item.texte_bouton ? 'normal' : 'italic' }}>
                            {item.texte_bouton || 'Aucun bouton'}
                          </span>
                          <span style={{ color: 'var(--mut)', fontSize: '12px' }}>
                            {hasProd
                              ? `Article : ${item.produit.nom || item.produit.n}`
                              : item.lien
                              ? `Lien : ${item.lien}`
                              : 'Redirection : Catalogue'}
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>
                        {item.ordre}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Cliquer pour changer le statut"
                          style={{
                            background: item.is_actif
                              ? 'rgba(34, 197, 94, 0.12)'
                              : 'rgba(156, 163, 175, 0.18)',
                            color: item.is_actif ? '#15803d' : '#6b7280',
                            border: `1px solid ${item.is_actif ? '#86efac' : '#d1d5db'}`,
                            padding: '4px 12px',
                            borderRadius: '99px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: item.is_actif ? '#22c55e' : '#9ca3af',
                            }}
                          />
                          {item.is_actif ? 'Actif' : 'Masqué'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Modifier cette bannière"
                            style={{
                              background: 'var(--card)',
                              border: '1px solid var(--line)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              color: 'var(--ink)',
                              fontSize: '13px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title="Supprimer cette bannière"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#dc2626',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <AdminIcon name="trash" size={15} />
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
      </div>


    </div>
  );
}
