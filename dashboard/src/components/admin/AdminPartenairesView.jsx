import { useEffect, useRef, useState } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

const emptyForm = {
  nom: '',
  logoFile: null,
  logoPreview: '',
  lien: '',
  ordre: 0,
  actif: true,
};

export default function AdminPartenairesView({ onShowToast }) {
  const [partenaires, setPartenaires] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    let active = true;
    adminService.getPartenaires(true)
      .then((items) => {
        if (active) setPartenaires(items);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Impossible de charger les partenaires.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const preview = form.logoPreview;
    return () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [form.logoPreview]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, ordre: partenaires.length });
    setIsFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openEdit = (partenaire) => {
    setEditingItem(partenaire);
    setForm({
      nom: partenaire.nom || '',
      logoFile: null,
      logoPreview: partenaire.logo_url || '',
      lien: partenaire.lien || '',
      ordre: partenaire.ordre ?? 0,
      actif: Boolean(partenaire.actif),
    });
    setIsFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir un fichier image valide.');
      return;
    }
    setError('');
    setForm((current) => ({
      ...current,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom du partenaire est obligatoire.');
      return;
    }
    if (!editingItem && !form.logoFile) {
      setError('Le logo est obligatoire pour un nouveau partenaire.');
      return;
    }

    setSubmitting(true);
    setError('');
    const formData = new FormData();
    formData.append('nom', form.nom.trim());
    formData.append('lien', form.lien.trim());
    formData.append('ordre', String(form.ordre));
    formData.append('actif', form.actif ? '1' : '0');
    if (form.logoFile) formData.append('logo', form.logoFile);

    try {
      if (editingItem) {
        const response = await adminService.updatePartenaire(editingItem.id, formData);
        const updated = response.data || response;
        setPartenaires((items) => items
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => a.ordre - b.ordre));
        onShowToast?.('Partenaire modifié avec succès.');
      } else {
        const response = await adminService.createPartenaire(formData);
        setPartenaires((items) => [...items, response.data || response].sort((a, b) => a.ordre - b.ordre));
        onShowToast?.('Partenaire ajouté avec succès.');
      }
      setIsFormOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
    } catch (submitError) {
      setError(submitError.message || 'Erreur lors de l’enregistrement du partenaire.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (partenaire) => {
    try {
      await adminService.updatePartenaire(partenaire.id, { actif: !partenaire.actif });
      setPartenaires((items) => items.map((item) => (
        item.id === partenaire.id ? { ...item, actif: !item.actif } : item
      )));
      onShowToast?.(partenaire.actif ? 'Partenaire masqué de la vitrine.' : 'Partenaire affiché dans la vitrine.');
    } catch (statusError) {
      setError(statusError.message || 'Impossible de modifier le statut du partenaire.');
    }
  };

  const deletePartenaire = async (partenaire) => {
    if (!window.confirm(`Supprimer le partenaire « ${partenaire.nom} » ?`)) return;
    try {
      await adminService.deletePartenaire(partenaire.id);
      setPartenaires((items) => items.filter((item) => item.id !== partenaire.id));
      onShowToast?.('Partenaire supprimé.');
    } catch (deleteError) {
      setError(deleteError.message || 'Impossible de supprimer ce partenaire.');
    }
  };

  const activeCount = partenaires.filter((partenaire) => partenaire.actif).length;

  return (
    <div className="admin-partners-view">
      <header className="admin-partners-header">
        <div>
          <h1 className="admin-header-title">Partenaires</h1>
          <p className="admin-header-sub">
            Gérez les logos et les liens affichés dans le bandeau de la page d’accueil.
          </p>
        </div>
        <button type="button" className="admin-btn" onClick={openCreate}>
          <AdminIcon name="plus" size={18} />
          Ajouter un partenaire
        </button>
      </header>

      <div className="admin-kpi-grid admin-partners-stats">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header"><span>Partenaires visibles</span><i><AdminIcon name="check" size={16} /></i></div>
          <b>{activeCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header"><span>Total des partenaires</span><i><AdminIcon name="users" size={16} /></i></div>
          <b>{partenaires.length}</b>
        </div>
      </div>

      {error && <p className="admin-partners-error" role="alert">{error}</p>}

      {isFormOpen && (
        <form ref={formRef} className="admin-panel admin-partner-form" onSubmit={handleSubmit}>
          <div className="admin-partner-form-header">
            <div>
              <h2>{editingItem ? 'Modifier le partenaire' : 'Ajouter un partenaire'}</h2>
              <p>Le logo doit être une image de 5 Mo maximum.</p>
            </div>
            <button type="button" className="admin-partner-secondary" onClick={() => setIsFormOpen(false)}>
              Fermer
            </button>
          </div>

          <div className="admin-partner-form-grid">
            <label className="admin-partner-field">
              <span>Nom du partenaire *</span>
              <input
                required
                maxLength={255}
                value={form.nom}
                onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
                placeholder="Ex. Partenaire officiel"
              />
            </label>

            <label className="admin-partner-field">
              <span>Site web (facultatif)</span>
              <input
                type="url"
                value={form.lien}
                onChange={(event) => setForm((current) => ({ ...current, lien: event.target.value }))}
                placeholder="https://exemple.com"
              />
            </label>

            <label className="admin-partner-field">
              <span>Position d’affichage</span>
              <input
                type="number"
                value={form.ordre}
                onChange={(event) => setForm((current) => ({ ...current, ordre: event.target.value }))}
              />
            </label>

            <label className="admin-partner-field">
              <span>Logo {editingItem ? '(facultatif si inchangé)' : '*'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
            </label>
          </div>

          {form.logoPreview && (
            <div className="admin-partner-preview">
              <img src={form.logoPreview} alt={`Aperçu du logo ${form.nom}`} />
            </div>
          )}

          <label className="admin-partner-checkbox">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(event) => setForm((current) => ({ ...current, actif: event.target.checked }))}
            />
            Afficher ce partenaire sur la page d’accueil
          </label>

          <div className="admin-partner-form-actions">
            <button type="button" className="admin-partner-secondary" onClick={() => setIsFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="admin-btn" disabled={submitting}>
              {submitting ? 'Enregistrement…' : editingItem ? 'Enregistrer les modifications' : 'Ajouter le partenaire'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="admin-partners-empty">Chargement des partenaires…</p>
      ) : partenaires.length === 0 ? (
        <div className="admin-partners-empty">
          <AdminIcon name="users" size={32} />
          <strong>Aucun partenaire pour le moment</strong>
          <span>Ajoutez un logo pour le faire apparaître sur la page d’accueil.</span>
        </div>
      ) : (
        <div className="admin-partners-list">
          {partenaires.map((partenaire) => (
            <article key={partenaire.id} className="admin-partner-card">
              <div className="admin-partner-logo">
                <img src={partenaire.logo_url} alt={`Logo ${partenaire.nom}`} />
              </div>
              <div className="admin-partner-info">
                <strong>{partenaire.nom}</strong>
                <span>{partenaire.lien || 'Aucun site web renseigné'}</span>
                <small>Position {partenaire.ordre}</small>
              </div>
              <span className={`admin-partner-status ${partenaire.actif ? 'is-active' : ''}`}>
                {partenaire.actif ? 'Visible' : 'Masqué'}
              </span>
              <div className="admin-partner-actions">
                <button type="button" className="admin-partner-secondary" onClick={() => toggleStatus(partenaire)}>
                  {partenaire.actif ? 'Masquer' : 'Afficher'}
                </button>
                <button type="button" className="admin-partner-secondary" onClick={() => openEdit(partenaire)}>
                  Modifier
                </button>
                <button type="button" className="admin-partner-delete" onClick={() => deletePartenaire(partenaire)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
