/**
 * Utilitaire pour concaténer conditionnellement des classes CSS Tailwind.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default cn;
