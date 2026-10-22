import { useEffect, useState } from 'react';
import AdminIcon from './AdminIcon';

function AnimatedCounter({ value, suffix = '', duration = 1400 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrameId;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Easing cubique out : 1 - (1 - p)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(value * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return (
    <span>
      {displayValue.toLocaleString('fr-FR')}
      {suffix}
    </span>
  );
}

export default function AdminKpiCards({ kpis }) {
  const cards = [
    {
      id: 'encaisse',
      label: 'Encaissé ce mois',
      value: kpis?.encaisse_ce_mois ?? 4820000,
      suffix: ' F',
      icon: 'wallet',
    },
    {
      id: 'cagnottes',
      label: 'Cagnottes actives',
      value: kpis?.cagnottes_actives ?? 212,
      suffix: '',
      icon: 'box',
    },
    {
      id: 'documents',
      label: 'Documents à valider',
      value: kpis?.documents_a_valider ?? 3,
      suffix: '',
      icon: 'file',
    },
    {
      id: 'utilisateurs',
      label: 'Nouveaux utilisateurs',
      value: kpis?.nouveaux_utilisateurs ?? 41,
      suffix: '',
      icon: 'users',
    },
  ];

  return (
    <div className="admin-kpi-grid">
      {cards.map((card) => (
        <div key={card.id} className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>{card.label}</span>
            <i>
              <AdminIcon name={card.icon} size={16} />
            </i>
          </div>
          <b>
            <AnimatedCounter value={card.value} suffix={card.suffix} />
          </b>
        </div>
      ))}
    </div>
  );
}
