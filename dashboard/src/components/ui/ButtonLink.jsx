import { Link } from 'react-router-dom';

export default function ButtonLink({
  children,
  to,
  href,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2.5 font-bold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none focus-visible:outline-3 focus-visible:outline-[#ffc928] focus-visible:outline-offset-2';

  const variants = {
    primary:
      'bg-[#c62828] text-white hover:bg-[#a91f24] hover:-translate-y-0.5 shadow-sm rounded-lg px-6 py-3.5 text-sm md:text-base',
    yellow:
      'bg-[#ffc928] text-[#211d1b] hover:bg-[#ffd54f] hover:-translate-y-0.5 shadow-sm rounded-lg px-6 py-3.5 text-sm md:text-base',
    dark:
      'bg-[#6e181d] text-white border border-white/30 hover:bg-[#5a1216] hover:-translate-y-0.5 rounded-lg px-6 py-3.5 text-sm md:text-base',
    outline:
      'bg-transparent border border-[#e9e1d7] text-[#211d1b] hover:border-[#c62828] hover:text-[#c62828] rounded-lg px-5 py-3 text-sm',
  };

  const combinedClasses = `${baseClasses} ${variants[variant] || variants.primary} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {children}
    </button>
  );
}
