import { Link } from 'react-router-dom';
import Brand from './Brand';
import { footerData } from '../../data/homeData';

export default function Footer({ isClient = false }) {
  if (isClient) {
    return (
      <footer className="client-footer-simple">
        <div className="client-footer-inner">
          <div className="client-footer-top">
            <Brand light={true} />

            <div className="client-footer-contacts">
              <a href="tel:+2290162180290">📞 +229 01 62 18 02 90</a>
              <span className="dot">·</span>
              <a href="https://wa.me/2290162180290" target="_blank" rel="noreferrer">
                💬 WhatsApp 7j/7
              </a>
              <span className="dot">·</span>
              <a href="mailto:support@takapay.bj">✉️ support@takapay.bj</a>
            </div>
          </div>

          <div className="client-footer-bottom">
            <span>© 2026 Takapay. Tous droits réservés · Montants en FCFA (XOF).</span>
            <div className="client-footer-links">
              <span>Cotonou, Bénin</span>
              <Link to="/admin/connexion" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>
                Espace Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Footer public complet pour la page d'accueil (inchangé)
  return (
    <footer className="site-footer">
      <div className="footer-main">
        {/* Marque et baseline */}
        <div className="footer-brand">
          <Brand light={true} />
          <p>{footerData.tagline}</p>
          <span className="footer-location">
            Pensé au Bénin <span>·</span> Montants en FCFA (XOF)
          </span>
        </div>

        {/* Liens Takapay */}
        <div className="footer-links">
          <strong>{footerData.linksTitle1}</strong>
          {footerData.links1.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
          <Link to="/admin/connexion">Espace Administration</Link>
        </div>

        {/* Liens Informations / Légal */}
        <div className="footer-links">
          <strong>{footerData.linksTitle2}</strong>
          {footerData.links2.map((link) => (
            <a key={link.label} href={link.href} className="footer-contact">
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Bas de page / Copyright */}
      <div className="footer-bottom">
        <span>{footerData.copyright}</span>
      </div>
    </footer>
  );
}
