import Icon from './Icon';
import heroImg from '../../assets/imagetakapay.webp';
import { heroData } from '../../data/homeData';

export default function Hero() {
  return (
    <section className="hero" id="accueil">
      {/* 5 cercles décoratifs animés en arrière-plan avec dérive continue */}
      <div className="hero-bubbles" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
      </div>

      <div className="hero-copy">
        <h1>
          {heroData.titleLine1}
          <br />
          <span className="text-[#c62828]">{heroData.titleLine2}</span>
        </h1>

        <p className="hero-lede">{heroData.description}</p>

        <div className="hero-actions">
          <a className="button button-red" href={heroData.ctaButton.href}>
            <span>{heroData.ctaButton.label}</span>
            <Icon name="arrow" size={18} />
          </a>
        </div>

        <div className="hero-chips-wrap">
          <div className="hero-chips">
            {heroData.chips.map((chip, idx) => (
              <div key={`chip-a-${idx}`} className="hero-chip">
                {chip}
              </div>
            ))}
            {heroData.chips.map((chip, idx) => (
              <div key={`chip-b-${idx}`} className="hero-chip" aria-hidden="true">
                {chip}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-image-frame">
          <img
            src={heroImg}
            alt="Une femme montre l’application Takapay sur son téléphone"
          />
        </div>
      </div>
    </section>
  );
}
