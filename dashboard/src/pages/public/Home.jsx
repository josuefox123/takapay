import { useEffect } from 'react';
import Header from '../../components/public/Header';
import Hero from '../../components/public/Hero';
import StepsSection from '../../components/public/StepsSection';
import WaysToPay from '../../components/public/WaysToPay';
import Security from '../../components/public/Security';
import Faq from '../../components/public/Faq';
import Download from '../../components/public/Download';
import Footer from '../../components/public/Footer';
import FloatingActionButtons from '../../components/public/FloatingActionButtons';
import frigoImg from '../../assets/frigotakapay.jpeg';
import { productSectionData } from '../../data/homeData';

export default function Home() {
  useEffect(() => {
    const elements = document.querySelectorAll(
      '.hero-copy, .hero-visual, .section-heading, .step-card, .ways-copy, .way-card, .product-intro, .product-art, .security-inner, .download-copy, .faq-heading, .faq-list'
    );
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }
    document.documentElement.classList.add('motion-ready');
    elements.forEach((el) => el.classList.add('reveal-on-scroll'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px 8% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <StepsSection />
        <WaysToPay />

        {/* Section Produit */}
        <section className="product-section section-wrap">
          <div className="product-intro">
            <h2>{productSectionData.title}</h2>
            <p>{productSectionData.description}</p>
          </div>
          <div className="product-art">
            <img
              src={frigoImg}
              alt="Exemples d'articles du quotidien à financer progressivement"
              loading="lazy"
              decoding="async"
            />
            <div className="product-art-note">
              <strong>
                Une cagnotte
                <br />
                par article.
              </strong>
            </div>
          </div>
        </section>

        <Security />
        <Faq />
        <Download />
      </main>
      <Footer />
      <FloatingActionButtons />
    </>
  );
}
