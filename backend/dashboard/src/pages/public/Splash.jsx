import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Splash() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('enter'); // 'enter' | 'pulse' | 'exit'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progression fluide sur 3 secondes (3 000 ms)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    // Timeline d'animation (3 secondes au total) :
    // 0s : Entrée élastique du logo
    // 0.4s : Pulse lumineux, particules & animation cinétique continue
    // 2.6s : Transition d'ouverture / zoom fade-out
    // 3.0s : Redirection automatique vers /app
    const timerPulse = setTimeout(() => {
      setPhase('pulse');
    }, 400);

    const timerExit = setTimeout(() => {
      setPhase('exit');
    }, 2600);

    const timerNav = setTimeout(() => {
      navigate('/app', { replace: true });
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timerPulse);
      clearTimeout(timerExit);
      clearTimeout(timerNav);
    };
  }, [navigate]);

  const handleSkip = () => {
    navigate('/app', { replace: true });
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-cream overflow-hidden select-none cursor-pointer transition-all duration-500 ${
        phase === 'exit' ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
      }`}
    >


      {/* Bouton passer en haut à droite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-muted bg-[#f5efe6] hover:bg-[#eae1d5] hover:text-brand-ink transition-colors"
      >
        <span>Passer</span>
        <ArrowRight size={13} />
      </button>

      {/* Conteneur Logo avec animation Nano Banana (Kinetic Spring + Glow) */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Bulle d'impact glow */}
        <div className="relative mb-5">
          <div
            className={`transition-all duration-700 ease-out transform ${
              phase === 'enter'
                ? 'scale-75 -translate-y-6 opacity-0'
                : phase === 'pulse'
                ? 'scale-105 translate-y-0 opacity-100'
                : 'scale-115 opacity-95'
            }`}
            style={{
              animation: phase !== 'enter' ? 'nano-bounce 1.6s ease-in-out infinite alternate' : 'none',
            }}
          >
            <img
              src={logoImg}
              alt="TAKAPAY"
              className="w-56 sm:w-64 h-auto drop-shadow-[0_12px_28px_rgba(198,40,40,0.18)]"
            />
          </div>

          {/* Éclat d'étoile / spark */}
          <div
            className={`absolute -top-3 -right-3 text-brand-yellow transition-all duration-500 ${
              phase === 'pulse' ? 'opacity-100 scale-110 rotate-12' : 'opacity-0 scale-50'
            }`}
          >
            <Sparkles size={24} className="fill-brand-yellow" />
          </div>
        </div>

        {/* Tagline animée */}
        <p
          className={`font-heading text-xs sm:text-sm font-semibold tracking-wide text-brand-muted transition-all duration-600 delay-200 ${
            phase === 'enter' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          L’épargne progressive dédiée à vos envies
        </p>

        {/* Barre de progression fluide */}
        <div className="w-48 sm:w-56 h-1.5 bg-[#f0e6d8] rounded-full mt-7 overflow-hidden relative">
          <div
            className="h-full bg-linear-to-r from-brand-red via-[#e53935] to-brand-yellow rounded-full transition-all duration-75 ease-out"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <span className="text-[11px] text-[#9c938f] mt-2 font-medium tracking-tight">
          Chargement du catalogue... {Math.min(100, Math.round(progress))}%
        </span>
      </div>

      {/* Animation CSS injectée inline pour l'effet Nano Banana */}
      <style>{`
        @keyframes nano-bounce {
          0% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.03);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
