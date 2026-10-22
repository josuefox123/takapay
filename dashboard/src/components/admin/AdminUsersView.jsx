import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import AdminIcon from './AdminIcon';

export default function AdminUsersView({ onShowToast }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('tous');
  const [search, setSearch] = useState('');

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
    await adminService.updateUserStatus(userId, newStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, statut_compte: newStatus } : u))
    );
    onShowToast(`Statut de l'utilisateur mis à jour : ${newStatus}`);
  };

  const filtered = users.filter((u) => {
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

  const clientCount = users.filter((u) => u.role === 'client').length;
  const livreurCount = users.filter((u) => u.role === 'livreur').length;
  const adminCount = users.filter((u) => (u.role || '').includes('admin')).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Gestion des Utilisateurs</h1>
        <p className="admin-header-sub">
          Supervisez les clients, livreurs partenaires et administrateurs de la plateforme
        </p>
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
          <option value="super_admin">Super Admins</option>
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
                  <tr key={u.id}>
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
                    <td>
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
    </div>
  );
}
