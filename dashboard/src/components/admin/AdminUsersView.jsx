import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import AdminIcon from './AdminIcon';

export default function AdminUsersView({ onShowToast, currentUser }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('tous');
  const [search, setSearch] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin' || adminService.getUser()?.role === 'super_admin';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'admin',
    password: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdAdmin, setCreatedAdmin] = useState(null);
  const [copied, setCopied] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'client',
    statut_compte: 'actif',
    password: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pwd = 'Tk@';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      role: 'admin',
      password: generateRandomPassword(),
    });
    setCreateError('');
    setCreatedAdmin(null);
    setCopied(false);
    setShowCreateModal(true);
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.nom.trim()) {
      setCreateError('Le nom est requis.');
      return;
    }
    if (!createForm.email.trim()) {
      setCreateError("L'adresse e-mail est requise.");
      return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      setCreateError('Le mot de passe temporaire doit comporter au moins 8 caractères.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await adminService.createUser({
        ...createForm,
        statut_compte: 'actif',
      });
      const newUser = res.data || res;
      setCreatedAdmin({
        user: newUser,
        password: createForm.password,
      });
      if (onShowToast) {
        onShowToast(`Administrateur ${newUser.prenom || ''} ${newUser.nom} créé avec succès !`);
      }
      adminService.getUsers(page).then((response) => {
        if (response.data) setUsers(response.data);
        if (response.meta) setMeta(response.meta);
      });
    } catch (err) {
      const msg = err.errors
        ? Object.values(err.errors).flat().join(' ')
        : (err.message || "Erreur lors de la création de l'administrateur.");
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdAdmin) return;
    const text = `Identifiants TakaPay Admin :\nURL : ${window.location.origin}/admin/connexion\nEmail : ${createdAdmin.user.email}\nMot de passe temporaire : ${createdAdmin.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    adminService.getUsers(page).then((res) => {
      if (isMounted) {
        setUsers(res.data || []);
        if (res.meta) {
          setMeta(res.meta);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [page]);

  const handleStatusChange = async (userId, newStatus) => {
    if (newStatus === 'supprimer') {
      const target = users.find((u) => u.id === userId);
      const label = target ? `${target.prenom || ''} ${target.nom || ''} (${target.email || ''})`.trim() : 'cet utilisateur';
      if (!window.confirm(`Voulez-vous vraiment supprimer le compte de ${label} ?`)) {
        return;
      }
      try {
        await adminService.deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setMeta((prev) => ({ ...prev, total: Math.max((prev.total || 1) - 1, 0) }));
        if (onShowToast) {
          onShowToast('Compte utilisateur supprimé avec succès.');
        }
      } catch (err) {
        if (onShowToast) {
          onShowToast(err.message || 'Erreur lors de la suppression du compte.');
        }
      }
      return;
    }

    await adminService.updateUserStatus(userId, newStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, statut_compte: newStatus } : u))
    );
    if (onShowToast) {
      onShowToast(`Statut de l'utilisateur mis à jour : ${newStatus}`);
    }
  };

  const handleOpenEditModal = (user) => {
    if (!isSuperAdmin) return;
    setEditingUser(user);
    setEditForm({
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      role: user.role || 'client',
      statut_compte: user.statut_compte || 'actif',
      password: '',
    });
    setEditError('');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    if (!editForm.nom.trim()) {
      setEditError('Le nom est requis.');
      return;
    }
    if (!editForm.email.trim()) {
      setEditError("L'adresse e-mail est requise.");
      return;
    }

    setEditLoading(true);
    try {
      const payload = {
        nom: editForm.nom.trim(),
        prenom: editForm.prenom.trim(),
        email: editForm.email.trim(),
        telephone: editForm.telephone.trim() || null,
        role: editForm.role,
        statut_compte: editForm.statut_compte,
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await adminService.updateUser(editingUser.id, payload);
      const updatedUser = res.data || res;

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...updatedUser } : u))
      );
      setEditingUser(null);
      if (onShowToast) {
        onShowToast(`Compte de ${updatedUser.prenom || ''} ${updatedUser.nom} modifié avec succès.`);
      }
    } catch (err) {
      setEditError(err.message || 'Erreur lors de la modification du compte.');
    } finally {
      setEditLoading(false);
    }
  };

  const visibleUsers = isSuperAdmin
    ? users
    : users.filter((u) => u.role !== 'super_admin');

  const filtered = visibleUsers.filter((u) => {
    const fullName = `${u.prenom || ''} ${u.nom || ''} ${u.email || ''}`.toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase()) || (u.telephone || '').includes(search);
    const matchRole = roleFilter === 'tous' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const sorted = [...filtered].sort((a, b) => {
    const nomA = (a.nom || '').trim().toLowerCase();
    const nomB = (b.nom || '').trim().toLowerCase();
    if (nomA !== nomB) return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
    const prenomA = (a.prenom || '').trim().toLowerCase();
    const prenomB = (b.prenom || '').trim().toLowerCase();
    return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
  });

  const clientCount = visibleUsers.filter((u) => u.role === 'client').length;
  const livreurCount = visibleUsers.filter((u) => u.role === 'livreur').length;
  const adminCount = visibleUsers.filter((u) =>
    isSuperAdmin ? (u.role || '').includes('admin') : u.role === 'admin'
  ).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="admin-header-title">Gestion des Utilisateurs</h1>
          <p className="admin-header-sub">
            Supervisez les clients, livreurs partenaires et administrateurs de la plateforme
          </p>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'var(--r)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
              transition: 'transform 0.15s ease',
            }}
          >
            <AdminIcon name="plus" size={16} />
            <span>Créer un administrateur</span>
          </button>
        )}
      </div>

      {/* Cartes récapitulatives KPI harmonisées avec les autres vues admin */}
      <div className="admin-kpi-grid" style={{ marginTop: 0, marginBottom: '24px' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total Utilisateurs</span>
            <i><AdminIcon name="users" size={16} /></i>
          </div>
          <b>{meta.total || users.length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Clients</span>
            <i><AdminIcon name="check" size={16} /></i>
          </div>
          <b>{clientCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Livreurs</span>
            <i><AdminIcon name="truck" size={16} /></i>
          </div>
          <b>{livreurCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Administrateurs</span>
            <i><AdminIcon name="shield" size={16} /></i>
          </div>
          <b>{adminCount}</b>
        </div>
      </div>

      {/* Barre de recherche et filtres de rôle */}
      <div className="admin-panel" style={{ marginBottom: '24px', padding: '18px 24px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone..."
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
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
          <option value="tous">Tous les rôles</option>
          <option value="client">Clients</option>
          <option value="livreur">Livreurs</option>
          <option value="admin">Administrateurs</option>
          {isSuperAdmin && <option value="super_admin">Super Admins</option>}
        </select>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="admin-panel" style={{ padding: '24px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des utilisateurs...</p>
        ) : sorted.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucun utilisateur trouvé.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Coordonnées</th>
                  <th>Rôle</th>
                  <th>Statut du compte</th>
                  <th>Modifier le statut</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => isSuperAdmin && handleOpenEditModal(u)}
                    title={isSuperAdmin ? 'Cliquer pour modifier ce compte' : undefined}
                    style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--soft)',
                            color: 'var(--r)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {(u.nom || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.prenom} {u.nom}</strong>
                          <span className="admin-sub-text">Inscrit le {u.created_at ? u.created_at.slice(0, 10) : 'Récemment'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{u.email}</span>
                      <span className="admin-sub-text">{u.telephone || 'Non renseigné'}</span>
                    </td>
                    <td>
                      <span
                        className="admin-badge"
                        style={{
                          background: u.role.includes('admin') ? 'var(--soft)' : '#f3f4f6',
                          color: u.role.includes('admin') ? 'var(--r)' : '#374151',
                          textTransform: 'capitalize',
                        }}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.statut_compte === 'actif' ? 's1' : u.statut_compte === 'suspendu' ? 's3' : 's2'}`}>
                        {u.statut_compte || 'actif'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={u.statut_compte || 'actif'}
                        onChange={(e) => handleStatusChange(u.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: 'var(--card)',
                          color: 'var(--ink)',
                          fontSize: '12px',
                          font: 'inherit',
                        }}
                      >
                        <option value="actif">Actif</option>
                        <option value="suspendu">Suspendre</option>
                        <option value="inactif">Inactif</option>
                        <option value="supprimer">Supprimer</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Barre de pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '20px',
            marginTop: '20px',
            borderTop: '1px solid var(--line)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--mut)' }}>
            Affichage de <strong>{users.length}</strong> sur <strong>{meta.total}</strong> utilisateur{meta.total > 1 ? 's' : ''} (Page {meta.current_page} sur {meta.last_page || 1})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: page <= 1 || loading ? 'var(--bg)' : 'var(--card)',
                color: page <= 1 || loading ? 'var(--mut)' : 'var(--ink)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: page <= 1 || loading ? 0.6 : 1,
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
              {meta.current_page} / {meta.last_page || 1}
            </span>

            <button
              type="button"
              disabled={page >= meta.last_page || loading}
              onClick={() => setPage((prev) => Math.min(prev + 1, meta.last_page))}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: page >= meta.last_page || loading ? 'var(--bg)' : 'var(--card)',
                color: page >= meta.last_page || loading ? 'var(--mut)' : 'var(--ink)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: page >= meta.last_page || loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: page >= meta.last_page || loading ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              Suivant &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Modal de création d'administrateur */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
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
            if (e.target === e.currentTarget && !createLoading) {
              setShowCreateModal(false);
              setCreatedAdmin(null);
            }
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--line)',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {createdAdmin ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 14px',
                      fontSize: '28px',
                    }}
                  >
                    ✓
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                    Administrateur créé avec succès !
                  </h2>
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--mut)', lineHeight: 1.5 }}>
                    Un e-mail de bienvenue contenant ses accès de connexion a été envoyé à <strong>{createdAdmin.user.email}</strong>.
                    Lors de sa première connexion, le système lui demandera obligatoirement de définir son mot de passe personnel.
                  </p>
                </div>

                <div
                  style={{
                    background: 'var(--bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ color: 'var(--mut)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Identifiant (Email)
                    </span>
                    <strong style={{ color: 'var(--ink)', fontSize: '14px' }}>{createdAdmin.user.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Mot de passe temporaire
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                      <code style={{ fontSize: '15px', fontWeight: 700, color: 'var(--r)', background: 'var(--soft)', padding: '4px 8px', borderRadius: '6px' }}>
                        {createdAdmin.password}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: 'var(--card)',
                          color: copied ? '#10b981' : 'var(--ink)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? '✓ Copié !' : 'Copier'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedAdmin(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--ink)',
                    color: 'var(--bg)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAdminSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                      Créer un administrateur
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                      Renseignez les informations du nouvel administrateur
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: 'var(--mut)',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {createError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {createError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.nom}
                      onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                      placeholder="Ex: Doe"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={createForm.prenom}
                      onChange={(e) => setCreateForm({ ...createForm, prenom: e.target.value })}
                      placeholder="Ex: John"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                      Email professionnel *
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="admin@takapay.bj"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={createForm.telephone}
                      onChange={(e) => setCreateForm({ ...createForm, telephone: e.target.value })}
                      placeholder="+229 90000000"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Rôle d'administration
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="admin">Administrateur (Gestion standard)</option>
                    <option value="super_admin">Super Administrateur (Droits complets)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                      Mot de passe temporaire *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, password: generateRandomPassword() })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--r)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ↻ Régénérer
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimum 8 caractères"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--mut)', lineHeight: 1.4 }}>
                    ℹ️ Ce mot de passe temporaire sera transmis par e-mail. Le nouvel administrateur devra obligatoirement le modifier dès sa première connexion.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createLoading}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--r)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: createLoading ? 'not-allowed' : 'pointer',
                      opacity: createLoading ? 0.7 : 1,
                    }}
                  >
                    {createLoading ? 'Création en cours...' : "Créer l'administrateur"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de modification de compte (Super Admin) */}
      {editingUser && isSuperAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
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
            if (e.target === e.currentTarget && !editLoading) {
              setEditingUser(null);
            }
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--line)',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            <form onSubmit={handleEditUserSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                    Modifier le compte
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                    {editingUser.prenom} {editingUser.nom} ({editingUser.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--mut)',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              {editError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {editError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.nom}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={editForm.prenom}
                    onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editForm.telephone}
                    onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Rôle
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="client">Client</option>
                    <option value="livreur">Livreur</option>
                    <option value="admin">Administrateur</option>
                    <option value="super_admin">Super Administrateur</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Statut du compte
                  </label>
                  <select
                    value={editForm.statut_compte}
                    onChange={(e) => setEditForm({ ...editForm, statut_compte: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    Nouveau mot de passe / PIN (optionnel)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, password: generateRandomPassword() })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--r)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ↻ Générer un mot de passe temporaire
                  </button>
                </div>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Laisser vide pour conserver le mot de passe actuel"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={editLoading}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'transparent',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--r)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: editLoading ? 'not-allowed' : 'pointer',
                    opacity: editLoading ? 0.7 : 1,
                  }}
                >
                  {editLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
