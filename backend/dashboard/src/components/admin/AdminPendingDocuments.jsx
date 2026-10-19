import { useState } from 'react';
import AdminIcon from './AdminIcon';

export default function AdminPendingDocuments({ documents = [], onAction }) {
  const [items, setItems] = useState(documents);
  const [exitingIds, setExitingIds] = useState([]);

  const handleDecision = (doc, isApproved) => {
    // Marquer l'élément en animation de sortie
    setExitingIds((prev) => [...prev, doc.id]);

    if (onAction) {
      onAction(doc, isApproved);
    }

    // Supprimer après l'animation
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== doc.id));
      setExitingIds((prev) => prev.filter((id) => id !== doc.id));
    }, 400);
  };

  return (
    <div className="admin-panel">
      <h3>Documents à valider</h3>
      <div id="dcs">
        {items.length === 0 ? (
          <p style={{ color: 'var(--mut)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
            Tous les documents ont été traités.
          </p>
        ) : (
          items.map((doc) => {
            const isExiting = exitingIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`admin-doc-item ${isExiting ? 'out' : ''}`}
              >
                <div>
                  <strong>{doc.nom}</strong>
                  <span>{doc.type}</span>
                </div>
                <div className="admin-doc-actions">
                  <button
                    type="button"
                    className="admin-btn-ok"
                    onClick={() => handleDecision(doc, true)}
                    aria-label={`Valider le document de ${doc.nom}`}
                    title="Valider"
                  >
                    <AdminIcon name="check" size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-btn-no"
                    onClick={() => handleDecision(doc, false)}
                    aria-label={`Refuser le document de ${doc.nom}`}
                    title="Refuser"
                  >
                    <AdminIcon name="x" size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
