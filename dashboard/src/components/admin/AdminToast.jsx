export default function AdminToast({ message, isVisible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`admin-toast ${isVisible ? 'show' : ''}`}
    >
      {message}
    </div>
  );
}
