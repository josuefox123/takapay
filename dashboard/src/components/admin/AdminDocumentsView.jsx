import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function AdminDocumentsView({ onShowToast }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [motif, setMotif] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    let isMounted = true;
    adminService.getDocuments().then((data) => {
      if (isMounted) {
        setDocuments(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (doc) => {
    await adminService.verifyDocument(doc.id, true);
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, statut: 'valide', motif: null } : d))
    );
    onShowToast(`Document de ${doc.utilisateur?.nom || 'l’utilisateur'} validé avec succès.`);
  };

  const handleOpenRejectModal = (doc) => {
    setRejectingDoc(doc);
    setMotif('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingDoc) return;

    await adminService.verifyDocument(rejectingDoc.id, false, motif);
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === rejectingDoc.id ? { ...d, statut: 'refuse', motif: motif || 'Non conforme' } : d
      )
    );
    setRejectingDoc(null);
    onShowToast(`Document de ${rejectingDoc.utilisateur?.nom || 'l’utilisateur'} rejeté.`);
  };

  const filtered = documents.filter((d) => {
    if (statusFilter === 'tous') return true;
    return d.statut === statusFilter;
  });

  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, lastPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Vérification des Documents KYC</h1>
        <p className="admin-header-sub">
          Contrôlez les pièces d'identité et justificatifs de domicile soumis par les utilisateurs
        </p>
      </div>

      {/* Filtres de statut */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '14px 20px', display: 'flex', gap: '10px' }}>
        {['tous', 'en_attente', 'valide', 'refuse'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`admin-nav-item ${statusFilter === s ? 'active' : ''}`}
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '99px', fontSize: '13px' }}
          >
            {s === 'tous'
              ? 'Tous les documents'
              : s === 'en_attente'
              ? 'En attente'
              : s === 'valide'
              ? 'Validés'
              : 'Rejetés'}
          </button>
        ))}
      </div>

      {/* Tableau des documents */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des documents...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucun document dans cette catégorie.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Type de pièce</th>
                  <th>Nom du fichier</th>
                  <th>Date de soumission</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => {
                  const tailleMo = d.taille ? (d.taille / (1024 * 1024)).toFixed(1) + ' Mo' : '1.2 Mo';
                  return (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.utilisateur?.nom} {d.utilisateur?.prenom}</strong>
                        <span className="admin-sub-text">{d.utilisateur?.telephone || 'Numéro non renseigné'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{d.type}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{d.nom_origine || 'document.pdf'}</span>
                        <span className="admin-sub-text">{tailleMo}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{d.date_creation || '14 Oct 2026'}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${d.statut === 'valide' ? 's1' : d.statut === 'en_attente' ? 's2' : 's3'}`}>
                          {d.statut === 'valide' ? 'Validé' : d.statut === 'en_attente' ? 'En attente' : 'Rejeté'}
                        </span>
                        {d.motif && (
                          <span className="admin-sub-text" style={{ color: 'var(--r)' }}>
                            Motif: {d.motif}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {d.statut !== 'valide' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(d)}
                              className="admin-btn-ok"
                              style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                            >
                              Valider
                            </button>
                          )}
                          {d.statut !== 'refuse' && (
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(d)}
                              className="admin-btn-no"
                              style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                            >
                              Rejeter
                            </button>
                          )}
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
        {!loading && filtered.length > 0 && (
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
              Affichage de <strong>{paginated.length}</strong> sur <strong>{filtered.length}</strong> document{filtered.length > 1 ? 's' : ''} (Page {currentPage} sur {lastPage})
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

      {/* Modal de motif de refus */}
      {rejectingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              border: '1px solid var(--line)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--ink)' }}>
              Rejeter le document
            </h3>
            <p style={{ color: 'var(--mut)', fontSize: '13px', marginBottom: '16px' }}>
              Indiquez le motif du refus pour notifier <b>{rejectingDoc.utilisateur?.nom}</b> :
            </p>

            <form onSubmit={handleConfirmReject}>
              <div className="admin-field">
                <input
                  type="text"
                  required
                  placeholder="Ex: Image illisible, document expiré..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingDoc(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="admin-btn"
                  style={{ background: 'var(--r)', padding: '10px 18px' }}
                >
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
