import { useState, useEffect, useMemo } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminCommandesView({ onShowToast }) {
  const [commandes, setCommandes] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const load = () => {
    setLoading(true);
    adminService
      .getCommandes({ q: search, statut: filterStatut, page })
      .then((res) => {
        setCommandes(res.data);
        setMeta(res.meta);
      })
      .catch(() => onShowToast?.('Erreur lors du chargement des commandes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatut]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // --- KPIs calculés localement ---
  const stats = useMemo(() => {
    const total = commandes.length;
    const totalMontant = commandes.reduce(
      (sum, c) => sum + Number(c.prix_total || 0),
      0
    );
    const enAttente = commandes.filter(
      (c) => String(c.statut).toLowerCase() === 'en_attente'
    ).length;
    const payees = commandes.filter(
      (c) => String(c.statut).toLowerCase() === 'payee'
    ).length;
    return { total, totalMontant, enAttente, payees };
  }, [commandes]);

  const computeStatut = (statut) => {
    const s = String(statut || '').toLowerCase();
    if (s === 'payee') return { label: 'Payée', cls: 's1' };
    if (s === 'livree') return { label: 'Livrée', cls: 's1' };
    if (s === 'annulee') return { label: 'Annulée', cls: 's3' };
    return { label: 'En attente', cls: 's2' };
  };

  const computeProgress = (cmd) => {
    if (cmd.cagnotte?.progression != null) {
      return Math.min(100, Math.max(0, Number(cmd.cagnotte.progression)));
    }
    const montant = Number(cmd.cagnotte?.montant_verse ?? 0);
    const objectif = Number(cmd.cagnotte?.objectif ?? 0);
    if (objectif > 0) {
      return Math.min(100, Math.max(0, Math.round((montant / objectif) * 100)));
    }
    return 0;
  };

  return (
    <div>
      {/* En-tête de section */}
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
          <h1 className="admin-header-title">Commandes</h1>
          <p className="admin-header-sub">
            Suivez les commandes clients, leur cagnotte et l’avancement des paiements
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => load()}
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <AdminIcon name="swap" size={18} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="admin-kpi-grid" style={{ marginTop: 0 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Commandes affichées</span>
            <i><AdminIcon name="box" size={16} /></i>
          </div>
          <b>{stats.total}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Montant total</span>
            <i><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b>{stats.totalMontant.toLocaleString('fr-FR')} F</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>En attente</span>
            <i><AdminIcon name="file" size={16} /></i>
          </div>
          <b>{stats.enAttente}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Payées</span>
            <i><AdminIcon name="tag" size={16} /></i>
          </div>
          <b>{stats.payees}</b>
        </div>
      </div>

      {/* Filtres */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <input
          type="text"
          placeholder="Rechercher par référence ou client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: '260px',
            padding: '11px 16px',
            borderRadius: '12px',
            border: '1.5px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: '14px',
          }}
        />
        <select
          value={filterStatut}
          onChange={(e) => {
            setFilterStatut(e.target.value);
            setPage(1);
          }}
          style={{
            minWidth: '180px',
            padding: '11px 16px',
            borderRadius: '12px',
            border: '1.5px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: '14px',
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="payee">Payée</option>
          <option value="livree">Livrée</option>
          <option value="annulee">Annulée</option>
        </select>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '13px',
            color: 'var(--mut)',
          }}
        >
          {meta.total} commande{meta.total > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau des commandes */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>
            Chargement des commandes...
          </p>
        ) : commandes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>
            Aucune commande à afficher.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Article(s)</th>
                  <th>Cagnotte</th>
                  <th>Montant</th>
                  <th>Progression</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((cmd) => {
                  const st = computeStatut(cmd.statut);
                  const progress = computeProgress(cmd);
                  const articles = cmd.articles || [];
                  const nbArticles = articles.reduce(
                    (sum, a) => sum + (a.quantite || 0),
                    0
                  );
                  const articleLabel =
                    articles.length === 0
                      ? '—'
                      : articles.length === 1
                      ? `${articles[0].produit}`
                      : `${articles[0].produit} + ${articles.length - 1} autre(s)`;

                  const dateStr = cmd.created_at
                    ? new Date(cmd.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  const cagnotte = cmd.cagnotte;
                  const montantVerse = Number(cagnotte?.montant_verse ?? 0);
                  const objectif = Number(cagnotte?.objectif ?? 0);

                  return (
                    <tr key={cmd.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace' }}>
                          {cmd.reference}
                        </strong>
                        <span className="admin-sub-text">
                          {nbArticles > 0
                            ? `${nbArticles} article${nbArticles > 1 ? 's' : ''}`
                            : 'Aucun article'}
                        </span>
                      </td>
                      <td>
                        {cmd.client?.nom || '—'}
                      </td>
                      <td>
                        {articleLabel}
                        {articles.length > 0 && (
                          <span className="admin-sub-text">
                            {articles
                              .map((a) => `${a.quantite} × ${a.produit}`)
                              .join(' · ')}
                          </span>
                        )}
                      </td>
                      <td>
                        {cagnotte ? (
                          <>
                            CG-{cagnotte.id}
                            <span className="admin-sub-text">
                              {montantVerse.toLocaleString('fr-FR')} /{' '}
                              {objectif.toLocaleString('fr-FR')} F
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--mut)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <strong>
                          {Number(cmd.prix_total || 0).toLocaleString('fr-FR')} F
                        </strong>
                      </td>
                      <td>
                        {cagnotte ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              minWidth: '110px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--ink)',
                              }}
                            >
                              {Math.round(progress)}%
                            </span>
                            <div
                              style={{
                                position: 'relative',
                                height: '8px',
                                background: 'var(--line)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  background:
                                    progress >= 100
                                      ? '#16a34a'
                                      : progress >= 50
                                      ? '#f59e0b'
                                      : '#dc2626',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--mut)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {cagnotte?.moyen_paiement ? (
                          <span className="admin-badge s2">
                            {cagnotte.moyen_paiement}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mut)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                          {dateStr}
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

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '16px',
          }}
        >
          <button
            type="button"
            className="admin-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: '13px', color: 'var(--mut)' }}>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            type="button"
            className="admin-btn"
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}