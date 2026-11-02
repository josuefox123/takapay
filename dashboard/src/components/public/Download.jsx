import { Link } from 'react-router-dom';
import Icon from './Icon';
import { downloadData, iosGuideData } from '../../data/homeData';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function Download() {
  const {
    isInstalled,
    showIOSGuide,
    closeIOSGuide,
    installApp,
  } = useInstallPrompt();

  return (
    <section className="download-section" id="application">
      <div className="download-inner section-wrap">
        <div className="download-copy">
          <div className="download-text">
            <h2>{downloadData.title}</h2>
            <p>{downloadData.description}</p>
          </div>

          <div className="download-actions">
            <Link to="/splash" className="store-button store-primary">
              <span className="store-icon">▶</span>
              <span>
                <b>{downloadData.openButton}</b>
              </span>
            </Link>

            <button
              type="button"
              onClick={installApp}
              className="store-button"
            >
              <Icon name="smartphone" size={20} />
              <span>
                <b>
                  {isInstalled
                    ? downloadData.installedText
                    : downloadData.installButton}
                </b>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guide pour iPhone */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-guide-title"
        >
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#fffdf8] text-[#211d1b] rounded-2xl shadow-2xl border border-[#e9e1d7]">
            <button
              type="button"
              onClick={closeIOSGuide}
              aria-label="Fermer le guide"
              className="absolute top-4 right-4 p-2 text-[#706966] hover:text-[#211d1b] rounded-lg transition-colors cursor-pointer"
            >
              <Icon name="close" size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fae9dc] text-[#c62828] flex items-center justify-center shrink-0">
                <Icon name="smartphone" size={20} />
              </div>
              <h3
                id="ios-guide-title"
                className="font-heading font-bold text-lg sm:text-xl text-[#211d1b]"
              >
                {iosGuideData.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#706966] mb-5 leading-relaxed">
              {iosGuideData.subtitle}
            </p>

            <ol className="space-y-3.5 mb-6">
              {iosGuideData.steps.map((step) => (
                <li key={step.number} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#c62828] text-white text-xs font-bold shrink-0 mt-0.5">
                    {step.number}
                  </span>
                  <div>
                    <strong className="block text-xs sm:text-sm text-[#211d1b]">
                      {step.title}
                    </strong>
                    <span className="text-xs text-[#706966] leading-relaxed">
                      {step.description}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={closeIOSGuide}
              className="w-full py-3 px-4 rounded-lg bg-[#c62828] text-white font-bold text-sm hover:bg-[#a91f24] transition-colors cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
