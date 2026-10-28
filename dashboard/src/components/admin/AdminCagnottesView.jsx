import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminCagnottesView() {
  const [cagnottes, setCagnottes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

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
    const clientNom = c.utilisateur
      ? `${c.utilisateur.nom || ''} ${c.utilisateur.prenom || ''}`
      : (c.client_nom || '');
    const clientTel = c.telephone_livraison || c.utilisateur?.telephone || c.client_tel || '';
    const produitNom = c.produit?.nom || c.produit_nom || '';
    const code = c.code || `CG-${c.id}`;

    const matchSearch =
      code.toLowerCase().includes(s) ||
      clientNom.toLowerCase().includes(s) ||
      clientTel.toLowerCase().includes(s) ||
      produitNom.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'tous' || c.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMontant = cagnottes.reduce((acc, c) => acc + (Number(c.montant_verse) || 0), 0);
  const activeCount = cagnottes.filter((c) => c.statut === 'en_cours').length;
  const completedCount = cagnottes.filter((c) => c.statut === 'terminee').length;

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
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total encaissé</span>
            <i><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b>{totalMontant.toLocaleString('fr-FR')} F</b>
        </div>
      </div>

      {/* Filtres */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par client, article, code..."
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
          <option value="annulee">Annulée</option>
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

                  const clientNom = c.utilisateur
                    ? `${c.utilisateur.nom || ''} ${c.utilisateur.prenom || ''}`.trim()
                    : (c.client_nom || 'Client');
                  const clientTel = c.telephone_livraison || c.utilisateur?.telephone || c.client_tel || '—';

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
                        <span style={{ fontWeight: 600 }}>{c.produit?.nom || c.produit_nom || 'Article'}</span>
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
                        <span className={`admin-badge ${c.statut === 'terminee' ? 's1' : c.statut === 'en_cours' ? 's2' : 's3'}`}>
                          {c.statut === 'terminee' ? 'Terminée' : c.statut === 'en_cours' ? 'En cours' : 'Annulée'}
                        </span>
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
