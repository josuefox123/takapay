export default function AdminRecoveryChart({ recouvrement }) {
  const taux = recouvrement?.taux ?? 90;
  const semaines = recouvrement?.semaines ?? [
    { semaine: 'S1', attendu: 520, encaisse: 470 },
    { semaine: 'S2', attendu: 610, encaisse: 540 },
    { semaine: 'S3', attendu: 580, encaisse: 560 },
    { semaine: 'S4', attendu: 700, encaisse: 610 },
    { semaine: 'S5', attendu: 650, encaisse: 590 },
    { semaine: 'S6', attendu: 720, encaisse: 640 },
    { semaine: 'S7', attendu: 690, encaisse: 640 },
    { semaine: 'S8', attendu: 760, encaisse: 660 },
  ];

  // Calcul du max pour la mise à l'échelle (environ 800)
  const maxVal = 800;

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
          const heightAttendu = Math.min(100, (item.attendu / maxVal) * 100);
          const heightEncaisse = Math.min(100, (item.encaisse / maxVal) * 100);
          const pct = Math.round((item.encaisse / item.attendu) * 100);

          return (
            <div key={item.semaine} className="admin-chart-col">
              {/* Barre Attendu (gris) */}
              <div
                className="admin-bar"
                style={{
                  height: `${heightAttendu}%`,
                  background: 'var(--line)',
                  animationDelay: `${0.2 + index * 0.08}s`,
                }}
              />

              {/* Barre Encaissé (rouge) */}
              <div
                className="admin-bar"
                style={{
                  height: `${heightEncaisse}%`,
                  background: 'var(--r)',
                  animationDelay: `${0.28 + index * 0.08}s`,
                }}
              />

              {/* Label de la semaine */}
              <span>{item.semaine}</span>

              {/* Infobulle interactive au survol */}
              <div className="admin-tooltip">
                Semaine {index + 1}
                <br />
                Attendu {item.attendu} k<br />
                Encaissé {item.encaisse} k<br />
                <b>{pct} %</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
