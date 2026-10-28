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
      (c) => c.statut_reception !== 'recu' && String(c.statut).toLowerCase() !== 'terminee' && String(c.statut).toLowerCase() !== 'livree'
    ).length;
    const recues = commandes.filter(
      (c) => c.statut_reception === 'recu' || String(c.statut).toLowerCase() === 'terminee' || String(c.statut).toLowerCase() === 'livree'
    ).length;
    return { total, totalMontant, enAttente, recues };
  }, [commandes]);

  const computeStatut = (cmd) => {
    const isRecu = cmd.statut_reception === 'recu' || String(cmd.statut || '').toLowerCase() === 'terminee' || String(cmd.statut || '').toLowerCase() === 'livree';
    if (isRecu) return { label: 'Terminée (Article reçu)', cls: 's1' };
    const s = String(cmd.statut || '').toLowerCase();
    if (s === 'annulee') return { label: 'Annulée', cls: 's3' };
    return { label: 'En cours (En attente réception)', cls: 's2' };
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
            <span>Articles reçus</span>
            <i><AdminIcon name="tag" size={16} /></i>
          </div>
          <b>{stats.recues}</b>
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
                  <th>Type</th>
                  <th>Client</th>
                  <th>Article(s) & Qté</th>
                  <th>Montant</th>
                  <th>Progression / Suivi</th>
                  <th>Paiement</th>
                  <th>Statut Réception</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((cmd) => {
                  const st = computeStatut(cmd);
                  const isCash = cmd.type_commande === 'cash'
                    || cmd.mode_paiement === 'livraison'
                    || String(cmd.reference || '').startsWith('CMD_COD_')
                    || String(cmd.reference || '').startsWith('CMD_CASH_');

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

                  const clientName = cmd.client?.nom
                    ? `${cmd.client?.nom || ''} ${cmd.client?.prenom || ''}`.trim()
                    : 'Client';

                  const clientContact = cmd.telephone_livraison || cmd.client?.telephone || cmd.client?.email || '';

                  return (
                    <tr key={cmd.id}>
                      {/* 1. Référence & Nb articles */}
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

                      {/* 2. Type de commande (Cash vs Libre) */}
                      <td>
                        {isCash ? (
                          <span
                            className="admin-badge"
                            style={{
                              background: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0',
                              fontWeight: 700,
                              fontSize: '11.5px',
                            }}
                          >
                            Cash {cmd.mode_paiement === 'livraison' ? '(Livraison)' : '(Comptant)'}
                          </span>
                        ) : (
                          <span
                            className="admin-badge"
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              fontWeight: 700,
                              fontSize: '11.5px',
                            }}
                          >
                            Libre (Cagnotte)
                          </span>
                        )}
                      </td>

                      {/* 3. Client & Coordonnées */}
                      <td>
                        <strong>{clientName}</strong>
                        {clientContact && (
                          <span className="admin-sub-text">
                            {clientContact}
                          </span>
                        )}
                        {cmd.adresse_livraison && (
                          <span className="admin-sub-text" style={{ color: '#0369a1' }}>
                            📍 {cmd.adresse_livraison}
                          </span>
                        )}
                      </td>

                      {/* 4. Article(s) & Quantité */}
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

                      {/* 5. Montant */}
                      <td>
                        <strong>
                          {Number(cmd.prix_total || 0).toLocaleString('fr-FR')} F
                        </strong>
                      </td>

                      {/* 6. Progression / Suivi */}
                      <td>
                        {isCash ? (
                          <span
                            className="admin-badge"
                            style={{
                              background: '#f9fafb',
                              color: '#374151',
                              border: '1px solid #e5e7eb',
                              fontSize: '11.5px',
                            }}
                          >
                            {cmd.mode_paiement === 'livraison' ? 'À régler livraison' : 'Paiement unique'}
                          </span>
                        ) : (
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
                        )}
                      </td>

                      {/* 7. Mode de paiement */}
                      <td>
                        <span className="admin-badge s2">
                          {cmd.mode_paiement || cmd.cagnotte?.moyen_paiement || '—'}
                        </span>
                      </td>

                      {/* 8. Statut réception client */}
                      <td>
                        <span className={`admin-badge ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* 9. Date */}
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