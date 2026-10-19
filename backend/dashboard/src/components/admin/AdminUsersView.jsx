import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function AdminUsersView({ onShowToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('tous');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    adminService.getUsers().then((data) => {
      if (isMounted) {
        setUsers(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Gestion des Utilisateurs</h1>
        <p className="admin-header-sub">
          Supervisez les clients, livreurs partenaires et administrateurs de la plateforme
        </p>
      </div>

      {/* Barre de recherche et filtres de rôle */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
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
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des utilisateurs...</p>
        ) : filtered.length === 0 ? (
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
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--soft)',
                            color: 'var(--r)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
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
      </div>
    </div>
  );
}
