import { useState } from 'react';

export default function AdminRecoveryChart({ recouvrement, kpis }) {
  const [viewMode, setViewMode] = useState('semaine'); // 'semaine' | 'mois'

  const cetteSemaine = recouvrement?.cette_semaine || [];
  const semaines = recouvrement?.semaines || [];

  const computedSemaineTotal = cetteSemaine.reduce((sum, j) => sum + (Number(j.total || j.cash || j.cagnotte) || 0), 0);
  const computedMoisTotal = semaines.reduce((sum, s) => sum + (Number(s.total || s.cash || s.cagnotte) || 0), 0);

  const totalSemaine = Number(recouvrement?.total_semaine ?? computedSemaineTotal) || 0;
  const fallbackMoisTotal = semaines.length > 0
    ? computedMoisTotal
    : Number(kpis?.encaisse_ce_mois) || 0;
  const totalMois = Number(recouvrement?.total_mois ?? fallbackMoisTotal) || 0;

  const activeItems = viewMode === 'semaine' ? cetteSemaine : semaines;

  // Calcul du plafond pour l'échelle dynamique
  const maxVal = Math.max(
    1,
    ...activeItems.map((item) => {
      const c = Number(item.cash !== undefined ? item.cash : item.attendu) || 0;
      const cg = Number(item.cagnotte !== undefined ? item.cagnotte : item.encaisse) || 0;
      return Math.max(c, cg);
    })
  );

  return (
    <div className="admin-panel">
      <div
        className="admin-panel-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '17px' }}>Flux Réel des Encaissements</h3>
          <span style={{ fontSize: '13px', color: 'var(--mut)', marginTop: '2px', display: 'block' }}>
            {viewMode === 'semaine'
              ? 'Activité quotidienne de cette semaine (Lundi au Dimanche)'
              : 'Répartition hebdomadaire du mois en cours'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--soft, #f1f5f9)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('semaine')}
              style={{
                background: viewMode === 'semaine' ? 'var(--card, #ffffff)' : 'transparent',
                color: viewMode === 'semaine' ? 'var(--ink)' : 'var(--mut)',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'semaine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Cette semaine
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mois')}
              style={{
                background: viewMode === 'mois' ? 'var(--card, #ffffff)' : 'transparent',
                color: viewMode === 'mois' ? 'var(--ink)' : 'var(--mut)',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'mois' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Ce mois
            </button>
          </div>

          <span
            className="admin-badge s1"
            style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: 800 }}
          >
            {viewMode === 'semaine'
              ? `${totalSemaine.toLocaleString('fr-FR')} F`
              : `${totalMois.toLocaleString('fr-FR')} F`}
          </span>
        </div>
      </div>

      <div className="admin-legend" style={{ marginTop: '14px', marginBottom: '16px' }}>
        <span>
          <i style={{ background: '#0284c7' }} />
          Paiements Cash direct
        </span>
        <span>
          <i style={{ background: 'var(--r)' }} />
          Cotisations Cagnottes Libres
        </span>
      </div>

      <div className="admin-bars-chart">
        {activeItems.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--mut)' }}>
            Aucune donnée d’encaissement disponible.
          </p>
        )}
        {activeItems.map((item, index) => {
          const cashVal = Number(item.cash !== undefined ? item.cash : item.attendu) || 0;
          const cagnotteVal = Number(item.cagnotte !== undefined ? item.cagnotte : item.encaisse) || 0;
          const totalVal = cashVal + cagnotteVal;

          const heightCash = cashVal > 0 ? Math.max(14, Math.min(92, Math.round((cashVal / maxVal) * 88))) : 0;
          const heightCagnotte = cagnotteVal > 0 ? Math.max(14, Math.min(92, Math.round((cagnotteVal / maxVal) * 88))) : 0;
          const maxBarHeight = Math.max(heightCash, heightCagnotte);

          const colLabel = item.jour || item.semaine || `S${index + 1}`;
          const isHighlight =
            item.is_current ||
            (item.date && item.date === new Date().toISOString().slice(0, 10));

          return (
            <div key={item.date || item.semaine || index} className="admin-chart-col">
              {/* Montant textuel flottant au-dessus de la barre */}
              {totalVal > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: `calc(${maxBarHeight}% + 4px)`,
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: cashVal > 0 ? '#0284c7' : 'var(--r)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                >
                  {totalVal >= 1000 ? `${(totalVal / 1000).toFixed(1).replace('.0', '')}k` : totalVal}
                </span>
              )}

              {/* Barres directement positionnées dans la colonne flex */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '5px',
                  width: '100%',
                  height: '100%',
                }}
              >
                <div
                  className="admin-bar"
                  title={`Cash: ${cashVal.toLocaleString('fr-FR')} F`}
                  style={{
                    height: `${heightCash}%`,
                    background: '#0284c7',
                    animationDelay: `${0.12 + index * 0.05}s`,
                    minWidth: '10px',
                  }}
                />
                <div
                  className="admin-bar"
                  title={`Cagnotte: ${cagnotteVal.toLocaleString('fr-FR')} F`}
                  style={{
                    height: `${heightCagnotte}%`,
                    background: 'var(--r)',
                    animationDelay: `${0.18 + index * 0.05}s`,
                    minWidth: '10px',
                  }}
                />
              </div>

              <span
                className="admin-chart-label"
                style={{
                  fontWeight: isHighlight ? 800 : 500,
                  color: isHighlight ? 'var(--r)' : 'inherit',
                }}
              >
                {colLabel}
              </span>

              <div className="admin-tooltip">
                <strong>{item.label || item.semaine || `Période ${index + 1}`}</strong>
                {item.periode && (
                  <>
                    <br />
                    <small style={{ color: '#cbd5e1' }}>{item.periode}</small>
                  </>
                )}
                <br />
                Cash : {cashVal.toLocaleString('fr-FR')} F<br />
                Cagnotte : {cagnotteVal.toLocaleString('fr-FR')} F<br />
                <b>Total : {totalVal.toLocaleString('fr-FR')} F</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}