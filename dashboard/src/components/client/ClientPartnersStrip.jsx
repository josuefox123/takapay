import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

function PartnerLogo({ partenaire, duplicate = false }) {
  const content = (
    <>
      <img src={partenaire.logo_url} alt={duplicate ? '' : `Logo ${partenaire.nom}`} loading="lazy" />
      <span>{partenaire.nom}</span>
    </>
  );

  if (!partenaire.lien) {
    return <div className="home-partner-card">{content}</div>;
  }

  return (
    <a
      className="home-partner-card"
      href={partenaire.lien}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={duplicate ? -1 : undefined}
    >
      {content}
    </a>
  );
}

export default function ClientPartnersStrip() {
  const [partenaires, setPartenaires] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminService.getPartenaires()
      .then((items) => {
        if (active) setPartenaires(items);
      })
      .catch(() => {
        if (active) setError('Les partenaires ne sont pas disponibles pour le moment.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="home-partners-section" aria-label="Partenaires Takapay">
      <div className="home-partners-heading">
        <span className="home-partners-kicker">Ils nous accompagnent</span>
        <h2>Nos partenaires</h2>
      </div>

      {partenaires.length > 0 ? (
        <div className="home-partners-window">
          <div className={`home-partners-track ${partenaires.length > 1 ? 'is-moving' : ''}`}>
            <div className="home-partners-group">
              {partenaires.map((partenaire) => (
                <PartnerLogo key={partenaire.id} partenaire={partenaire} />
              ))}
            </div>
            {partenaires.length > 1 && (
              <div className="home-partners-group" aria-hidden="true">
                {partenaires.map((partenaire) => (
                  <PartnerLogo key={`duplicate-${partenaire.id}`} partenaire={partenaire} duplicate />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="home-partners-empty" role={error ? 'status' : undefined}>
          {error || 'Les logos de nos partenaires seront bientôt affichés ici.'}
        </p>
      )}
    </section>
  );
}
