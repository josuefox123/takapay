import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer l'installation de la PWA (beforeinstallprompt)
 * et fournir les informations nécessaires pour le guide iOS Safari.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true
    );
  });

  const [isIOS] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent || '') &&
      !window.MSStream
    );
  });

  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Écouter l'événement standard PWA beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Déclencher l'invite d'installation native ou afficher le guide iOS
  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
      return choiceResult.outcome;
    } else {
      setShowIOSGuide(true);
      return 'guide_opened';
    }
  }, [deferredPrompt]);

  const openIOSGuide = useCallback(() => setShowIOSGuide(true), []);
  const closeIOSGuide = useCallback(() => setShowIOSGuide(false), []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSGuide,
    setShowIOSGuide,
    openIOSGuide,
    closeIOSGuide,
    installApp,
  };
}

export default useInstallPrompt;
