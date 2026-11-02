import logoImg from '../../assets/logo.png';

export default function Brand({ light = false, className = '', onClick }) {
  return (
    <a
      href="#accueil"
      className={`brand notranslate ${light ? 'brand-light' : ''} ${className}`}
      translate="no"
      aria-label="Takapay, accueil"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
    >
      <img
        src={logoImg}
        alt="Takapay"
        width={638}
        height={196}
        className="brand-logo"
      />
    </a>
  );
}
