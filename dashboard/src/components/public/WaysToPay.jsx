import { useState } from 'react';
import Icon from './Icon';
import { waysToPayData } from '../../data/homeData';

export default function WaysToPay() {
  const [activeIdx, setActiveIdx] = useState(null);

  const toggle = (idx) => {
    setActiveIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="ways-section">
      <div className="ways-inner section-wrap">
        <div className="ways-copy">
          <h2>Deux façons de payer</h2>
          <p>{waysToPayData.description}</p>
        </div>

        <div className="ways-options">
          {waysToPayData.options.map((option, idx) => {
            const isActive = activeIdx === idx;
            return (
              <div
                key={option.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                data-active={isActive ? 'true' : undefined}
                className="way-card"
                onClick={() => toggle(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(idx);
                  }
                }}
              >
                <div className="way-icon">
                  <Icon name={option.icon} size={24} />
                </div>

                <h3>{option.title}</h3>
                <p>{option.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
