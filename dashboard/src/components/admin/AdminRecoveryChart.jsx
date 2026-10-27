export default function AdminRecoveryChart({ recouvrement }) {
  const taux = recouvrement?.taux ?? 0;
  const semaines =
    recouvrement?.semaines && recouvrement.semaines.length > 0
      ? recouvrement.semaines
      : [
          { semaine: 'S1', attendu: 0, encaisse: 0 },
          { semaine: 'S2', attendu: 0, encaisse: 0 },
          { semaine: 'S3', attendu: 0, encaisse: 0 },
          { semaine: 'S4', attendu: 0, encaisse: 0 },
        ];

  // Échelle dynamique : on prend le max réel, avec un plancher pour éviter /0
  const maxVal = Math.max(
    1,
    ...semaines.map((s) => Math.max(s.attendu || 0, s.encaisse || 0))
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>Recouvrement des échéances</h3>
        <span className="admin-badge s1">{taux} % recouvré</span>
      </div>

      <p className="admin-chart-sub">
        Montants attendus et encaissés par semaine, en milliers de FCFA
      </p>

      <div className="admin-legend">
        <span>
          <i style={{ background: 'var(--line)' }} />
          Attendu
        </span>
        <span>
          <i style={{ background: 'var(--r)' }} />
          Encaissé
        </span>
      </div>

      <div className="admin-bars-chart">
        {semaines.map((item, index) => {
          const attendu = Number(item.attendu) || 0;
          const encaisse = Number(item.encaisse) || 0;

          // Hauteurs en % de la zone (max 100%)
          const heightAttendu = Math.min(100, (attendu / maxVal) * 100);
          const heightEncaisse = Math.min(100, (encaisse / maxVal) * 100);

          // Pourcentage encaissé / attendu (sécurité /0)
          const pct = attendu > 0 ? Math.round((encaisse / attendu) * 100) : 0;

          return (
            <div key={item.semaine || index} className="admin-chart-col">
              {/* Zone des barres (hauteur fixe, alignement bas) */}
              <div className="admin-bar-group">
                <div
                  className="admin-bar"
                  title={`Attendu: ${attendu} k`}
                  style={{
                    height: `${heightAttendu}%`,
                    background: 'var(--line)',
                    animationDelay: `${0.2 + index * 0.08}s`,
                  }}
                />
                <div
                  className="admin-bar"
                  title={`Encaissé: ${encaisse} k`}
                  style={{
                    height: `${heightEncaisse}%`,
                    background: 'var(--r)',
                    animationDelay: `${0.28 + index * 0.08}s`,
                  }}
                />
              </div>

              <span className="admin-chart-label">{item.semaine}</span>

              <div className="admin-tooltip">
                Semaine {index + 1}
                <br />
                Attendu {attendu} k<br />
                Encaissé {encaisse} k<br />
                <b>{pct} %</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}